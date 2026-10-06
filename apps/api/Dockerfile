FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Workspace konfigürasyonları
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Kaynak kodları
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Shared build ve Prisma generate
RUN pnpm --filter @blog/shared build
RUN cd apps/api && pnpm prisma generate
RUN pnpm --filter @blog/api build

# --- RUNNER ---
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

EXPOSE 3001

WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
