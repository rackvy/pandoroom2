# syntax=docker/dockerfile:1

############################
# DEPS
############################
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

WORKDIR /app/apps/web
RUN pnpm install --frozen-lockfile

############################
# BUILDER
############################
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

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
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]