# syntax=docker/dockerfile:1

############################
# DEPS
############################
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# web package
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# ВАЖНО: переходим в пакет ДО install
WORKDIR /app/apps/web

# install deps web (создаст local node_modules)
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

# теперь next точно существует
RUN ls -la node_modules/.bin

RUN pnpm build

############################
# RUNNER
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]