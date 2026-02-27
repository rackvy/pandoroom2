# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

# pnpm через corepack (без npm install -g pnpm@9)
RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# 1) копируем workspace файлы
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# 2) копируем package.json админки (чтобы кешировалось)
COPY apps/admin/package.json apps/admin/

# 3) ставим зависимости всего workspace (нужно для корректного lockfile)
RUN pnpm install --frozen-lockfile

# 4) копируем исходники админки и всё нужное (если используешь shared-пакеты — копируем и их)
COPY apps/admin apps/admin
COPY packages packages

# 5) билдим именно админку
RUN pnpm -C apps/admin build

FROM nginx:alpine

COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]