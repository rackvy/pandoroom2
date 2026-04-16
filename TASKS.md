# Pandoroom - Подробные задачи для разработки

> Этот файл содержит подробные промты для каждой задачи проекта Pandoroom.
> Каждый промт самодостаточен и содержит всю необходимую информацию для выполнения задачи.
> Публичный сайт (apps/web) НЕ трогаем.

---

## Обзор архитектуры проекта

- **Монорепо**: pnpm workspaces + Turborepo
- **Бэкенд**: `apps/api` — NestJS 10.3 + Prisma 5.10 + PostgreSQL 16, порт 3001
- **Админка**: `apps/admin` — React 18.2 + Vite + TypeScript, кастомные CSS Modules (без UI-библиотек)
- **Shared**: `packages/shared` — типы, перечисления, валидация
- **Аутентификация**: JWT Bearer, роли: ADMIN, CONTENT, MANAGER
- **Хранилище файлов**: S3 (опционально) / локальное хранилище

---

## ЗАДАЧА 1: Подключить кнопки уведомлений в реестре бронирований

### Контекст
В `BookingEditPage.tsx` (строки 691-692) есть два stub-кнопки для SMS:
```tsx
<button className={styles.smsBtn}>СМС: "Не смогли дозвониться"</button>
<button className={styles.smsBtn}>СМС: "Напоминание о предзаказе"</button>
```
Также в `BookingPopover.tsx` (строки 89-96) есть stub-кнопки "SMS #1" и "SMS #2" без onClick.

В API нет никакого модуля уведомлений. Нет никаких интеграций с SMS-шлюзами, Telegram-ботами или другими мессенджерами.

В модели `Branch` есть поля `whatsapp`, `telegram`, `max` (мессенджер MAX от VK).

### Что нужно сделать

#### Бэкенд (apps/api):

1. **Создать модуль уведомлений** `src/notifications/`:
   - `notifications.module.ts`
   - `notifications.service.ts`
   - `notifications.controller.ts`
   - `dto/send-notification.dto.ts`

2. **NotificationsService** должен поддерживать отправку через несколько каналов:
   - **Telegram Bot API**: отправка через HTTP-запрос к `https://api.telegram.org/bot<TOKEN>/sendMessage`. Нужна зависимость `axios` (уже есть в admin, добавить в api).
   - **MAX мессенджер**: Изучить API MAX (VK Teams / VK Messenger). Если API недоступен, оставить заглушку с логом.
   - **SMS**: Интегрировать с SMS.ru или SMSC.ru (популярные российские SMS-шлюзы). Пока сделать абстрактный интерфейс `SmsProvider` с реализацией-заглушкой.

3. **Шаблоны сообщений** — создать файл `src/notifications/templates.ts`:
   - `MISSED_CALL` (Не смогли дозвониться): "Здравствуйте, {clientName}! Мы пытались связаться с вами по поводу бронирования на {eventDate}. Пожалуйста, перезвоните нам: {branchPhone}"
   - `PREORDER_REMINDER` (Напоминание о предзаказе): "Здравствуйте, {clientName}! Напоминаем о вашем бронировании на {eventDate}. Ждём вас в Pandoroom! Подробности: {branchPhone}"

4. **API-эндпоинт**: `POST /api/admin/notifications/send`
   - DTO: `{ bookingId: string, templateKey: 'MISSED_CALL' | 'PREORDER_REMINDER', channel: 'telegram' | 'sms' | 'max' }`
   - Логика: загрузить бронирование с клиентом и филиалом, подставить данные в шаблон, отправить через выбранный канал
   - Роли: ADMIN, MANAGER

5. **Env-переменные** (добавить в `.env` и `.env.production.example`):
   ```
   TELEGRAM_BOT_TOKEN=
   SMS_PROVIDER=stub  # stub | smsru | smsc
   SMS_API_KEY=
   MAX_BOT_TOKEN=
   ```

6. **Модель для логирования** — добавить в schema.prisma:
   ```prisma
   model NotificationLog {
     id         String   @id @default(uuid())
     bookingId  String
     booking    Booking  @relation(fields: [bookingId], references: [id])
     channel    String   // telegram, sms, max
     template   String   // MISSED_CALL, PREORDER_REMINDER
     recipient  String   // phone or telegram id
     status     String   // sent, failed, pending
     errorText  String?
     createdAt  DateTime @default(now())
   }
   ```
   Добавить обратное отношение в модель `Booking`: `notifications NotificationLog[]`

#### Фронтенд (apps/admin):

1. **`src/api/notifications.ts`** — новый API-модуль:
   ```ts
   export const sendNotification = async (data: {
     bookingId: string;
     templateKey: 'MISSED_CALL' | 'PREORDER_REMINDER';
     channel: 'telegram' | 'sms' | 'max';
   }) => { ... }
   ```

2. **`BookingEditPage.tsx`** — подключить кнопки:
   - Заменить stub-кнопки на функциональные с onClick-обработчиками
   - При клике — открывать модальное окно выбора канала (Telegram / SMS / MAX)
   - После отправки — показывать toast.success или toast.error
   - Добавить состояние загрузки (disabled во время отправки)

3. **`BookingPopover.tsx`** — аналогично подключить кнопки "SMS #1" и "SMS #2"

### Файлы для создания:
- `apps/api/src/notifications/notifications.module.ts`
- `apps/api/src/notifications/notifications.service.ts`
- `apps/api/src/notifications/notifications.controller.ts`
- `apps/api/src/notifications/dto/send-notification.dto.ts`
- `apps/api/src/notifications/templates.ts`
- `apps/admin/src/api/notifications.ts`

### Файлы для изменения:
- `apps/api/prisma/schema.prisma` — добавить NotificationLog
- `apps/api/src/app.module.ts` — зарегистрировать NotificationsModule
- `apps/admin/src/pages/BookingEditPage.tsx` — подключить кнопки
- `apps/admin/src/components/schedule/BookingPopover.tsx` — подключить кнопки
- `apps/api/.env` и `apps/api/.env.production.example` — добавить переменные

### Критерии приёмки:
- Кнопки уведомлений в BookingEditPage отправляют запрос к API
- API формирует сообщение по шаблону и отправляет (или логирует при stub)
- Каждая отправка логируется в NotificationLog
- Toast показывает результат отправки
- При отсутствии настроенного канала — понятная ошибка

---

## ЗАДАЧА 2: Клиенты — проверить работоспособность и функционал

### Контекст
Клиенты создаются автоматически при бронировании через `ClientsService.getOrCreate(phone, name)`. Раздел клиентов (`/clients`) уже реализован: список с поиском, детальная страница с историей.

