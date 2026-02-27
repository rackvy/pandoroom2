# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# ROOT manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# api manifest + prisma
COPY apps/api/package.json apps/api/
COPY apps/api/prisma apps/api/prisma/

RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

#RUN pnpm -C apps/api prisma generate
#RUN pnpm -C apps/api build
WORKDIR /app/apps/api
RUN pnpm exec prisma generate
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
#CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then pnpm -C apps/api prisma migrate deploy; fi && node dist/main.js"
CMD sh -c "if [ -n \"$DATABASE_URL\" ]; then pnpm exec prisma migrate deploy; fi && node dist/main.js"