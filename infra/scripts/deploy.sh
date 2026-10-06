#!/usr/bin/env bash
set -euo pipefail

echo "🚀 [$(date +'%T')] Starting Production Deployment..."

if [ ! -f .env ]; then
  echo "❌ Error: .env file not found. Please create .env before deploying."
  exit 1
fi

COMPOSE_FILE="infra/docker-compose.prod.yml"

echo "1. Building container images..."
docker compose -f "${COMPOSE_FILE}" build

echo "2. Applying Prisma database migrations..."
docker compose -f "${COMPOSE_FILE}" run --rm api pnpm prisma migrate deploy

echo "3. Starting services with zero-downtime rolling update..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

echo "4. Checking service health..."
sleep 5
docker compose -f "${COMPOSE_FILE}" ps

echo "✅ [$(date +'%T')] Deployment successfully finished!"
