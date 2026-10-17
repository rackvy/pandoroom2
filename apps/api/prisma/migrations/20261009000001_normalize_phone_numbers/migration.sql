-- Нормализация телефонов: хранение — канон 7XXXXXXXXXX, маска +7 (999) 123-45-67 живёт только во фронтенде.
--
-- Client.phone раньше не нормализовался (см. комментарий в 20261007000001_registry_booking_types):
-- на нём уникальный индекс Client_phone_key, и строки «+79991234567» / «79991234567» / «89991234567»
-- считались разными клиентами. Поэтому порядок такой: сначала склейка дублей, потом нормализация.
--
-- Keeper группы — самый ранний createdAt, при равенстве — id. Это ровно то, что делает
-- findAnyByPhone в clients.service.ts, так что поведение до и после миграции совпадает, а
-- ссылки и выданные JWT (sub = id клиента) остаются валидными.

-- 1. Кандидатный канон по каждому клиенту: только цифры, 11 с ведущей 8 -> 7+хвост, 10 -> 7+10.
CREATE TEMP TABLE "_client_phone" AS
SELECT "id",
       CASE
           WHEN length(d) = 11 AND left(d, 1) = '8' THEN '7' || substring(d FROM 2)
           WHEN length(d) = 10 THEN '7' || d
           ELSE d
       END AS "canon"
FROM (
    SELECT "id", regexp_replace(COALESCE("phone", ''), '\D', '', 'g') AS d
    FROM "Client"
) raw;

-- 2. Группы по последним 10 цифрам. Номера короче 10 цифр (городские, добавочные, мусор)
--    в сравнение не идут: три цифры «123» не делают двух клиентов одним человеком.
CREATE TEMP TABLE "_client_group" AS
SELECT cl."id",
       right(pp."canon", 10) AS "key",
       first_value(cl."id") OVER (
           PARTITION BY right(pp."canon", 10)
           ORDER BY cl."createdAt" ASC, cl."id" ASC
       ) AS "keeper_id",
       count(*) OVER (PARTITION BY right(pp."canon", 10)) AS "group_size"
FROM "Client" cl
JOIN "_client_phone" pp ON pp."id" = cl."id"
WHERE length(pp."canon") >= 10;

CREATE TEMP TABLE "_client_loser" AS
SELECT "id" AS "loser_id", "keeper_id"
FROM "_client_group"
WHERE "group_size" > 1 AND "id" <> "keeper_id";

-- 3. Дети перепривязываются до удаления дублей.
--    ChatMessage идёт первым: у него onDelete: Cascade, иначе история переписки уедет вместе с дублем.
--    Его уникальный индекс — (channel, externalId) и клиента не касается, конфликтов перенос не создаст.
UPDATE "ChatMessage" m
SET "clientId" = l."keeper_id"
FROM "_client_loser" l
WHERE m."clientId" = l."loser_id";

-- 4. ClientChannel: на (clientId, channel) уникальный индекс, поэтому вслепую переносить нельзя.
--    Сначала сливаем в существующий канал keeperа самое ценное из дублей — по одному «лучшему»
--    дублю на пару (keeper, channel), иначе UPDATE ... FROM выбрал бы строку произвольно.
CREATE TEMP TABLE "_channel_best" AS
SELECT DISTINCT ON (l."keeper_id", x."channel")
       l."keeper_id" AS "keeper_id",
       x."channel" AS "channel",
       x."id" AS "channel_id",
       x."externalId" AS "externalId",
       x."note" AS "note",
       x."available" AS "available",
       x."checkedAt" AS "checkedAt"
FROM "ClientChannel" x
JOIN "_client_loser" l ON l."loser_id" = x."clientId"
ORDER BY l."keeper_id", x."channel", x."checkedAt" DESC NULLS LAST, x."createdAt" DESC;

UPDATE "ClientChannel" k
SET "externalId" = COALESCE(k."externalId", b."externalId"),
    "note" = COALESCE(k."note", b."note"),
    "available" = k."available" OR b."available",
    "checkedAt" = GREATEST(k."checkedAt", b."checkedAt")
FROM "_channel_best" b
WHERE b."keeper_id" = k."clientId" AND b."channel" = k."channel";

--    Канал, которого у keeperа нет, переносим целиком (дубликат-канал уже слит выше).
UPDATE "ClientChannel" ch
SET "clientId" = b."keeper_id"
FROM "_channel_best" b
WHERE ch."id" = b."channel_id"
  AND NOT EXISTS (
      SELECT 1 FROM "ClientChannel" k
      WHERE k."clientId" = b."keeper_id" AND k."channel" = b."channel"
  );

