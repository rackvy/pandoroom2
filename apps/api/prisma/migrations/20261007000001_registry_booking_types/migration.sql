-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('party', 'quest', 'vr', 'hall', 'other');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "type" "BookingType" NOT NULL DEFAULT 'party';

-- CreateIndex
CREATE INDEX "Booking_type_idx" ON "Booking"("type");

-- AlterEnum: значение не используется в этой же миграции
ALTER TYPE "BookingStatus" ADD VALUE 'paid';

-- AlterTable: запрошенный стол, чтобы подтверждение заявки могла превратить в TableReservation
ALTER TABLE "BookingTableSlot" ADD COLUMN "tableId" TEXT;

-- AlterTable: ссылка на позицию каталога iiko, title остаётся снапшотом
ALTER TABLE "BookingFoodItem" ADD COLUMN "iikoItemId" TEXT;

-- CreateIndex
CREATE INDEX "BookingTableSlot_tableId_idx" ON "BookingTableSlot"("tableId");

-- AddForeignKey
ALTER TABLE "BookingTableSlot" ADD CONSTRAINT "BookingTableSlot_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: бронь без стола, но с занятостью квеста — это отдельный квест, остальное — праздники
UPDATE "Booking" b
SET "type" = CASE
    WHEN EXISTS (SELECT 1 FROM "QuestReservation" q WHERE q."bookingId" = b."id")
     AND NOT EXISTS (SELECT 1 FROM "TableReservation" t WHERE t."bookingId" = b."id")
    THEN 'quest'::"BookingType"
    ELSE 'party'::"BookingType"
END;

-- Backfill: каждая VR-занятость без родителя получает бронь типа vr
CREATE TEMP TABLE "_vr_parents" AS
SELECT v."id" AS "vrId", gen_random_uuid() AS "bookingId"
FROM "VRReservation" v
WHERE v."bookingId" IS NULL;

INSERT INTO "Booking" ("id", "branchId", "eventDate", "clientName", "clientPhone", "commentInternal", "status", "type", "createdAt", "updatedAt")
SELECT p."bookingId",
       h."branchId",
       v."date",
       COALESCE(NULLIF(TRIM(v."clientName"), ''), '—'),
       COALESCE(NULLIF(TRIM(v."clientPhone"), ''), '—'),
       'Бронь VR: создана из занятого слота'
         || COALESCE(' — ' || v."title", '')
         || COALESCE(' (гостей: ' || v."guestsCount" || ')', ''),
       v."status"::text::"BookingStatus",
       'vr'::"BookingType",
       now(),
       now()
FROM "_vr_parents" p
JOIN "VRReservation" v ON v."id" = p."vrId"
JOIN "VRHall" h ON h."id" = v."hallId";

UPDATE "VRReservation" r
SET "bookingId" = p."bookingId"
FROM "_vr_parents" p
WHERE r."id" = p."vrId";

DROP TABLE "_vr_parents";

-- Снапшоты телефона приводим к канону 7XXXXXXXXXX: из них формируются SMS и поиск клиента.
-- Client.phone не трогаем: на нём уникальный индекс, нормализация столкнула бы
-- уже накопленные дубликаты (+79991234567 и 79991234567) — их решает менеджер вручную.
UPDATE "Booking" b
SET "clientPhone" = n."phone"
FROM (
    SELECT "id", CASE
        WHEN length(d) = 11 AND left(d, 1) = '8' THEN '7' || substring(d from 2)
        WHEN length(d) = 10 THEN '7' || d
        ELSE d
    END AS "phone"
    FROM (
        SELECT "id", regexp_replace(COALESCE("clientPhone", ''), '\D', '', 'g') AS d
        FROM "Booking"
    ) raw
) n
WHERE b."id" = n."id" AND n."phone" <> '' AND b."clientPhone" IS DISTINCT FROM n."phone";

UPDATE "VRReservation" v
SET "clientPhone" = n."phone"
FROM (
    SELECT "id", CASE
        WHEN length(d) = 11 AND left(d, 1) = '8' THEN '7' || substring(d from 2)
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