Бэкенд `findAll` в `clients.service.ts` делает Prisma `findMany` с поиском по name/phone/email, include `_count` для bookings и questReservations.

### Что нужно сделать

1. **Проверить и исправить связь Booking -> Client**:
   - Открыть `apps/api/src/booking/booking.service.ts`, метод `create()` (строки 109-132)
   - Убедиться, что при создании бронирования с `clientPhone` и `clientName` вызывается `getOrCreate` и `clientId` записывается в бронирование
   - Проверить, что при обновлении бронирования (`updateBasic`) тоже обновляется связь с клиентом

2. **Проверить отображение клиентов в разделе `/clients`**:
   - `ClientsPage.tsx` вызывает `getClients(search)` → `GET /api/admin/clients?search=...`
   - `clients.service.ts` метод `findAll` должен корректно возвращать клиентов с `_count`
   - Убедиться, что `include: { _count: { select: { bookings: true, questReservations: true } } }` работает

3. **Возможная проблема**: если `clientId` не записывается в бронирование, то `_count.bookings` будет 0 даже если бронирования есть. Проверить SQL: `SELECT * FROM "Client" LEFT JOIN "Booking" ON "Booking"."clientId" = "Client"."id"`.

4. **Проверить детальную страницу клиента** (`/clients/:id`):
   - `ClientDetailPage.tsx` загружает клиента через `getClient(id)`
   - Backend `findOne` включает bookings с branch, tableSlots, questSlots и отдельные questReservations

5. **Добавить пагинацию** (опционально, но рекомендуется):
   - Backend: добавить параметры `page` и `limit` в `findAll`
   - Frontend: добавить кнопки "Назад / Вперёд" или бесконечный скролл

### Файлы для проверки/изменения:
- `apps/api/src/clients/clients.service.ts`
- `apps/api/src/clients/clients.controller.ts`
- `apps/api/src/booking/booking.service.ts`
- `apps/admin/src/pages/ClientsPage.tsx`
- `apps/admin/src/pages/ClientDetailPage.tsx`
- `apps/admin/src/api/clients.ts`

### Критерии приёмки:
- При создании бронирования клиент появляется в разделе `/clients`
- Поиск по имени, телефону, email работает
- Счётчики бронирований и квестов отображаются корректно
- Детальная страница клиента показывает историю бронирований

---

## ЗАДАЧА 3: Контент — Блок страницы (активировать + добавить недостающие)

### Контекст
В `PageBlocksEditor.tsx` уже реализован полноценный редактор блоков для 9 страниц (все значения `PageKey` enum). Редактор поддерживает: выбор страницы, просмотр блоков в таблице, редактирование (title, text через RichTextEditor, linkUrl, image).

Есть старый stub-файл `ContentPage.tsx` с неправильными page keys (HOME, ABOUT, FAQ, CONTACTS) и TODO-комментарием.

Роутинг: `/content/pages` → `PageBlocksEditor.tsx` — это рабочая версия.

**Проблема**: Нужно проверить, что все 9 страниц имеют заполненные блоки в БД, и если каких-то блоков не хватает — создать их. Также нужно добавить страницы, если в фигме есть дополнительные, которых нет в enum.

### Что нужно сделать

1. **Проверить и активировать PageBlocksEditor**:
   - Убедиться, что роут `/content/pages` ведёт на `PageBlocksEditor.tsx` (а не на старый `ContentPage.tsx`)
   - Если `ContentPage.tsx` подключен — заменить на `PageBlocksEditor`
   - Удалить или пометить deprecated `ContentPage.tsx` если он не используется

2. **Проверить наполнение блоков в БД**:
   - Для каждой из 9 страниц (HOME, PARTY_GUIDE, PARTY_GUIDE_KIDS, PARTY_GUIDE_6_10, PARTY_GUIDE_10_15, CAFE, CAFE_KAFE, CAFE_LOUNGE, CAFE_KIDS) проверить, что есть базовые блоки
   - Если блоков нет — добавить в seed.ts стандартные блоки для каждой страницы

3. **Обновить seed.ts** (`apps/api/prisma/seed.ts`):
   - Добавить блоки для всех 9 страниц с blockKey, title, text-заглушкой, sortOrder
   - Пример блоков для HOME: hero, about, features, cta
   - Пример блоков для CAFE_*: hero, menu, gallery, booking

4. **Улучшить PageBlocksEditor**:
   - Добавить кнопку "Создать блок" для добавления новых блоков на страницу
   - Добавить возможность удаления блока
   - Добавить drag-and-drop для изменения sortOrder блоков
   - Добавить поле `blockKey` (машинное имя блока) при создании

5. **Проверить API page-blocks**:
   - `POST /api/admin/content/page-blocks` — создание блока
   - `PATCH /api/admin/content/page-blocks/:id` — обновление
   - `DELETE /api/admin/content/page-blocks/:id` — удаление
   - Убедиться, что все CRUD-операции работают

### Файлы для изменения:
- `apps/admin/src/pages/content/PageBlocksEditor.tsx` — улучшить функционал
- `apps/admin/src/App.tsx` — проверить роутинг
- `apps/api/prisma/seed.ts` — добавить блоки для всех страниц
- `apps/admin/src/api/content.ts` — добавить createPageBlock, deletePageBlock если нет

### Критерии приёмки:
- PageBlocksEditor доступен по роуту `/content/pages`
- Все 9 страниц отображаются в селекторе
- Можно создавать, редактировать, удалять блоки
- Редактирование текста через WYSIWYG (Quill) работает
- Загрузка изображений для блоков работает

---

## ЗАДАЧА 4: Настройки — Яндекс.Карта для выбора точки филиала

### Контекст
В модели `Branch` (schema.prisma) уже есть поля:
```prisma
geoLat  Decimal? @db.Decimal(10, 8)
geoLng  Decimal? @db.Decimal(11, 8)
```
В seed-данных есть координаты Москвы: `geoLat: 55.7558, geoLng: 37.6173`.

НО в админке (`SettingsPage.tsx`) эти поля **не отображаются** — форма филиала содержит только: name, city, address, phone, email. Интерфейс `Branch` в `apps/admin/src/api/catalog.ts` не включает geoLat и geoLng.

Карта отсутствует полностью — ни библиотек, ни компонентов.

### Что нужно сделать

#### Фронтенд (apps/admin):

1. **Установить пакет Яндекс.Карт**:
   ```bash
   cd apps/admin && pnpm add @pbe/react-yandex-maps
   ```
   Это React-обёртка для Yandex Maps JS API v3.

2. **Обновить интерфейс Branch** в `src/api/catalog.ts`:
   ```ts
   export interface Branch {
     // ... существующие поля
     geoLat: number | null;
     geoLng: number | null;
     whatsapp: string | null;
     telegram: string | null;
     max: string | null;
   }
   ```

