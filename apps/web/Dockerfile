# syntax=docker/dockerfile:1

############################
# DEPS
############################
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com && npm install -g pnpm@10.30.3

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

WORKDIR /app/apps/web
RUN echo "registry=https://registry.npmmirror.com" > /app/.npmrc
RUN pnpm install --frozen-lockfile --prod=false

############################
# BUILDER
############################
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com && npm install -g pnpm@10.30.3

COPY --from=deps /app /app
COPY . .

WORKDIR /app/apps/web

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

############################
# RUNNER
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

# Fix dangling pnpm symlinks in standalone output:
# /app/node_modules/next -> ../../../node_modules/.pnpm/... resolves to /node_modules/.pnpm/...
# Copy the real .pnpm store to where the symlinks point
COPY --from=deps /app/node_modules/.pnpm /node_modules/.pnpm

EXPOSE 3000

CMD ["node", "server.js"]