-- AlterEnum: тип брони "blocked" для админских блокировок слотов
ALTER TYPE "VRBookingType" ADD VALUE 'blocked';

-- AlterTable: базовая цена часа (за человека) как фолбэк, если ценовое правило не найдено
ALTER TABLE "VRHall" ADD COLUMN "basePricePerHour" INTEGER NOT NULL DEFAULT 1000;

-- CreateTable: ценовые правила (дни недели + время + цена часа)
CREATE TABLE "VRPriceRule" (
    "id" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "name" TEXT,
    "days" INTEGER[],
    "fromMinutes" INTEGER NOT NULL,
    "toMinutes" INTEGER NOT NULL,
    "pricePerHour" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VRPriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VRPriceRule_hallId_idx" ON "VRPriceRule"("hallId");

-- AddForeignKey
ALTER TABLE "VRPriceRule" ADD CONSTRAINT "VRPriceRule_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "VRHall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
