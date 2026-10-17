-- Наполнитель для репетиции миграции 20261009000001_normalize_phone_numbers.
-- Только локальная база-репетиция: катит грязные телефоны, дублей и детей на дублях.
--
--   createdb pandoroom_phone_test
--   DATABASE_URL=.../pandoroom_phone_test npx prisma migrate deploy
--   psql -v ON_ERROR_STOP=1 -f prisma/phone-migration.rehearsal.sql
--   psql -v ON_ERROR_STOP=1 -f prisma/migrations/20261009000001_normalize_phone_numbers/migration.sql
--   psql -f prisma/phone-migration.checks.sql
--
-- Файл можно запускать повторно: сначала вычищает свои строки, потом ставит заново.

BEGIN;

-- Сброс предыдущей репетиции. Порядок — от детей к родителям.
DELETE FROM "OtpCode"           WHERE "id" LIKE 'rh-%';
DELETE FROM "WaitlistEntry"     WHERE "id" LIKE 'rh-%';
DELETE FROM "VRReservation"     WHERE "id" LIKE 'rh-%';
DELETE FROM "VRHall"            WHERE "id" LIKE 'rh-%';
DELETE FROM "QuestReservation"  WHERE "id" LIKE 'rh-%';
DELETE FROM "ChatMessage"       WHERE "id" LIKE 'rh-%';
DELETE FROM "ClientChannel"     WHERE "id" LIKE 'rh-%' OR "clientId" LIKE 'rh-%';
DELETE FROM "Booking"           WHERE "id" LIKE 'rh-%';
DELETE FROM "Quest"             WHERE "id" LIKE 'rh-%';
DELETE FROM "Client"            WHERE "id" LIKE 'rh-%';
DELETE FROM "Supplier"          WHERE "id" LIKE 'rh-%';
DELETE FROM "Employee"          WHERE "id" LIKE 'rh-%';
DELETE FROM "Branch"            WHERE "id" LIKE 'rh-%';

-- Справочники, нужные для внешних ключей.
INSERT INTO "Branch" ("id", "name", "phone", "createdAt", "updatedAt")
VALUES ('rh-branch', 'Rehearsal Branch', '+7 (423) 202-26-96', now(), now());

INSERT INTO "VRHall" ("id", "branchId", "name", "createdAt", "updatedAt")
VALUES ('rh-hall', 'rh-branch', 'Репетиционный зал', now(), now());

