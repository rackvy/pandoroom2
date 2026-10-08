-- Единая модель переписки: каналы, направление, статус доставки.
--
-- Миграция намеренно аддитивная и в три шага (nullable -> backfill -> NOT NULL):
-- боевая таблица "ChatMessage" не пуста, и ADD COLUMN ... NOT NULL без значения
-- по умолчанию на ней упадёт. Колонка "sender" здесь НЕ удаляется — старый
-- контейнер API продолжает её писать, пока новый не задеплоен; её снимает
-- отдельная миграция drop_chat_sender.

-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('WHATSAPP', 'TELEGRAM', 'MAX', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ChannelSource" AS ENUM ('PROBE', 'WEBHOOK', 'MANUAL', 'LEGACY');

-- CreateTable
CREATE TABLE "ClientChannel" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "channel" "ChannelKind" NOT NULL,
    "externalId" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "source" "ChannelSource" NOT NULL DEFAULT 'MANUAL',
    "checkedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientChannel_clientId_idx" ON "ClientChannel"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientChannel_clientId_channel_key" ON "ClientChannel"("clientId", "channel");

-- AddForeignKey
ALTER TABLE "ClientChannel" ADD CONSTRAINT "ClientChannel_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: всё добавляем допускающим NULL
ALTER TABLE "ChatMessage"
    ADD COLUMN "direction" "MessageDirection",
    ADD COLUMN "channel" "ChannelKind" DEFAULT 'INTERNAL',
    ADD COLUMN "status" "MessageStatus",
    ADD COLUMN "authorId" TEXT,
    ADD COLUMN "authorName" TEXT,
    ADD COLUMN "externalId" TEXT,
    ADD COLUMN "errorText" TEXT,
    ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill: прежний sender однозначно раскладывается на direction,
-- а вся существующая переписка велась во внутреннем чате.
UPDATE "ChatMessage" SET
    "direction" = CASE "sender"
        WHEN 'client' THEN 'INBOUND'::"MessageDirection"
        WHEN 'admin'  THEN 'OUTBOUND'::"MessageDirection"
        ELSE 'SYSTEM'::"MessageDirection"
    END,
    "channel"   = 'INTERNAL'::"ChannelKind",
    "status"    = 'SENT'::"MessageStatus",
    "updatedAt" = "createdAt"
WHERE "direction" IS NULL OR "channel" IS NULL OR "status" IS NULL OR "updatedAt" IS NULL;

-- Теперь, когда пустых значений не осталось, затягиваем ограничения
ALTER TABLE "ChatMessage"
    ALTER COLUMN "direction" SET NOT NULL,
    ALTER COLUMN "channel" SET NOT NULL,
    ALTER COLUMN "channel" SET DEFAULT 'INTERNAL',
    ALTER COLUMN "status" SET NOT NULL,
    ALTER COLUMN "updatedAt" SET NOT NULL;

-- DropIndex
DROP INDEX "ChatMessage_clientId_idx";

-- CreateIndex
CREATE INDEX "ChatMessage_clientId_createdAt_idx" ON "ChatMessage"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_status_idx" ON "ChatMessage"("status");

-- CreateIndex
-- NULL в Postgres не участвует в сравнении на уникальность, поэтому множество
-- внутренних сообщений с пустым externalId ограничению не мешает.
CREATE UNIQUE INDEX "ChatMessage_channel_externalId_key" ON "ChatMessage"("channel", "externalId");

-- Backfill ClientChannel из унаследованных идентификаторов мессенджеров.
-- available = true: раз chatId записан, клиент боту уже писал.
INSERT INTO "ClientChannel" ("id", "clientId", "channel", "externalId", "available", "source", "createdAt", "updatedAt")
SELECT gen_random_uuid(), c."id", 'TELEGRAM'::"ChannelKind", c."telegramChatId", true, 'LEGACY'::"ChannelSource", now(), now()
FROM "Client" c
WHERE c."telegramChatId" IS NOT NULL AND c."telegramChatId" <> ''
ON CONFLICT ("clientId", "channel") DO NOTHING;

INSERT INTO "ClientChannel" ("id", "clientId", "channel", "externalId", "available", "source", "createdAt", "updatedAt")
SELECT gen_random_uuid(), c."id", 'MAX'::"ChannelKind", c."maxChatId", true, 'LEGACY'::"ChannelSource", now(), now()
FROM "Client" c
WHERE c."maxChatId" IS NOT NULL AND c."maxChatId" <> ''
ON CONFLICT ("clientId", "channel") DO NOTHING;
