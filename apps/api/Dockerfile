# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# api package manifest + prisma schema
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma/

RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# prisma generate + build только api
RUN pnpm -C apps/api prisma generate
RUN pnpm -C apps/api build

FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

ENV NODE_ENV=production

# В рантайм кладём только api-артефакты
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json

# Вариант “проще и надёжнее”: тащим весь node_modules workspace (работает, но жирно)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then pnpm prisma:migrate:deploy; fi && node dist/main.js"