3. **Создать компонент карты** `src/components/YandexMapPicker.tsx`:
   - Показывать карту с текущей меткой (если координаты есть)
   - По клику на карту — перемещать метку и возвращать новые координаты через callback `onLocationChange(lat, lng)`
   - Поддержать поиск по адресу (geocoding) — при вводе адреса в поле автоматически перемещать карту
   - Дефолтный центр: Москва (55.7558, 37.6173), зум 12
   - Размер карты: 100% ширины, 300px высоты

4. **Обновить SettingsPage.tsx**:
   - Добавить в форму филиала компонент `YandexMapPicker`
   - Добавить скрытые поля geoLat и geoLng в состояние формы
   - При сохранении филиала отправлять координаты вместе с остальными данными
   - Также добавить поля: whatsapp, telegram, max (контактные мессенджеры)

5. **Env-переменная для API-ключа Яндекс.Карт**:
   - В `apps/admin/.env` (или `.env.local`): `VITE_YANDEX_MAPS_API_KEY=...`
   - Использовать в компоненте карты

#### Бэкенд (apps/api):

6. **Обновить catalog.service.ts** — убедиться, что при создании/обновлении Branch принимаются поля geoLat, geoLng, whatsapp, telegram, max (они уже есть в Prisma-модели, но могут быть отфильтрованы DTO).

7. **Обновить DTO** `create-branch.dto.ts` и `update-branch.dto.ts`:
   - Добавить опциональные поля: `geoLat`, `geoLng`, `whatsapp`, `telegram`, `max`

### Файлы для создания:
- `apps/admin/src/components/YandexMapPicker.tsx`
- `apps/admin/src/components/YandexMapPicker.module.css`

### Файлы для изменения:
- `apps/admin/src/api/catalog.ts` — обновить интерфейс Branch
- `apps/admin/src/pages/SettingsPage.tsx` — добавить карту и новые поля
- `apps/api/src/catalog/dto/` — обновить DTO для Branch (если есть валидация)
- `apps/api/src/catalog/catalog.service.ts` — убедиться что поля передаются

### Критерии приёмки:
- На странице настроек филиала отображается Яндекс.Карта
- Можно кликнуть на карту и установить точку
- Координаты сохраняются в БД при сохранении филиала
- При редактировании филиала — карта центрируется на сохранённых координатах
- Публичный сайт может брать координаты из API `/api/public/branches`

---

## ЗАДАЧА 5: Доп. сервисы — ТБанк: формирование ссылки для оплаты

### Контекст
Сейчас оплата — просто внутренние поля `depositRub` (Int) и `paymentMethod` (enum: cash/cashless/card/transfer) в модели Booking. Кнопки "Наличные" / "Безнал" в BookingEditPage не подключены (нет onClick).

Нет никакой интеграции с платёжными системами.

### Что нужно сделать

#### Бэкенд (apps/api):

1. **Создать модуль оплаты** `src/payments/`:
   - `payments.module.ts`
   - `payments.service.ts`
   - `payments.controller.ts`
   - `dto/create-payment-link.dto.ts`

2. **Интеграция с T-Bank (Тинькофф) API**:
   - API документация: https://www.tbank.ru/kassa/dev/payments/
   - Метод `Init` для создания платежа: `POST https://securepay.tinkoff.ru/v2/Init`
   - Параметры: TerminalKey, Amount (в копейках!), OrderId, Description, SuccessURL, FailURL
   - Подпись запроса: SHA-256 от конкатенации параметров + Password

3. **PaymentsService**:
   ```ts
   async createPaymentLink(bookingId: string, amount: number): Promise<{ paymentUrl: string, paymentId: string }> {
     // 1. Загрузить бронирование
     // 2. Сформировать запрос к TBank Init
     // 3. Вернуть PaymentURL из ответа
   }
   ```

4. **Webhook для подтверждения оплаты**:
   - `POST /api/payments/webhook` (публичный endpoint, без JWT)
   - TBank отправляет POST с данными об оплате
   - Проверить подпись (Token)
   - Обновить статус оплаты в бронировании

5. **Добавить поля в модель Booking** (schema.prisma):
   ```prisma
   model Booking {
     // ... существующие поля
     paymentStatus   String?   // pending, paid, failed, refunded
     paymentId       String?   // ID платежа в TBank
     paymentUrl      String?   // Ссылка на оплату
     paidAt          DateTime?
   }
   ```

6. **API-эндпоинты**:
   - `POST /api/admin/payments/create-link` — создать ссылку на оплату (body: `{ bookingId, amount }`)
   - `GET /api/admin/payments/:bookingId/status` — проверить статус оплаты
   - `POST /api/payments/webhook` — вебхук от TBank (Public!)

7. **Env-переменные**:
   ```
   TBANK_TERMINAL_KEY=
   TBANK_PASSWORD=
   TBANK_API_URL=https://securepay.tinkoff.ru/v2
   PAYMENT_SUCCESS_URL=https://pandoroom.e-rma.ru/payment/success
   PAYMENT_FAIL_URL=https://pandoroom.e-rma.ru/payment/fail
   ```

#### Фронтенд (apps/admin):

8. **`src/api/payments.ts`** — новый API-модуль:
   ```ts
   export const createPaymentLink = async (bookingId: string, amount: number) => { ... }
   export const getPaymentStatus = async (bookingId: string) => { ... }
   ```

9. **BookingEditPage.tsx** — секция "Оплата":
   - Подключить кнопки "Наличные" / "Безнал" к state (paymentMethod)
   - Добавить кнопку "Сформировать ссылку на оплату" → вызов createPaymentLink
   - Показать ссылку на оплату (копируемую) и QR-код (опционально)
   - Отображать статус оплаты (если есть): "Ожидает оплаты", "Оплачено", "Ошибка"
   - Кнопка "Обновить статус" для ручной проверки

### Файлы для создания:
- `apps/api/src/payments/payments.module.ts`
- `apps/api/src/payments/payments.service.ts`
- `apps/api/src/payments/payments.controller.ts`
- `apps/api/src/payments/dto/create-payment-link.dto.ts`
- `apps/admin/src/api/payments.ts`

### Файлы для изменения:
- `apps/api/prisma/schema.prisma` — добавить поля оплаты в Booking
- `apps/api/src/app.module.ts` — зарегистрировать PaymentsModule
- `apps/admin/src/pages/BookingEditPage.tsx` — переработать секцию оплаты
- `apps/api/.env` и `.env.production.example` — добавить переменные TBank