--    Остальное — строки каналов дублей, уже учтённые: их удаляем, каскадом за ними ничего не тянем.
DELETE FROM "ClientChannel" ch
USING "_client_loser" l
WHERE ch."clientId" = l."loser_id";

-- 5. Остальные дети: у Booking / QuestReservation / VRReservation clientId nullable (SetNull),
--    но терять привязку смысла нет — переводим на keeperа.
UPDATE "Booking" b
SET "clientId" = l."keeper_id"
FROM "_client_loser" l
WHERE b."clientId" = l."loser_id";

UPDATE "QuestReservation" q
SET "clientId" = l."keeper_id"
FROM "_client_loser" l
WHERE q."clientId" = l."loser_id";

UPDATE "VRReservation" v
SET "clientId" = l."keeper_id"
FROM "_client_loser" l
WHERE v."clientId" = l."loser_id";

-- 6. Что накоплено на дублях — переносим в keeperа: пустые колонки заполняем, заметки и имена
--    не выбрасываем, а показываем менеджеру. Агрегация по keeperу, чтобы UPDATE был детерминированным.
CREATE TEMP TABLE "_dupe_merge" AS
SELECT l."keeper_id" AS "id",
       min(cl."email") AS "email",
       min(cl."birthday") AS "birthday",
       min(cl."telegramChatId") AS "telegramChatId",
       min(cl."maxChatId") AS "maxChatId",
       min(cl."preferredChannel") AS "preferredChannel",
       bool_or(cl."passwordHash" IS NOT NULL) AS "loser_has_password",
       string_agg(DISTINCT cl."name", '; ') AS "loser_names"
FROM "Client" cl
JOIN "_client_loser" l ON l."loser_id" = cl."id"
GROUP BY l."keeper_id";

--    Пароль: если у keeperа его нет, берём хеш самого раннего дубля. Если задан и там и там —
--    чужой хеш молча отдавать нельзя, оставляем keeper и пишем разбор менеджеру в заметки.
CREATE TEMP TABLE "_dupe_password" AS
SELECT DISTINCT ON (l."keeper_id") l."keeper_id" AS "id", cl."passwordHash" AS "passwordHash"
FROM "Client" cl
JOIN "_client_loser" l ON l."loser_id" = cl."id"
WHERE cl."passwordHash" IS NOT NULL
ORDER BY l."keeper_id", cl."createdAt" ASC, cl."id" ASC;

UPDATE "Client" k
SET "email" = COALESCE(k."email", m."email"),
    "birthday" = COALESCE(k."birthday", m."birthday"),
    "telegramChatId" = COALESCE(k."telegramChatId", m."telegramChatId"),
    "maxChatId" = COALESCE(k."maxChatId", m."maxChatId"),
    "preferredChannel" = COALESCE(k."preferredChannel", m."preferredChannel"),
    "passwordHash" = COALESCE(k."passwordHash", p."passwordHash"),
    "notes" = NULLIF(concat_ws(E'\n',
        k."notes",
        'Дубль: ' || m."loser_names",
        CASE WHEN k."passwordHash" IS NOT NULL AND m."loser_has_password"
             THEN 'Дубль тоже имел пароль — оставлен пароль основной карточки, проверьте вручную'
        END), '')
FROM "_dupe_merge" m
LEFT JOIN "_dupe_password" p ON p."id" = m."id"
WHERE k."id" = m."id";

-- 7. Дубли удалены, привязки на keeperе.
DELETE FROM "Client" cl
USING "_client_loser" l
WHERE cl."id" = l."loser_id";

-- 8. Пред-assert: если после склейки всё же остались пары с одинаковыми последними 10 цифрами,
--    миграция падает здесь громко, а не на середине из-за 23505 на уникальном индексе.
DO $do$
DECLARE
    conflicts integer;
BEGIN
    SELECT count(*) INTO conflicts FROM (
        SELECT right(regexp_replace("phone", '\D', '', 'g'), 10) AS tail
        FROM "Client"
        WHERE length(regexp_replace("phone", '\D', '', 'g')) >= 10
        GROUP BY 1
        HAVING count(*) > 1
    ) c;
    IF conflicts > 0 THEN
        RAISE EXCEPTION
            'Нормализация невозможна: % групп(а) клиентов дублируют последние 10 цифр — сначала разберитесь с дублями (prisma/phone-dupes.report.ts)',
            conflicts;
    END IF;
