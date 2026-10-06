export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  details?: Record<string, string[]>;
}

export class ApiError extends Error {
  statusCode: number;
  details?: Record<string, string[]>;

  constructor(statusCode: number, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

let getAccessToken: (() => string | null) | null = null;
let setAccessToken: ((token: string | null) => void) | null = null;
let onUnauthorized: (() => void) | null = null;

export function configureApiClient(handlers: {
  getToken: () => string | null;
  setToken: (token: string | null) => void;
  onUnauthorized: () => void;
}) {
  getAccessToken = handlers.getToken;
  setAccessToken = handlers.setToken;
  onUnauthorized = handlers.onUnauthorized;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : endpoint.startsWith('/api')
    ? endpoint
    : `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken ? getAccessToken() : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Cookie'ler için (refreshToken)
  };

  const response = await fetch(url, config);

  // 401 Handling with automatic token rotation
  if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newToken = refreshData.accessToken;
          if (setAccessToken) setAccessToken(newToken);
          isRefreshing = false;
          onRefreshed(newToken);
          return apiClient<T>(endpoint, options, true);
        } else {
          isRefreshing = false;
          onRefreshed(null);
          if (onUnauthorized) onUnauthorized();
          throw new ApiError(401, 'Oturum süresi doldu');
        }
      } catch (err) {
        isRefreshing = false;
        onRefreshed(null);
        if (onUnauthorized) onUnauthorized();
        throw err;
      }
    } else {
      // Başka bir istek yenilemeyi bekliyor
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            resolve(apiClient<T>(endpoint, options, true));
          } else {
            reject(new ApiError(401, 'Oturum süresi doldu'));
          }
        });
      });
    }
  }

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        statusCode: response.status,
        message: response.statusText || 'Bilinmeyen bir hata oluştu',
      };
    }

    const message = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message || 'İstek başarısız oldu';

    throw new ApiError(response.status, message, errorData.details);
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
