# syntax=docker/dockerfile:1

############################
# BUILDER
############################
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# Сразу копируем всё (для turborepo/pnpm workspace проще и надёжнее)
COPY . .

# Устанавливаем зависимости и билдим ТОЛЬКО api (включая его workspace deps)
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pandoroom/api build

# Готовим "portable" runtime-пакет с prod deps (без сломанных ссылок)
RUN pnpm deploy --filter @pandoroom/api --prod /out

# Кладём билд в out
RUN mkdir -p /out/dist && cp -r /app/apps/api/dist/* /out/dist/
RUN mkdir -p /out/prisma && cp -r /app/apps/api/prisma/* /out/prisma/
RUN cp /app/apps/api/package.json /out/package.json

############################
# RUNNER
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Самодостаточные prod зависимости + dist
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/package.json ./package.json
COPY --from=builder /out/dist ./dist
COPY --from=builder /out/prisma ./prisma

EXPOSE 3001

# без миграций (как ты хотел)
CMD ["node", "dist/src/main.js"]