### Критерии приёмки:
- Менеджер может сформировать ссылку на оплату для бронирования
- Ссылка открывает страницу оплаты TBank
- После оплаты — webhook обновляет статус в БД
- В BookingEditPage отображается актуальный статус оплаты
- Кнопки "Наличные" / "Безнал" переключают paymentMethod

---

## ЗАДАЧА 6: Система уведомлений — Telegram и MAX

### Контекст
Эта задача пересекается с Задачей 1 (кнопки уведомлений). Здесь фокус на инфраструктуре самих каналов Telegram и MAX.

В модели Branch есть поля `telegram` и `max`, но они хранят контактные данные филиала, а не настройки бота.

### Что нужно сделать

#### Бэкенд (apps/api):

1. **Telegram-бот интеграция** в `src/notifications/channels/telegram.channel.ts`:
   - Использовать Telegram Bot API (HTTP, без библиотеки-обёртки)
   - `POST https://api.telegram.org/bot<TOKEN>/sendMessage`
   - Параметры: `chat_id`, `text`, `parse_mode: 'HTML'`
   - Нужен механизм связки "клиент → telegram chat_id":
     - Вариант 1: Добавить поле `telegramChatId` в модель Client
     - Вариант 2: Бот при старте (`/start`) получает команду с телефоном клиента и сохраняет связку
   - Для MVP: отправлять уведомление по номеру телефона (если chat_id известен) или показывать ошибку

2. **MAX мессенджер** в `src/notifications/channels/max.channel.ts`:
   - MAX (ранее VK Teams / eXpress) имеет Bot API: `https://api.max.buzz/`
   - Документация: https://dev.max.buzz/
   - `POST /messages` с `chat_id` и `text`
   - Аналогичная логика связки клиента с chat_id

3. **SMS канал** в `src/notifications/channels/sms.channel.ts`:
   - Абстрактный интерфейс `ISmsProvider`
   - Реализация для SMS.ru: `POST https://sms.ru/sms/send` с параметрами `api_id`, `to`, `msg`
   - Fallback-реализация (stub): просто логирует в консоль

4. **Модель Client** — добавить поля:
   ```prisma
   model Client {
     // ... существующие поля
     telegramChatId  String?
     maxChatId       String?
     preferredChannel String?  // telegram, max, sms
   }
   ```

5. **Конфигурация каналов** — таблица или env-переменные:
   ```
   TELEGRAM_BOT_TOKEN=
   MAX_BOT_TOKEN=
   SMS_PROVIDER=stub
   SMS_API_KEY=
   ```

6. **API для управления настройками уведомлений клиента**:
   - `PATCH /api/admin/clients/:id` — уже существует, добавить поля telegramChatId, maxChatId, preferredChannel
   - Фронтенд: на странице клиента показать поля для ввода chat_id и выбора предпочтительного канала

### Файлы для создания:
- `apps/api/src/notifications/channels/telegram.channel.ts`
- `apps/api/src/notifications/channels/max.channel.ts`
- `apps/api/src/notifications/channels/sms.channel.ts`

### Файлы для изменения:
- `apps/api/prisma/schema.prisma` — добавить поля в Client
- `apps/api/src/notifications/notifications.service.ts` — интегрировать каналы
- `apps/admin/src/pages/ClientDetailPage.tsx` — добавить поля уведомлений
- `apps/api/.env` — добавить переменные

### Критерии приёмки:
- Telegram-бот отправляет сообщения клиентам (при наличии chat_id)
- MAX-бот отправляет сообщения (при наличии chat_id)
- SMS отправляется через настроенный провайдер (или логируется при stub)
- На странице клиента можно указать chat_id и предпочтительный канал
- Выбор канала доступен при отправке уведомления из бронирования

---

## ЗАДАЧА 7: Синхронизация с Google Calendar

### Контекст
В проекте нет никакого кода, связанного с Google Calendar. Нет библиотек, нет OAuth, нет env-переменных.

`SidebarCalendar.tsx` — это кастомный виджет выбора даты, не связанный с Google.

### Что нужно сделать

#### Бэкенд (apps/api):

1. **Установить Google API библиотеку**:
   ```bash
   cd apps/api && pnpm add googleapis
   ```

2. **Создать модуль** `src/google-calendar/`:
   - `google-calendar.module.ts`
   - `google-calendar.service.ts`
   - `google-calendar.controller.ts`

3. **OAuth2 авторизация**:
   - Использовать Service Account (для серверной интеграции без вмешательства пользователя)
   - Или OAuth2 с refresh token (однократная авторизация администратором)
   - Рекомендуемый путь: **Service Account** — скачать JSON-ключ, указать путь в env

4. **GoogleCalendarService**:
   ```ts
   // Синхронизация бронирования → событие в Google Calendar
   async syncBookingToCalendar(bookingId: string): Promise<string> {
     // 1. Загрузить бронирование с клиентом, слотами, квестами
     // 2. Сформировать событие:
     //    - summary: "Бронь: {clientName} ({guestsKids + guestsAdults} чел.)"
     //    - description: детали бронирования (квесты, столы, торты и т.д.)
     //    - start/end: из временных слотов (взять самый ранний start и самый поздний end)
     //    - location: адрес филиала
     // 3. Создать/обновить событие через Google Calendar API
     // 4. Сохранить googleEventId в бронировании
     return googleEventId;
   }

   async deleteCalendarEvent(googleEventId: string): Promise<void> { ... }
   ```

5. **Добавить поля в модель Booking**:
   ```prisma
   model Booking {
     // ... существующие
     googleEventId  String?
   }
   ```

6. **Автоматическая синхронизация**:
   - При создании бронирования (status: confirmed) — создавать событие
   - При обновлении — обновлять событие
   - При удалении / отмене — удалять событие
   - Использовать хуки или вызывать из BookingService

7. **API-эндпоинты**:
   - `POST /api/admin/google-calendar/sync/:bookingId` — ручная синхронизация одного бронирования
   - `POST /api/admin/google-calendar/sync-all?date=` — синхронизировать все на дату

8. **Env-переменные**:
   ```
   GOOGLE_CALENDAR_ENABLED=false
   GOOGLE_CALENDAR_ID=primary
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
   ```

#### Фронтенд (apps/admin):

9. **BookingEditPage.tsx** — добавить кнопку "Синхронизировать с Google Calendar"
10. Если `googleEventId` заполнен — показывать ссылку на событие

### Файлы для создания:
- `apps/api/src/google-calendar/google-calendar.module.ts`
- `apps/api/src/google-calendar/google-calendar.service.ts`
- `apps/api/src/google-calendar/google-calendar.controller.ts`

