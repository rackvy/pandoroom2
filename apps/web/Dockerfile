# syntax=docker/dockerfile:1

############################
# DEPS
############################
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

WORKDIR /app/apps/web
RUN pnpm install --frozen-lockfile

############################
# BUILDER
############################
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

COPY --from=deps /app /app
COPY . .

WORKDIR /app/apps/web

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

############################
# RUNNER
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

# Совместимость с monorepo standalone, если Next ожидает assets в apps/web/*
RUN mkdir -p /app/apps/web/.next /app/apps/web \
 && cp -r /app/.next/static /app/apps/web/.next/static 2>/dev/null || true \
 && cp -r /app/public /app/apps/web/public 2>/dev/null || true

EXPOSE 3000

CMD ["sh", "-lc", "SERVER=$(find /app -maxdepth 4 -name server.js | head -n 1); echo Starting $SERVER; node \"$SERVER\""]