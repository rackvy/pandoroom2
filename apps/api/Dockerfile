# syntax=docker/dockerfile:1

############################
# BUILDER
############################
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

COPY . .

# install workspace deps
RUN pnpm install --frozen-lockfile

# 🔥 ВАЖНО — генерируем prisma client
RUN pnpm --filter @pandoroom/api exec prisma generate

# теперь build пройдет
RUN pnpm --filter @pandoroom/api build

# создаём portable runtime
RUN pnpm deploy --legacy --filter @pandoroom/api --prod /out

RUN mkdir -p /out/dist \
 && cp -r apps/api/dist/* /out/dist/ \
 && cp -r apps/api/prisma /out/prisma \
 && cp apps/api/package.json /out/package.json

############################
# RUNNER
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/package.json ./package.json
COPY --from=builder /out/dist ./dist
COPY --from=builder /out/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/src/main.js"]