### Файлы для изменения:
- `apps/api/prisma/schema.prisma` — добавить googleEventId в Booking
- `apps/api/src/app.module.ts` — зарегистрировать модуль
- `apps/api/src/booking/booking.service.ts` — вызывать синхронизацию при create/update/delete
- `apps/admin/src/pages/BookingEditPage.tsx` — кнопка синхронизации

### Критерии приёмки:
- При подтверждении бронирования создаётся событие в Google Calendar
- Событие содержит корректные данные (имя клиента, дата, время, детали)
- При обновлении бронирования событие обновляется
- При отмене/удалении — событие удаляется
- Ручная кнопка синхронизации работает
- При отключенной интеграции (GOOGLE_CALENDAR_ENABLED=false) — ничего не происходит

---

## ЗАДАЧА 8: Отчёты — Сводный отчёт по блюдам на мероприятия на день

### Контекст
Никаких отчётов в проекте нет. Ни API, ни страниц.

Данные по блюдам хранятся в `BookingFoodItem`:
```prisma
model BookingFoodItem {
  id         String   @id @default(uuid())
  bookingId  String
  booking    Booking  @relation(...)
  name       String
  quantity   Int      @default(1)
  serveAt    DateTime? @db.Time
  serveMode  ServeMode?
  // ... timestamps
}
```

Нужен отчёт, сводящий блюда по цехам: Бар, Пицца, ГЦ (горячий цех), ХЦ (холодный цех).

### Что нужно сделать

#### Бэкенд (apps/api):

1. **Создать модуль отчётов** `src/reports/`:
   - `reports.module.ts`
   - `reports.service.ts`
   - `reports.controller.ts`

2. **Добавить поле `department` в BookingFoodItem** (schema.prisma):
   ```prisma
   model BookingFoodItem {
     // ... существующие
     department  String?  // bar, pizza, hot_kitchen, cold_kitchen
   }
   ```
   Или создать справочник департаментов (если нужна гибкость):
   ```prisma
   model FoodDepartment {
     id    String @id @default(uuid())
     name  String // Бар, Пицца, ГЦ, ХЦ
     key   String @unique // bar, pizza, hot_kitchen, cold_kitchen
   }
   ```

3. **ReportsService**:
   ```ts
   async getFoodReportByDate(date: string, branchId?: string) {
     // 1. Найти все бронирования на дату с status != canceled
     // 2. Собрать все BookingFoodItem
     // 3. Сгруппировать по department
     // 4. Внутри каждого department — суммировать quantity по name
     // Результат:
     // {
     //   date: "2026-03-15",
     //   departments: [
     //     { name: "Бар", items: [{ name: "Лимонад", totalQuantity: 15 }, ...] },
     //     { name: "Горячий цех", items: [...] },
     //     ...
     //   ],
     //   totalItems: 47
     // }
   }
   ```

4. **API-эндпоинт**:
   - `GET /api/admin/reports/food?date=2026-03-15&branchId=...` — отчёт по блюдам
   - Роли: ADMIN, MANAGER

#### Фронтенд (apps/admin):

5. **Добавить пункт "Отчёты" в сайдбар** (`Layout.tsx`)

6. **Создать страницу** `src/pages/ReportsPage.tsx`:
   - Выбор даты (date picker)
   - Выбор филиала (dropdown)
   - Кнопка "Сформировать отчёт"
   - Отображение отчёта: секции по цехам, в каждой — таблица блюд с количеством
   - Кнопка "Печать" / "Экспорт в PDF" (опционально: window.print() с CSS @media print)

7. **Добавить роут** в `App.tsx`:
   ```tsx
   <Route path="/reports" element={<ReportsPage />} />
   ```

8. **`src/api/reports.ts`**:
   ```ts
   export const getFoodReport = async (date: string, branchId?: string) => { ... }
   ```

9. **Обновить NewOrderModal / BookingEditPage** — при добавлении блюда предлагать выбрать цех (department)

### Файлы для создания:
- `apps/api/src/reports/reports.module.ts`
- `apps/api/src/reports/reports.service.ts`
- `apps/api/src/reports/reports.controller.ts`
- `apps/admin/src/pages/ReportsPage.tsx`
- `apps/admin/src/pages/ReportsPage.module.css`
- `apps/admin/src/api/reports.ts`

### Файлы для изменения:
- `apps/api/prisma/schema.prisma` — добавить department в BookingFoodItem
- `apps/api/src/app.module.ts` — зарегистрировать ReportsModule
- `apps/admin/src/App.tsx` — добавить роут
- `apps/admin/src/components/Layout.tsx` — добавить пункт меню
- `apps/admin/src/components/NewOrderModal.tsx` — выбор цеха при добавлении блюда
- `apps/admin/src/pages/BookingEditPage.tsx` — выбор цеха

### Критерии приёмки:
- Страница отчётов доступна из сайдбара
- При выборе даты формируется сводный отчёт по блюдам
- Блюда сгруппированы по цехам (Бар, Пицца, ГЦ, ХЦ)
- Количество суммируется по одинаковым блюдам
- Отчёт можно распечатать

---

## ЗАДАЧА 9: Интеграция с iiko biz — уведомления при смене категории

### Контекст
iiko — POS-система для ресторанов. iiko biz — облачная версия. Когда в iiko biz меняется категория (например, заказ перешёл из "Готовится" в "Готов"), нужно отправить уведомление клиенту через WA/TG/MAX.

В проекте: поле `iikoOrderId` используется в frontend (RegistryPage) но **отсутствует в Prisma-модели Booking**.

### Что нужно сделать

#### Бэкенд (apps/api):

1. **Добавить поле в модель Booking**:
   ```prisma
   model Booking {
     // ... существующие
     iikoOrderId    String?
     iikoOrderStatus String?
   }
   ```

2. **Создать модуль iiko** `src/iiko/`:
   - `iiko.module.ts`
   - `iiko.service.ts`
   - `iiko.controller.ts`

3. **Webhook-эндпоинт для iiko biz**:
   - `POST /api/webhooks/iiko` — публичный endpoint (без JWT)
   - iiko biz отправляет вебхук при изменении заказа
   - Парсить payload: найти `orderId`, `status`/`category`
   - По `iikoOrderId` найти бронирование → клиента
   - Отправить уведомление через NotificationsService (Задача 1/6)

4. **Документация iiko API**:
   - iiko Transport API (cloud): `https://api-ru.iiko.services/`
   - Webhooks: настраиваются в личном кабинете iiko biz
   - Основные события: order.created, order.updated, order.closed
   - Для авторизации webhook: проверка подписи или секретного token в заголовке

