# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# package manifests
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# prisma schema (нужно для generate cache)
COPY apps/api/prisma apps/api/prisma/

# 🔥 СТАВИМ deps именно api
RUN pnpm install --frozen-lockfile

# ---------- builder ----------

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

WORKDIR /app/apps/api

RUN ../../node_modules/.bin/prisma generate
RUN pnpm build

# ---------- runner ----------

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then pnpm exec prisma migrate deploy; fi && node dist/main.js"