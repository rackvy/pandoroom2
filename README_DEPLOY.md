# Pandoroom Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Traefik reverse proxy running with external network "web"
- DNS records pointing to your server:
  - `pandoroom.e-rma.ru` → web
  - `pandoroom-admin.e-rma.ru` → admin
  - `pandoroom-back.e-rma.ru` → api

## Initial Setup

1. **Clone repository and navigate to it:**
```bash
git clone <repository-url>
cd pandoroom
```

2. **Create production environment files:**
```bash
# Copy example files and fill in real values
cp apps/api/.env.production.example apps/api/.env.production
cp apps/admin/.env.production.example apps/admin/.env.production
cp apps/web/.env.production.example apps/web/.env.production
```

3. **Edit environment files with real values:**

`apps/api/.env.production`:
```env
DATABASE_URL=postgresql://user:password@your-db-host:5432/pandoroom?schema=public
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGINS=https://pandoroom.e-rma.ru,https://pandoroom-admin.e-rma.ru
```

`apps/admin/.env.production`:
```env
VITE_API_BASE_URL=https://pandoroom-back.e-rma.ru
```

`apps/web/.env.production`:
```env
NEXT_PUBLIC_API_URL=https://pandoroom-back.e-rma.ru
```

## Deployment

### Full Deploy (build and start)
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Quick Deploy (if no code changes, just restart)
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Stop all services
```bash
docker compose -f docker-compose.prod.yml down
```

## Logs

### View all logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### View specific service logs
```bash
# API logs
docker logs -f pandoroom-api

# Admin logs
docker logs -f pandoroom-admin

# Web logs
docker logs -f pandoroom-web
```

### View last 100 lines
```bash
docker logs --tail 100 pandoroom-api
```

## Database Operations

### Run migrations manually
```bash
docker exec -it pandoroom-api pnpm prisma:migrate:deploy
```

### Run seed (initial data)
```bash
docker exec -it pandoroom-api pnpm prisma:seed
```

### Generate Prisma client (if needed)
```bash
docker exec -it pandoroom-api pnpm prisma:generate
```

### Open Prisma Studio
```bash
docker exec -it pandoroom-api pnpm prisma:studio
```

## Updates

### Update to latest version
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Force rebuild without cache
```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Check container status
```bash
docker ps | grep pandoroom
```

### Restart specific service
```bash
docker restart pandoroom-api
docker restart pandoroom-admin
docker restart pandoroom-web
```

### Check network connectivity
```bash
docker network ls
docker network inspect web
```

### Clean up unused images
```bash
docker image prune -f
```

## SSL/TLS Certificates

Traefik automatically handles SSL certificates via Let's Encrypt. No manual action required.

To force certificate renewal:
```bash
docker restart traefik
```

## Backup

### Backup database
```bash
docker exec -it pandoroom-api pg_dump $DATABASE_URL > backup.sql
```

### Restore database
```bash
docker exec -i pandoroom-api psql $DATABASE_URL < backup.sql
```