5. **Шаблоны уведомлений для iiko** (`templates.ts`):
   - `ORDER_READY`: "Ваш заказ готов! Приятного аппетита в Pandoroom!"
   - `ORDER_IN_PROGRESS`: "Ваш заказ принят и готовится. Ожидайте ~{estimatedTime} мин."

6. **Env-переменные**:
   ```
   IIKO_WEBHOOK_SECRET=
   IIKO_API_URL=https://api-ru.iiko.services
   IIKO_API_LOGIN=
   IIKO_ORGANIZATION_ID=
   ```

### Файлы для создания:
- `apps/api/src/iiko/iiko.module.ts`
- `apps/api/src/iiko/iiko.service.ts`
- `apps/api/src/iiko/iiko.controller.ts`

### Файлы для изменения:
- `apps/api/prisma/schema.prisma` — добавить iikoOrderId, iikoOrderStatus
- `apps/api/src/app.module.ts` — зарегистрировать IikoModule
- `apps/api/src/notifications/templates.ts` — добавить шаблоны

### Критерии приёмки:
- Webhook принимает события от iiko biz
- При смене категории заказа отправляется уведомление клиенту
- Уведомление идёт через предпочтительный канал клиента (TG/MAX/SMS)
- Все события логируются

---

## ЗАДАЧА 10: Полная интеграция с iiko — меню, блюда, чеки

### Контекст
Нужно: отображать меню из iiko в справочнике, при создании праздника показывать блюда, создавать чек в iiko и синхронизировать изменения.

### Что нужно сделать

#### Бэкенд (apps/api):

1. **Расширить IikoService** (`src/iiko/iiko.service.ts`):

   a. **Авторизация**:
   ```ts
   async getAccessToken(): Promise<string> {
     // POST https://api-ru.iiko.services/api/1/access_token
     // body: { apiLogin: IIKO_API_LOGIN }
     // Токен живёт 15 минут — кэшировать
   }
   ```

   b. **Получение меню**:
   ```ts
   async getMenu(): Promise<IikoMenu> {
     // POST https://api-ru.iiko.services/api/1/nomenclature
     // body: { organizationId: IIKO_ORGANIZATION_ID }
     // Возвращает категории и блюда
   }
   ```

   c. **Создание заказа (чека)**:
   ```ts
   async createOrder(bookingId: string, items: IikoOrderItem[]): Promise<string> {
     // POST https://api-ru.iiko.services/api/1/deliveries/create
     // или POST https://api-ru.iiko.services/api/1/order/create (для заказов на столе)
     // Формирует чек с позициями
     // Возвращает orderId
   }
   ```

   d. **Обновление заказа**:
   ```ts
   async updateOrderItems(iikoOrderId: string, items: IikoOrderItem[]): Promise<void> {
     // Добавление/удаление/изменение позиций
   }
   ```

   e. **Получение статуса заказа**:
   ```ts
   async getOrderStatus(iikoOrderId: string): Promise<IikoOrderStatus> { ... }
   ```

2. **Модель для кэширования меню** (или кэш в памяти):
   ```prisma
   model IikoMenuItem {
     id          String  @id @default(uuid())
     iikoId      String  @unique  // ID из iiko
     name        String
     category    String
     department  String?  // Цех: bar, hot_kitchen, cold_kitchen, pizza
     price       Decimal
     isActive    Boolean @default(true)
     updatedAt   DateTime @updatedAt
   }
   ```

3. **API-эндпоинты**:
   - `GET /api/admin/iiko/menu` — получить меню (кэшированное или свежее)
   - `POST /api/admin/iiko/menu/sync` — принудительная синхронизация меню
   - `POST /api/admin/iiko/orders` — создать заказ в iiko для бронирования
   - `PATCH /api/admin/iiko/orders/:iikoOrderId/items` — обновить позиции
   - `GET /api/admin/iiko/orders/:iikoOrderId` — получить статус и детали заказа

#### Фронтенд (apps/admin):

4. **Справочник "Меню iiko"** — новая страница:
   - Роут: `/reference/iiko-menu`
   - Отображение меню по категориям
   - Кнопка "Синхронизировать с iiko"

5. **BookingEditPage / NewOrderModal** — секция "Кухня / бар":
   - Заменить ручной ввод блюд на выбор из меню iiko
   - При добавлении блюда — показывать каталог iiko с поиском
   - Кнопка "Создать чек в iiko" → создаёт заказ из текущих позиций
   - Кнопка "Обновить из iiko ↻" (уже есть как stub) → загружает актуальные позиции

6. **Обновить `src/api/iiko.ts`**:
   ```ts
   export const getIikoMenu = async () => { ... }
   export const syncIikoMenu = async () => { ... }
   export const createIikoOrder = async (bookingId: string) => { ... }
   export const updateIikoOrder = async (iikoOrderId: string, items: any[]) => { ... }
   export const getIikoOrder = async (iikoOrderId: string) => { ... }
   ```

### Файлы для создания:
- `apps/admin/src/pages/reference/IikoMenuPage.tsx`
- `apps/admin/src/api/iiko.ts`

### Файлы для изменения:
- `apps/api/prisma/schema.prisma` — добавить IikoMenuItem
- `apps/api/src/iiko/iiko.service.ts` — расширить
- `apps/api/src/iiko/iiko.controller.ts` — добавить эндпоинты
- `apps/admin/src/pages/BookingEditPage.tsx` — интеграция с меню iiko
- `apps/admin/src/components/NewOrderModal.tsx` — выбор из iiko
- `apps/admin/src/App.tsx` — роут для меню

### Критерии приёмки:
- Меню из iiko загружается и отображается в справочнике
- При создании праздника можно выбирать блюда из iiko
- Создаётся чек в iiko с выбранными позициями
- Изменения позиций (добавление/удаление) синхронизируются с iiko
- Кнопка "обновить из iiko" загружает актуальное состояние чека

---

## ЗАДАЧА 11: Новая сетка брони — VR

### Контекст
В модели Branch есть флаг `hasVR: Boolean @default(false)`, но нет ни моделей, ни API, ни UI для VR-бронирования.

Логика VR (из ТЗ):
- 2 зала, максимум 20 человек в зал
- 2 типа брони:
  1. **Выкуп зала** — клиент бронирует весь зал на выбранное время
  2. **Свободные слоты** — разные компании приходят играть вместе
    - Можно создать анонс (конкретная игра, дата, время)
    - Или просто свободное время

Существующая система расписания: `ScheduleGrid` — drag-and-drop сетка с колонками (столы/квесты) и временной осью (09:30-24:00).

### Что нужно сделать

#### Бэкенд (apps/api):

