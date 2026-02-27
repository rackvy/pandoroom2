# syntax=docker/dockerfile:1

# ---------- Stage 1: Dependencies ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm через corepack (НЕ npm install -g)
RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# Копируем только package файлы (кеш слоя)
COPY package.json pnpm-lock.yaml* ./

# Установка зависимостей
RUN pnpm install --frozen-lockfile


# ---------- Stage 2: Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# node_modules из deps
COPY --from=deps /app/node_modules ./node_modules

# исходники
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# build standalone
RUN pnpm build


# ---------- Stage 3: Runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

# standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "server.js"]