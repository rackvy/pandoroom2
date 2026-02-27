# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# package manifests (минимум для графа зависимостей)
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# prisma schema (чтобы prisma generate мог кешироваться)
COPY apps/api/prisma apps/api/prisma/

# 1) скачиваем зависимости в pnpm store
RUN pnpm fetch --filter @pandoroom/api...

# 2) устанавливаем deps именно для api (+ его зависимости), включая devDeps (где prisma)
RUN pnpm install --offline --frozen-lockfile --prod=false --filter @pandoroom/api...

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# переносим node_modules и pnpm store
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /root/.local/share/pnpm /root/.local/share/pnpm

# теперь исходники
COPY . .

# проверка что prisma реально есть (и чтобы лог был понятный)
RUN ls -la /app/node_modules/.bin | grep prisma

# prisma generate + build только api
RUN pnpm --filter @pandoroom/api exec prisma generate
RUN pnpm --filter @pandoroom/api build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# runtime-артефакты api
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json

# node_modules нужны для рантайма (nest + prisma client и т.п.)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

# миграции при старте (если DATABASE_URL задан)
CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then /app/node_modules/.bin/prisma migrate deploy; fi && node dist/main.js"