1. **Новые модели в schema.prisma**:
   ```prisma
   model VRHall {
     id          String   @id @default(uuid())
     branchId    String
     branch      Branch   @relation(fields: [branchId], references: [id])
     name        String   // "Зал 1", "Зал 2"
     maxCapacity Int      @default(20)
     sortOrder   Int      @default(0)
     isActive    Boolean  @default(true)
     reservations VRReservation[]
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
   }

   model VRReservation {
     id           String   @id @default(uuid())
     hallId       String
     hall         VRHall   @relation(fields: [hallId], references: [id])
     bookingId    String?
     booking      Booking? @relation(fields: [bookingId], references: [id])
     date         DateTime @db.Date
     startTime    DateTime @db.Time
     endTime      DateTime @db.Time
     type         VRBookingType  // full_hall, open_slot
     title        String?  // Для анонсов: "Играем в CS"
     description  String?
     gameId       String?
     game         VRGame?  @relation(fields: [gameId], references: [id])
     clientName   String?
     clientPhone  String?
     guestsCount  Int      @default(0)
     maxGuests    Int?     // Для open_slot — лимит участников
     status       ReservationStatus @default(draft)
     createdAt    DateTime @default(now())
     updatedAt    DateTime @updatedAt
   }

   enum VRBookingType {
     full_hall   // Полный выкуп зала
     open_slot   // Свободный слот / анонс
   }
   ```

2. **Создать модуль** `src/vr-schedule/`:
   - `vr-schedule.module.ts`
   - `vr-schedule.service.ts`
   - `vr-schedule.controller.ts`

3. **VRScheduleService**:
   ```ts
   async getSchedule(branchId: string, date: string): Promise<VRHallSchedule[]>
   async createReservation(data: CreateVRReservationDto): Promise<VRReservation>
   async moveReservation(id: string, data: MoveDto): Promise<VRReservation>
   async deleteReservation(id: string): Promise<void>
   async quickBook(data: QuickBookDto): Promise<{ booking: Booking, reservation: VRReservation }>
   ```

4. **API-эндпоинты** (`/api/admin/vr-schedule`):
   - `GET /halls?branchId=` — залы VR для филиала
   - `GET /schedule?branchId=&date=` — расписание VR на дату
   - `POST /reservations` — создать бронь VR
   - `PATCH /reservations/:id/move` — перенести
   - `DELETE /reservations/:id` — отменить
   - `POST /quick-book` — быстрая бронь

5. **Управление залами** — через существующий SettingsPage или отдельный раздел:
   - CRUD для VRHall (привязка к Branch)

#### Фронтенд (apps/admin):

6. **Новая страница** `src/pages/schedule/VRSchedulePage.tsx`:
   - Использовать `ScheduleGrid` (или его модификацию)
   - Колонки: VR залы (вместо столов)
   - Цветовое кодирование: выкуп зала (один цвет), свободный слот (другой цвет)
   - Quick booking modal адаптировать под VR: выбор типа (выкуп / свободный слот), выбор игры, макс. участников

7. **Добавить пункт "VR сетка" в сайдбар** и роут `/vr-grid`

8. **VR Booking Modal** — новый компонент:
   - Тип брони (выкуп / свободный слот)
   - Если выкуп: имя клиента, телефон, время начала и конца
   - Если свободный слот: название (анонс), выбор игры, максимум участников, описание

9. **Обновить SettingsPage** — добавить вкладку "VR залы" для управления залами:
   - CRUD: название зала, вместительность, привязка к филиалу

10. **Обновить NewOrderModal** — если филиал `hasVR`, в шаге 2 показывать также VR-залы

### Файлы для создания:
- `apps/api/src/vr-schedule/vr-schedule.module.ts`
- `apps/api/src/vr-schedule/vr-schedule.service.ts`
- `apps/api/src/vr-schedule/vr-schedule.controller.ts`
- `apps/api/src/vr-schedule/dto/*.dto.ts`
- `apps/admin/src/pages/schedule/VRSchedulePage.tsx`
- `apps/admin/src/pages/schedule/VRSchedulePage.module.css`
- `apps/admin/src/components/schedule/VRBookingModal.tsx`
- `apps/admin/src/api/vrSchedule.ts`

### Файлы для изменения:
- `apps/api/prisma/schema.prisma` — добавить VRHall, VRReservation, VRBookingType
- `apps/api/src/app.module.ts` — зарегистрировать модуль
- `apps/admin/src/App.tsx` — добавить роут
- `apps/admin/src/components/Layout.tsx` — пункт сайдбара
- `apps/admin/src/pages/SettingsPage.tsx` — вкладка VR залов
- `apps/admin/src/components/NewOrderModal.tsx` — VR в шаге 2

### Критерии приёмки:
- Страница VR-сетки отображает залы и их бронирования за выбранный день
- Можно создать бронь "Выкуп зала" с клиентом и временем
- Можно создать "Свободный слот" / анонс с описанием и игрой
- Перетаскивание (drag-and-drop) для перемещения брони работает
- Залы управляются в настройках (CRUD)
- При отсутствии VR в филиале (hasVR=false) — страница не показывает залов

---

## ЗАДАЧА 12: Настройка формы создания праздника исходя из филиала

### Контекст
`NewOrderModal.tsx` — 3-шаговый визард для создания бронирования. Шаг 1: выбор филиала. Шаг 2: столы и квесты. Шаг 3: допы.

Сейчас шаг 2 всегда показывает "Столы" и "Квесты" независимо от филиала. Нужно адаптировать форму под тип филиала.

Модель Branch имеет флаги: `hasCafe`, `hasLounge`, `hasKids`, `hasQuests`, `hasVR`, `hasLava`, `hasLaserTag`.

### Что нужно сделать

#### Фронтенд (apps/admin):

1. **NewOrderModal.tsx** — шаг 2 должен динамически показывать секции:
   - Если `selectedBranch.hasCafe || hasLounge || hasKids` → показывать "Столы"
   - Если `selectedBranch.hasQuests` → показывать "Квесты"
   - Если `selectedBranch.hasVR` → показывать "VR залы" (когда задача 11 готова)
   - Если ничего нет → показывать сообщение "Нет доступных сервисов для этого филиала"

2. **Загрузка данных при смене филиала**:
   - При выборе филиала на шаге 1 — загружать информацию о филиале (если ещё не загружена)
   - На шаге 2 — загружать только те сетки, которые доступны для филиала

3. **Адаптировать шаг 3 (допы)**:
   - Если филиал VR → не показывать торты и декор (или показывать другой набор)
   - Если филиал кафе → показывать полный набор (торты, декор, шоу, еда)

4. **BookingEditPage.tsx** — аналогичная логика:
   - При загрузке бронирования определять филиал
   - Показывать только релевантные секции
   - Если филиал VR — показывать секцию VR вместо столов

