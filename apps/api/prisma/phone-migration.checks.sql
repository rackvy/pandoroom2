-- Проверки результата репетиции миграции 20261009000001_normalize_phone_numbers.
-- Ждём: все строки PASS. Запуск после phone-migration.rehearsal.sql и самого файла миграции.

SELECT CASE WHEN count(*) = 5 THEN 'PASS' ELSE 'FAIL' END AS result,
       'клиентов после склейки: 5 (было 9, дублей 4)' AS check,
       count(*)::text AS fact
FROM "Client"

UNION ALL
SELECT CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
       'все клиентские номера в каноне 7+10 цифр',
       string_agg("phone", ', ')
FROM "Client"
WHERE "phone" !~ '^7[0-9]{10}$' AND "id" <> 'rh-junk'

UNION ALL
SELECT CASE WHEN "phone" = '79999991111' THEN 'PASS' ELSE 'FAIL' END,
       'keeper группы 9999991111 получил канон',
       "phone"
FROM "Client" WHERE "id" = 'rh-keeper'

UNION ALL
SELECT CASE WHEN "email" = 'a@rh.test' AND "birthday" = '1990-05-05' AND "telegramChatId" = '@vanya_b'
            THEN 'PASS' ELSE 'FAIL' END,
       'пустые колонки keeperа дозаполнены с дублей',
       COALESCE("email", '—') || ' | ' || COALESCE("birthday"::text, '—') || ' | ' || COALESCE("telegramChatId", '—')
FROM "Client" WHERE "id" = 'rh-keeper'

UNION ALL
SELECT CASE WHEN "preferredChannel" = 'sms' THEN 'PASS' ELSE 'FAIL' END,
       'preferredChannel переехал с дубля',
       COALESCE("preferredChannel", '—')
FROM "Client" WHERE "id" = 'rh-keeper'

UNION ALL
SELECT CASE WHEN "passwordHash" = 'hash-loser-a' THEN 'PASS' ELSE 'FAIL' END,
       'пароль перенесён, когда у keeperа его не было',
       COALESCE("passwordHash", '—')
FROM "Client" WHERE "id" = 'rh-keeper'

UNION ALL
SELECT CASE WHEN "notes" LIKE 'основная заметка%' AND "notes" LIKE '%Дубль: Ваня Дубль А%'
            THEN 'PASS' ELSE 'FAIL' END,
       'имена дублей записаны в заметки, заметка keeperа цела',
       replace("notes", E'\n', ' / ')
FROM "Client" WHERE "id" = 'rh-keeper'

UNION ALL
SELECT CASE WHEN "passwordHash" = 'hash-keeper' AND "notes" LIKE '%оставлен пароль основной карточки%'
            THEN 'PASS' ELSE 'FAIL' END,
       'конфликт паролей: хеш keeperа оставлен, разбор помечен в заметках',
       COALESCE("passwordHash", '—') || ' | ' || COALESCE(replace("notes", E'\n', ' / '), '—')
FROM "Client" WHERE "id" = 'rh-pw-keeper'

UNION ALL
SELECT CASE WHEN "phone" = '74232022696' THEN 'PASS' ELSE 'FAIL' END,
       'городской номер склеен в канон (тот риск, что надо увидеть глазами)',
       "phone"
FROM "Client" WHERE "id" = 'rh-city-1'

UNION ALL
SELECT CASE WHEN "phone" = '42' THEN 'PASS' ELSE 'FAIL' END,
       'добавочный короче 10 цифр не превращён в выдуманный номер',
       "phone"
FROM "Client" WHERE "id" = 'rh-junk'

UNION ALL
SELECT CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
       'после склейки нет двух клиентов с одинаковыми последними 10 цифрами',
       count(*)::text
FROM (
    SELECT right(regexp_replace("phone", '\D', '', 'g'), 10) AS tail
    FROM "Client"
    WHERE length(regexp_replace("phone", '\D', '', 'g')) >= 10
    GROUP BY 1 HAVING count(*) > 1
) c

