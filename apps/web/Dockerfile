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

# manifests нужных пакетов
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# install deps только web
RUN pnpm fetch --filter @pandoroom/web...
RUN pnpm install --offline --frozen-lockfile --prod=false --filter @pandoroom/web...

############################
# BUILDER
############################
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

COPY --from=deps /root/.local/share/pnpm /root/.local/share/pnpm
COPY --from=deps /app/node_modules ./node_modules

COPY . .

WORKDIR /app/apps/web

ENV NEXT_TELEMETRY_DISABLED=1

# проверка (увидишь next)
RUN ls -la node_modules/.bin | grep next

RUN pnpm build

############################
# RUNNER (Next standalone)
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone output (Next 13+)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000

ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]