5. **Визуальная индикация типа филиала** (опционально):
   - Иконки или бейджи рядом с названием филиала в селекторе
   - "🎮 VR" / "🎪 Квесты" / "☕ Кафе"

### Файлы для изменения:
- `apps/admin/src/components/NewOrderModal.tsx` — основные изменения
- `apps/admin/src/pages/BookingEditPage.tsx` — адаптация под филиал
- `apps/admin/src/api/catalog.ts` — убедиться, что Branch interface включает все флаги

### Критерии приёмки:
- При выборе филиала только с кафе — шаг 2 показывает только столы
- При выборе филиала с квестами — показывает квесты
- При выборе филиала с VR — показывает VR залы
- Комбинации работают (филиал с кафе + квестами показывает оба)
- Допы на шаге 3 адаптируются под тип филиала

---

## ЗАДАЧА 13: Добавить сущность "Игры для VR" в контент

### Контекст
Для VR-залов нужен каталог игр. Игры отображаются на сайте и привязываются к бронированиям VR.

Аналогичные сущности уже реализованы: Quest, Cake, ShowProgram, Decoration — все с CRUD в контенте/справочнике.

### Что нужно сделать

#### Бэкенд (apps/api):

1. **Модель в schema.prisma**:
   ```prisma
   model VRGame {
     id            String   @id @default(uuid())
     name          String
     description   String?  // HTML — описание игры
     genre         String?  // FPS, Racing, Horror и т.д.
     minPlayers    Int      @default(1)
     maxPlayers    Int      @default(20)
     durationMinutes Int?
     previewImageId String?
     previewImage  Media?   @relation("vrGamePreview", fields: [previewImageId], references: [id])
     isActive      Boolean  @default(true)
     sortOrder     Int      @default(0)
     vrReservations VRReservation[]
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt
   }
   ```

2. **CRUD в CatalogController** или отдельный контроллер:
   - `GET /api/admin/catalog/vr-games` — список
   - `GET /api/admin/catalog/vr-games/:id` — детали
   - `POST /api/admin/catalog/vr-games` — создать
   - `PATCH /api/admin/catalog/vr-games/:id` — обновить
   - `DELETE /api/admin/catalog/vr-games/:id` — удалить

3. **Публичный API**:
   - `GET /api/public/vr-games` — список активных игр (для сайта)
   - `GET /api/public/vr-games/:id` — детали игры

#### Фронтенд (apps/admin):

4. **Страница списка** `src/pages/content/VRGamesListPage.tsx`:
   - Таблица: превью, название, жанр, мин/макс игроков, длительность, действия
   - Кнопка "Добавить игру"

5. **Форма создания/редактирования** `src/pages/content/VRGameForm.tsx`:
   - Поля: название, описание (RichTextEditor), жанр, мин/макс игроков, длительность, превью (загрузка изображения)
   - Логика аналогична QuestForm (который уже реализован)

6. **Добавить в навигацию** контент-секции (`ContentLayout.tsx`):
   - Новый пункт "VR Игры" в подменю контента

7. **Роуты** в `App.tsx`:
   ```tsx
   <Route path="/content/vr-games" element={<VRGamesListPage />} />
   <Route path="/content/vr-games/new" element={<VRGameForm />} />
   <Route path="/content/vr-games/:id/edit" element={<VRGameForm />} />
   ```

8. **`src/api/catalog.ts`** — добавить функции:
   ```ts
   export const getVRGames = async () => { ... }
   export const getVRGame = async (id: string) => { ... }
   export const createVRGame = async (data: any) => { ... }
   export const updateVRGame = async (id: string, data: any) => { ... }
   export const deleteVRGame = async (id: string) => { ... }
   ```

### Файлы для создания:
- `apps/admin/src/pages/content/VRGamesListPage.tsx`
- `apps/admin/src/pages/content/VRGameForm.tsx`
- `apps/admin/src/pages/content/VRGamesListPage.module.css`
- `apps/admin/src/pages/content/VRGameForm.module.css`

### Файлы для изменения:
- `apps/api/prisma/schema.prisma` — добавить VRGame
- `apps/api/src/catalog/catalog.controller.ts` — добавить VR Games CRUD
- `apps/api/src/catalog/catalog.service.ts` — методы для VR Games
- `apps/api/src/public/public.controller.ts` — публичные эндпоинты
- `apps/api/src/public/public.service.ts` — публичные методы
- `apps/admin/src/App.tsx` — роуты
- `apps/admin/src/pages/content/ContentLayout.tsx` — навигация
- `apps/admin/src/api/catalog.ts` — API-функции

### Критерии приёмки:
- В разделе "Контент" появился пункт "VR Игры"
- CRUD работает: создание, просмотр, редактирование, удаление
- Описание редактируется через WYSIWYG
- Превью-изображение загружается и отображается
- Публичный API отдаёт активные игры

---

## Порядок выполнения (рекомендуемый)

Задачи имеют зависимости. Рекомендуемый порядок:

1. **ЗАДАЧА 2** — Клиенты (проверка, быстро) — минимум зависимостей
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
13. **ЗАДАЧА 10** — Полная интеграция iiko (зависит частично от задачи 9)

---

## Общие указания для разработчика

### При создании нового NestJS модуля:
1. Создать папку `src/<module-name>/`
2. Создать `*.module.ts`, `*.service.ts`, `*.controller.ts`
3. Создать `dto/` с DTO-классами (class-validator декораторы)
4. Зарегистрировать модуль в `app.module.ts` → imports
5. Если модуль использует Prisma — импортировать `PrismaModule`
6. Защитить контроллер: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN', 'MANAGER')`

### При создании новой страницы в React:
1. Создать `src/pages/<PageName>.tsx` и `<PageName>.module.css`
2. Добавить Route в `App.tsx`
3. Добавить пункт в сайдбар в `Layout.tsx`
4. Создать API-функции в `src/api/<domain>.ts`
5. Использовать `toast.success()` / `toast.error()` для обратной связи
6. Использовать `confirmDialog()` перед удалением

### При изменении Prisma-схемы:
1. Изменить `apps/api/prisma/schema.prisma`
2. Создать миграцию: `cd apps/api && npx prisma migrate dev --name <description>`
3. Обновить seed если нужно: `apps/api/prisma/seed.ts`
4. Перегенерировать клиент: `npx prisma generate`

### Стиль кода:
- TypeScript strict mode
- Все тексты UI на русском языке
- CSS Modules (не Tailwind, не styled-components)
- Без внешних UI-библиотек (кастомные компоненты)
- Axios через централизованный инстанс `src/lib/axios.ts`
- Форматирование дат: `toLocaleDateString('ru-RU', ...)`