UNION ALL
SELECT CASE WHEN b."clientId" = 'rh-keeper' AND q."clientId" = 'rh-keeper' AND v."clientId" = 'rh-keeper'
            THEN 'PASS' ELSE 'FAIL' END,
       'дети дубля перепривязаны к keeperу',
       'бронь ' || COALESCE(b."clientId", '—') || ' | квест ' || COALESCE(q."clientId", '—') || ' | vr ' || COALESCE(v."clientId", '—')
FROM "Booking" b, "QuestReservation" q, "VRReservation" v
WHERE b."id" = 'rh-book-1' AND q."id" = 'rh-qr-1' AND v."id" = 'rh-vr-1'

UNION ALL
SELECT CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
       'переписка дубля уцелела и переехала (cascade бы её съел)',
       count(*)::text
FROM "ChatMessage" WHERE "clientId" = 'rh-keeper'

UNION ALL
SELECT CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
       'нет сообщений на несуществующего клиента',
       count(*)::text
FROM "ChatMessage" m
WHERE m."clientId" LIKE 'rh-%' AND NOT EXISTS (SELECT 1 FROM "Client" c WHERE c."id" = m."clientId")

UNION ALL
SELECT CASE WHEN "externalId" = 'rh-internal-keeper' AND "available" AND "checkedAt" = '2024-06-01'
            THEN 'PASS' ELSE 'FAIL' END,
       'канал INTERNAL: externalId keeperа сохранён, признаки свежести дубля приняты',
       COALESCE("externalId", '—') || ' | ' || "available"::text || ' | ' || "checkedAt"::date::text
FROM "ClientChannel" WHERE "id" = 'rh-ch-keeper-internal'

UNION ALL
SELECT CASE WHEN "clientId" = 'rh-keeper' THEN 'PASS' ELSE 'FAIL' END,
       'канал TELEGRAM переехал целиком, у keeperа его не было',
       "clientId" || ' | ' || COALESCE("externalId", '—')
FROM "ClientChannel" WHERE "id" = 'rh-ch-loser-telegram'

UNION ALL
SELECT CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
       'нет каналов на несуществующего клиента',
       count(*)::text
FROM "ClientChannel" ch
WHERE ch."id" LIKE 'rh-%' AND NOT EXISTS (SELECT 1 FROM "Client" c WHERE c."id" = ch."clientId")

UNION ALL
SELECT CASE WHEN b."clientPhone" = '79999991111' AND w."clientPhone" = '79999991111'
              AND v."clientPhone" = '79999991111' AND o."phone" = '79999991111'
            THEN 'PASS' ELSE 'FAIL' END,
       'снапшоты и OTP свернуты в канон',
       b."clientPhone" || ' | ' || w."clientPhone" || ' | ' || COALESCE(v."clientPhone", '—') || ' | ' || o."phone"
FROM "Booking" b, "WaitlistEntry" w, "VRReservation" v, "OtpCode" o
WHERE b."id" = 'rh-book-1' AND w."id" = 'rh-wl-1' AND v."id" = 'rh-vr-1' AND o."id" = 'rh-otp-1'

UNION ALL
SELECT CASE WHEN "phone" = '74232022696' THEN 'PASS' ELSE 'FAIL' END,
       'телефон филиала: только цифры, без правки 10 -> 7+10',
       "phone"
FROM "Branch" WHERE "id" = 'rh-branch'

UNION ALL
SELECT CASE WHEN "phone" = '84232054458' THEN 'PASS' ELSE 'FAIL' END,
       'телефон сотрудника: ведущая 8 сохранена (городской не портится)',
       "phone"
FROM "Employee" WHERE "id" = 'rh-emp'

UNION ALL
SELECT CASE WHEN "phone" = '74232022696' THEN 'PASS' ELSE 'FAIL' END,
       'телефон поставщика: только цифры',
       "phone"
FROM "Supplier" WHERE "id" = 'rh-sup';