INSERT INTO "Employee" ("id", "fullName", "phone", "email", "position", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
VALUES ('rh-emp', 'Репетиционный сотрудник', '8 423 205-44 58', 'rh-emp@pandoroom.test', 'Менеджер', 'x', 'MANAGER', true, now(), now());

INSERT INTO "Supplier" ("id", "name", "phone", "createdAt", "updatedAt")
VALUES ('rh-sup', 'Репетиционный поставщик', '+7(423)2022696', now(), now());

INSERT INTO "Quest" ("id", "branchId", "name", "genre", "minPlayers", "maxPlayers", "durationMinutes", "createdAt", "updatedAt")
VALUES ('rh-quest', 'rh-branch', 'Репетиционный квест', 'приключения', 2, 6, 60, now(), now());

-- Группа 9999991111: keeper (раньше всех) + два дубля в трёх написанных формах.
INSERT INTO "Client" ("id", "phone", "name", "email", "birthday", "notes", "telegramChatId", "maxChatId", "preferredChannel", "passwordHash", "createdAt", "updatedAt")
VALUES
  ('rh-keeper',  '+7 (999) 999-11-11', 'Иван Основной', NULL,          NULL,         'основная заметка', NULL,           NULL,      NULL,       NULL,           '2020-01-01', now()),
  ('rh-loser-a', '89999991111',        'Ваня Дубль А',  'a@rh.test',   NULL,         'заметка А',        NULL,           NULL,      'sms',      'hash-loser-a', '2021-01-01', now()),
  ('rh-loser-b', '79999991111',        'Ваня Дубль Б',  NULL,          '1990-05-05', NULL,               '@vanya_b',     NULL,      NULL,       NULL,           '2022-01-01', now());

-- Группа 9991234501: пароль задан и у keeperа, и у дубля — миграция обязана оставить keeper и предупредить.
INSERT INTO "Client" ("id", "phone", "name", "passwordHash", "createdAt", "updatedAt")
VALUES
  ('rh-pw-keeper', '+7 (999) 123-45-01', 'Пётр Основной', 'hash-keeper', '2020-02-02', now()),
  ('rh-pw-loser',  '89991234501',        'Пётр Дубль',    'hash-loser',  '2021-02-02', now());

-- Группа 4232022696: городской номер, записанный дважды. Склеивается — это тот риск,
-- который надо увидеть глазами на боевой базе, прежде чем говорить «дел склейку».
INSERT INTO "Client" ("id", "phone", "name", "createdAt", "updatedAt")
VALUES
  ('rh-city-1', '+7 (423) 202 26 96', 'Городской Основной', '2020-03-03', now()),
  ('rh-city-2', '4232022696',         'Городской Дубль',    '2021-03-03', now());

-- Вне сравнения: короче 10 цифр (нормализуется только в «только цифры») и чистый канон.
INSERT INTO "Client" ("id", "phone", "name", "createdAt", "updatedAt")
VALUES
  ('rh-junk',  'вн. 42',     'Добавочный',  '2022-03-03', now()),
  ('rh-clean', '79991234567', 'Чистый',     '2023-03-03', now());

-- Дети на дубле rh-loser-a: должны переехать на keeper, а не исчезнуть каскадом.
INSERT INTO "Booking" ("id", "branchId", "clientId", "clientName", "clientPhone", "eventDate", "type", "status", "createdAt", "updatedAt")
VALUES ('rh-book-1', 'rh-branch', 'rh-loser-a', 'Ваня Дубль А', '+7 (999) 999-11-11', '2026-11-01', 'quest', 'draft', now(), now());

INSERT INTO "QuestReservation" ("id", "bookingId", "clientId", "branchId", "questId", "title", "eventDate", "startTime", "endTime", "createdAt", "updatedAt")
VALUES ('rh-qr-1', 'rh-book-1', 'rh-loser-a', 'rh-branch', 'rh-quest', 'Репетиционная бронь квеста', '2026-11-01', '12:00', '13:00', now(), now());

INSERT INTO "VRReservation" ("id", "clientId", "hallId", "date", "startTime", "endTime", "type", "clientName", "clientPhone", "createdAt", "updatedAt")
VALUES ('rh-vr-1', 'rh-loser-b', 'rh-hall', '2026-11-02', '14:00', '15:00', 'full_hall', 'Ваня Дубль Б', '89999991111', now(), now());

-- Переписка: onDelete: Cascade, без перепривязки миграция съела бы историю.
INSERT INTO "ChatMessage" ("id", "clientId", "sender", "direction", "channel", "status", "text", "externalId", "createdAt", "updatedAt")
VALUES
  ('rh-msg-1', 'rh-loser-a', 'client', 'INBOUND',  'INTERNAL', 'READ', 'Привет из дубля', 'rh-ext-1', now(), now()),
  ('rh-msg-2', 'rh-loser-a', 'admin',  'OUTBOUND', 'INTERNAL', 'SENT', 'Ответ команды',    'rh-ext-2', now(), now());

-- Каналы: у keeperа есть INTERNAL (older, unavailable) — сливается с дублем;
-- TELEGRAM есть только у дубля — переезжает целиком.
INSERT INTO "ClientChannel" ("id", "clientId", "channel", "externalId", "available", "source", "checkedAt", "note", "createdAt", "updatedAt")
VALUES
  ('rh-ch-keeper-internal', 'rh-keeper',  'INTERNAL', 'rh-internal-keeper', false, 'MANUAL', '2023-01-01', NULL,           now(), now()),
  ('rh-ch-loser-internal',  'rh-loser-a', 'INTERNAL', 'rh-internal-loser',  true,  'WEBHOOK', '2024-06-01', 'дубль-внутр.', now(), now()),
  ('rh-ch-loser-telegram',  'rh-loser-a', 'TELEGRAM', '@vanya_a_telegram',  true,  'PROBE',   '2024-07-01', 'дубль-тг',     now(), now());

-- Снапшоты и OTP без связи с клиентом — проверяют шаг нормализации колонок.
INSERT INTO "WaitlistEntry" ("id", "questId", "desiredDate", "desiredTime", "clientName", "clientPhone", "status", "createdAt")
VALUES ('rh-wl-1', 'rh-quest', '2026-11-03', '18:00', 'Гость', '+7 (999) 999-11-11', 'waiting', now());

INSERT INTO "OtpCode" ("id", "phone", "codeHash", "channel", "expiresAt", "sentAt")
VALUES ('rh-otp-1', '89999991111', 'x', 'call', now() + interval '5 minutes', now());

COMMIT;
