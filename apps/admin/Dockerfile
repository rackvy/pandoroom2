# syntax=docker/dockerfile:1

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# pnpm через corepack
RUN corepack enable
RUN corepack prepare pnpm@10.30.3 --activate

# Copy package files (они лежат в apps/admin)
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN pnpm build

# Stage 2: Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# nginx.conf лежит рядом в apps/admin
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]