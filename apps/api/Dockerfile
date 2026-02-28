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

# package manifests (минимум для графа)
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# prisma schema (для кеша generate)
COPY apps/api/prisma apps/api/prisma/

# ВАЖНО: ставим deps из папки пакета, чтобы создался apps/api/node_modules
WORKDIR /app/apps/api
RUN pnpm install --frozen-lockfile

############################
# BUILDER
############################
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# переносим подготовленный /app (включая node_modules из deps stage)
COPY --from=deps /app /app

# исходники целиком
COPY . .

WORKDIR /app/apps/api

# Prisma CLI должен быть локально в пакете
RUN ls -la node_modules/.bin | grep prisma

# generate prisma client + build nest
RUN ./node_modules/.bin/prisma generate
RUN pnpm build

############################
# RUNNER
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# build output
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json

# ВАЖНО: копируем ROOT node_modules, иначе могут отсутствовать @nestjs/* в runtime
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/src/main.js"]