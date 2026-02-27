-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('draft', 'confirmed', 'canceled', 'done');

-- CreateEnum
CREATE TYPE "TableZoneKey" AS ENUM ('CAFE', 'LOUNGE', 'KIDS');

-- CreateTable
CREATE TABLE "TableZone" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "key" "TableZoneKey" NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "capacity" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableReservation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "cleaningBufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "title" TEXT NOT NULL,
    "comment" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestReservation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "title" TEXT NOT NULL,
    "animatorName" TEXT,
    "comment" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableZone_branchId_key_idx" ON "TableZone"("branchId", "key");

-- CreateIndex
CREATE INDEX "Table_branchId_zoneId_idx" ON "Table"("branchId", "zoneId");

-- CreateIndex
CREATE INDEX "TableReservation_branchId_eventDate_idx" ON "TableReservation"("branchId", "eventDate");

-- CreateIndex
CREATE INDEX "TableReservation_tableId_eventDate_idx" ON "TableReservation"("tableId", "eventDate");

-- CreateIndex
CREATE INDEX "TableReservation_bookingId_idx" ON "TableReservation"("bookingId");

-- CreateIndex
CREATE INDEX "QuestReservation_branchId_eventDate_idx" ON "QuestReservation"("branchId", "eventDate");

-- CreateIndex
CREATE INDEX "QuestReservation_questId_eventDate_idx" ON "QuestReservation"("questId", "eventDate");

-- CreateIndex
CREATE INDEX "QuestReservation_bookingId_idx" ON "QuestReservation"("bookingId");

-- AddForeignKey
ALTER TABLE "TableZone" ADD CONSTRAINT "TableZone_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "TableZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableReservation" ADD CONSTRAINT "TableReservation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableReservation" ADD CONSTRAINT "TableReservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableReservation" ADD CONSTRAINT "TableReservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestReservation" ADD CONSTRAINT "QuestReservation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestReservation" ADD CONSTRAINT "QuestReservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestReservation" ADD CONSTRAINT "QuestReservation_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
