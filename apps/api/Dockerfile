# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# manifests пакетов, чтобы pnpm понял граф
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# prisma schema (для generate cache)
COPY apps/api/prisma apps/api/prisma/

# 1) качаем зависимости в store
RUN pnpm fetch

# 2) ставим, используя store (гарантированно создаст node_modules/.bin)
RUN pnpm install --frozen-lockfile --offline --prod=false

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# переносим и node_modules, и pnpm store
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /root/.local/share/pnpm /root/.local/share/pnpm

COPY . .

# проверка: prisma реально должен быть
RUN ls -la /app/node_modules/.bin | grep prisma

WORKDIR /app/apps/api
RUN /app/node_modules/.bin/prisma generate
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then /app/node_modules/.bin/prisma migrate deploy; fi && node dist/main.js"