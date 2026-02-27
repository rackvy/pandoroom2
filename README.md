# Pandoroom Monorepo

Монорепозиторий для проекта Pandoroom, включающий API, веб-сайт и админ-панель.

## Структура

```
pandoroom/
├── apps/
│   ├── api/        # NestJS API (http://localhost:3001)
│   ├── web/        # Next.js сайт (http://localhost:3000)
│   └── admin/      # React + Vite админка (http://localhost:5173)
├── packages/
│   └── shared/     # Общие типы и утилиты
└── package.json    # Корневой конфиг
```

## Требования

- Node.js 20+
- pnpm 9+

## Быстрый старт

```bash
# Установка зависимостей
pnpm install

# Запуск всех приложений одной командой
pnpm dev
```

Приложения будут доступны:
- **Web**: http://localhost:3000
- **API**: http://localhost:3001
- **Admin**: http://localhost:5173

## Команды

```bash
# Запуск всех приложений в dev-режиме
pnpm dev

# Сборка всех приложений
pnpm build

# Линтинг всех приложений
pnpm lint

# Форматирование кода
pnpm format
```

## Отдельные приложения

### API (NestJS)
```bash
cd apps/api
pnpm dev        # http://localhost:3001
```

### Web (Next.js)
```bash
cd apps/web
pnpm dev        # http://localhost:3000
```

### Admin (React + Vite)
```bash
cd apps/admin
pnpm dev        # http://localhost:5173
```

## Доступ к админке

- URL: http://localhost:5173
- Email: `admin@pandoroom.ru`
- Пароль: `admin123`

После входа доступно боковое меню:
- Брони
- Сетка столов
- Сетка квестов
- Контент
- Справочники
- Сотрудники
