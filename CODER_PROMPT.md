# Промт для Qoder: Разработка Pandoroom

## Роль
Ты — опытный full-stack разработчик. Твоя задача — реализовывать функционал по спецификации из файла TASKS.md.

## Правила работы

### 1. Перед началом работы
- Прочитай файл `TASKS.md` в корне проекта
- Выбери задачу, которую будешь делать (начинай с рекомендуемых в порядке выполнения)
- Создай ветку git: `git checkout -b feature/task-N-название`
- Объяви, какую задачу берёшь

### 2. Во время работы
- Пиши чистый, типизированный TypeScript код
- Следуй существующей архитектуре проекта
- Используй те же паттерны, что в соседних файлах
- **ВСЕ тексты UI на русском языке**
- CSS Modules для стилей (без Tailwind, без styled-components)
- Для API — axios через `src/lib/axios.ts`
- Для уведомлений — `toast.success()` / `toast.error()`
- Для подтверждений — `confirmDialog()`

### 3. После завершения задачи
- Запусти проверку типов: `cd apps/api && npx tsc --noEmit` и `cd apps/admin && npx tsc --noEmit`
- Если менял Prisma-схему — создай миграцию: `npx prisma migrate dev --name описание`
- Сделай коммит с понятным сообщением
- Отметь задачу как выполненную в TASKS.md (добавь [x] перед названием)
- Переходи к следующей задаче

### 4. Если застрял
- Если непонятно, как что-то реализовать — смотри аналогичные реализации в соседних файлах
- Если API внешнего сервиса не работает — делай stub-реализацию с логированием
- Если нужны env-переменные — добавь их в `.env.example` с пустыми значениями

## Архитектура проекта (кратко)

```
pandoroom/
├── apps/
│   ├── api/          # NestJS бэкенд, порт 3001
│   │   ├── src/
│   │   │   ├── auth/         # JWT авторизация
│   │   │   ├── booking/      # Бронирования (основной модуль)
│   │   │   ├── catalog/      # Справочники (филиалы, квесты, поставщики)
│   │   │   ├── clients/      # Клиенты
│   │   │   ├── content/      # Контент (новости, отзывы, блоки страниц)
│   │   │   ├── employees/    # Сотрудники
│   │   │   ├── media/        # Загрузка файлов
│   │   │   ├── prisma/       # Prisma сервис
│   │   │   ├── public/       # Публичное API (без авторизации)
│   │   │   ├── quest-schedule/ # Расписание квестов
│   │   │   └── schedule/     # Сетка бронирования (столы/квесты)
│   │   └── prisma/
│   │       └── schema.prisma # Все модели данных
│   │
│   └── admin/        # React админка, Vite
│       └── src/
│           ├── api/          # API-функции (catalog.ts, clients.ts, content.ts, ...)
│           ├── components/   # Компоненты
│           │   ├── schedule/ # Компоненты сетки (ScheduleGrid, BookingPopover, ...)
│           │   └── ui/       # UI-компоненты (Toast, ConfirmDialog, RichTextEditor)
│           ├── contexts/     # AuthContext
│           ├── lib/          # axios.ts
│           ├── pages/        # Страницы
│           │   ├── content/  # Страницы контента
│           │   ├── reference/# Справочники
│           │   └── schedule/ # Сетки бронирования
│           └── utils/        # Утилиты (time.ts, media.ts)
│
└── packages/
    └── shared/       # Общие типы между API и Admin
```

## Технологический стек

**Бэкенд:**
- NestJS 10.3 + TypeScript 5.4
- Prisma ORM 5.10 + PostgreSQL 16
- JWT авторизация (passport-jwt)
- Роли: ADMIN, CONTENT, MANAGER
- AWS S3 для файлов (опционально)

**Фронтенд:**
- React 18.2 + TypeScript
- Vite 5.1
- React Router 6.22
- CSS Modules (кастомные стили, НЕ MUI/Ant Design/Tailwind)
- Quill (react-quill) для WYSIWYG
- @dnd-kit для drag-and-drop

**Общее:**
- pnpm workspaces + Turborepo
- ESLint + Prettier

## Паттерны кода

### NestJS контроллер
```typescript
@Controller('api/admin/something')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class SomethingController {
  constructor(private readonly service: SomethingService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Post()
  async create(@Body() dto: CreateDto) {
    return this.service.create(dto);
  }
}
```

### React страница
```typescript
import { useState, useEffect } from 'react';
import { toast } from '../components/ui/Toast';
import styles from './PageName.module.css';

export function PageName() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getData();
      setData(result);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className={styles.container}>
      {/* ... */}
    </div>
  );
}
```

### API-функция (admin)
```typescript
// src/api/domain.ts
import { api } from '../lib/axios';

export const getItems = async (): Promise<Item[]> => {
  const response = await api.get('/api/admin/items');
  return response.data;
};

export const createItem = async (data: CreateItemDto): Promise<Item> => {
  const response = await api.post('/api/admin/items', data);
  return response.data;
};
```

## Рекомендуемый порядок выполнения задач

1. **ЗАДАЧА 2** — Клиенты (проверка работоспособности) — быстро, минимум зависимостей
2. **ЗАДАЧА 3** — Блок страницы (контент) — минимум зависимостей
3. **ЗАДАЧА 4** — Яндекс.Карта — минимум зависимостей
4. **ЗАДАЧА 13** — VR Игры в контент — нужна до задачи 11
5. **ЗАДАЧА 6** — Система уведомлений (инфраструктура) — нужна до задач 1, 9
6. **ЗАДАЧА 1** — Кнопки уведомлений (зависит от задачи 6)
7. **ЗАДАЧА 11** — VR сетка (зависит от задачи 13)
8. **ЗАДАЧА 12** — Настройка формы по филиалу (зависит от задачи 11)
9. **ЗАДАЧА 5** — ТБанк оплата — независимая
10. **ЗАДАЧА 7** — Google Calendar — независимая
11. **ЗАДАЧА 8** — Отчёты по блюдам — независимая
12. **ЗАДАЧА 9** — iiko biz webhooks (зависит от задач 6, 10)
13. **ЗАДАЧА 10** — Полная интеграция iiko

## Проверка перед коммитом

- [ ] Код компилируется без ошибок TypeScript
- [ ] Новые миграции созданы (если менялась схема)
- [ ] Форматирование кода (Prettier) применено
- [ ] Нет console.log (кроме логирования ошибок)
- [ ] Все тексты на русском
- [ ] Toast-уведомления показывают результат операций
- [ ] Обработка ошибок есть (try/catch)

## Связь с пользователем

Если непонятно:
- Как должно работать — спроси
- Какой приоритет — уточни
- Если в TASKS.md противоречие — сообщи

Начинай с первой задачи и работай последовательно. Удачи! 🚀
