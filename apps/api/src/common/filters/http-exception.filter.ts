import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let details: unknown = null;
    let errorCode = 'INTERNAL_ERROR';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, unknown>;
      message = (resp['message'] as string) || message;
      details = resp['details'] || (Array.isArray(resp['message']) ? resp['message'] : null);
      errorCode = (resp['error'] as string) || (resp['code'] as string) || errorCode;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const requestId = (request.headers['x-request-id'] as string) || request.id;

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} failed: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${requestId}] ${request.method} ${request.url} (${status}): ${message}`);
    }

    reply.status(status).send({
      statusCode: status,
      errorCode,
      message,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
