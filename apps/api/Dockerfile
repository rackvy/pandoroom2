# syntax=docker/dockerfile:1

############################
# DEPS
############################
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# manifests нужных пакетов для графа зависимостей
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# prisma schema (чтобы generate мог кешироваться)
COPY apps/api/prisma apps/api/prisma/

# ВАЖНО: install выполняем ИЗ ПАКЕТА (как мы сделали для web)
WORKDIR /app/apps/api

# ставим зависимости (включая devDeps, где prisma CLI)
RUN pnpm install --frozen-lockfile

############################
# BUILDER
############################
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# переносим весь /app из deps (там уже есть node_modules пакета api)
COPY --from=deps /app /app

# теперь исходники целиком (для сборки)
COPY . .

WORKDIR /app/apps/api

# проверка: prisma и другие bin реально существуют
RUN ls -la node_modules/.bin | grep prisma

# generate client + build
RUN ./node_modules/.bin/prisma generate
RUN pnpm build

############################
# RUNNER
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# runtime-артефакты
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json

# переносим node_modules именно пакета api (там prisma CLI и @prisma/client)
COPY --from=builder /app/apps/api/node_modules ./node_modules

EXPOSE 3001

CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then ./node_modules/.bin/prisma migrate deploy; fi && node dist/main.js"