# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# копируем манифесты пакетов, чтобы pnpm правильно собрал граф
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# (важно) скачиваем зависимости в store
RUN pnpm fetch --filter @pandoroom/web...

# ставим зависимости только для web (+ его deps, включая shared)
RUN pnpm install --frozen-lockfile --filter @pandoroom/web...

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# переносим node_modules и pnpm store
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /root/.local/share/pnpm /root/.local/share/pnpm

# исходники целиком (нужно для сборки)
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm -C apps/web build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json

EXPOSE 3000
CMD ["node", "server.js"]