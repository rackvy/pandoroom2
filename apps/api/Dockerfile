# syntax=docker/dockerfile:1

############################
# BUILDER
############################
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# package manifests
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# prisma schema
COPY apps/api/prisma apps/api/prisma/

# install deps
RUN pnpm install --frozen-lockfile

# source
COPY . .

# ✅ Generate Prisma Client BEFORE build
RUN pnpm --filter @pandoroom/api prisma:generate

# build api
RUN pnpm --filter @pandoroom/api build

# create portable runtime
RUN pnpm deploy --legacy --filter @pandoroom/api --prod /out

############################
# RUNTIME
############################
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# runtime files
COPY --from=builder /out ./

# prisma schema нужен для generate
COPY --from=builder /app/apps/api/prisma ./prisma

# ✅ ВАЖНО: generate делаем ЗДЕСЬ
RUN pnpm exec prisma generate

EXPOSE 3001

CMD ["node", "dist/src/main.js"]