END
$do$;

-- 9. Собственно нормализация Client.phone: теперь безопасно, уникальный индекс не сталкивается.
UPDATE "Client" c
SET "phone" = n."canon"
FROM "_client_phone" n
WHERE c."id" = n."id" AND n."canon" <> '' AND c."phone" IS DISTINCT FROM n."canon";

-- 10. Снапшоты телефонов в заявках и в OTP-кодах — тем же правилом (повторяет 20261007000001).
UPDATE "Booking" b
SET "clientPhone" = n."phone"
FROM (
    SELECT "id", CASE
        WHEN length(d) = 11 AND left(d, 1) = '8' THEN '7' || substring(d FROM 2)
        WHEN length(d) = 10 THEN '7' || d
        ELSE d
    END AS "phone"
    FROM (
        SELECT "id", regexp_replace(COALESCE("clientPhone", ''), '\D', '', 'g') AS d
        FROM "Booking"
    ) raw
) n
WHERE b."id" = n."id" AND n."phone" <> '' AND b."clientPhone" IS DISTINCT FROM n."phone";

UPDATE "WaitlistEntry" w
SET "clientPhone" = n."phone"
FROM (
    SELECT "id", CASE
        WHEN length(d) = 11 AND left(d, 1) = '8' THEN '7' || substring(d FROM 2)
        WHEN length(d) = 10 THEN '7' || d
        ELSE d
    END AS "phone"
    FROM (
        SELECT "id", regexp_replace(COALESCE("clientPhone", ''), '\D', '', 'g') AS d
        FROM "WaitlistEntry"
    ) raw
) n
WHERE w."id" = n."id" AND n."phone" <> '' AND w."clientPhone" IS DISTINCT FROM n."phone";

UPDATE "VRReservation" v
SET "clientPhone" = n."phone"
FROM (
    SELECT "id", CASE
        WHEN length(d) = 11 AND left(d, 1) = '8' THEN '7' || substring(d FROM 2)
        WHEN length(d) = 10 THEN '7' || d
        ELSE d
    END AS "phone"
    FROM (
        SELECT "id", regexp_replace(COALESCE("clientPhone", ''), '\D', '', 'g') AS d
        FROM "VRReservation"
        WHERE "clientPhone" IS NOT NULL
    ) raw
) n
WHERE v."id" = n."id" AND n."phone" <> '' AND v."clientPhone" IS DISTINCT FROM n."phone";

UPDATE "OtpCode" o
SET "phone" = n."phone"
FROM (
    SELECT "id", CASE
        WHEN length(d) = 11 AND left(d, 1) = '8' THEN '7' || substring(d FROM 2)
        WHEN length(d) = 10 THEN '7' || d
        ELSE d
    END AS "phone"
    FROM (
        SELECT "id", regexp_replace(COALESCE("phone", ''), '\D', '', 'g') AS d
        FROM "OtpCode"
    ) raw
) n
WHERE o."id" = n."id" AND n."phone" <> '' AND o."phone" IS DISTINCT FROM n."phone";

-- 11. Служебные телефоны (филиал, сотрудник, поставщик) — только удаляем разделители.
--     Правила 10 -> 7+10 здесь нет: городской номер или добавочный так портится, а не чинится.
UPDATE "Branch" b
SET "phone" = n."digits"
FROM (
    SELECT "id", NULLIF(TRIM(regexp_replace(COALESCE("phone", ''), '\D', '', 'g')), '') AS "digits"
    FROM "Branch"
) n
WHERE b."id" = n."id" AND n."digits" IS NOT NULL AND b."phone" IS DISTINCT FROM n."digits";

UPDATE "Employee" e
SET "phone" = n."digits"
FROM (
    SELECT "id", NULLIF(TRIM(regexp_replace(COALESCE("phone", ''), '\D', '', 'g')), '') AS "digits"
    FROM "Employee"
) n
WHERE e."id" = n."id" AND n."digits" IS NOT NULL AND e."phone" IS DISTINCT FROM n."digits";

UPDATE "Supplier" s
SET "phone" = n."digits"
FROM (
    SELECT "id", NULLIF(TRIM(regexp_replace(COALESCE("phone", ''), '\D', '', 'g')), '') AS "digits"
    FROM "Supplier"
    WHERE "phone" IS NOT NULL
) n
WHERE s."id" = n."id" AND n."digits" IS NOT NULL AND s."phone" IS DISTINCT FROM n."digits";
