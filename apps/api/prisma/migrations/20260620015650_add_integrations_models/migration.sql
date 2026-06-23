-- CreateEnum
CREATE TYPE "VRBookingType" AS ENUM ('full_hall', 'open_slot');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "iikoOrderId" TEXT,
ADD COLUMN     "iikoOrderStatus" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "paymentUrl" TEXT;

-- AlterTable
ALTER TABLE "BookingFoodItem" ADD COLUMN     "department" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "maxChatId" TEXT,
ADD COLUMN     "preferredChannel" TEXT,
ADD COLUMN     "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VRHall" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VRHall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VRReservation" (
    "id" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "bookingId" TEXT,
    "date" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "type" "VRBookingType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "gameId" TEXT,
    "clientName" TEXT,
    "clientPhone" TEXT,
    "guestsCount" INTEGER NOT NULL DEFAULT 0,
    "maxGuests" INTEGER,
    "status" "ReservationStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VRReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VRGame" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "genre" TEXT,
    "minPlayers" INTEGER NOT NULL DEFAULT 1,
    "maxPlayers" INTEGER NOT NULL DEFAULT 20,
    "durationMinutes" INTEGER,
    "previewImageId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VRGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IikoMenuItem" (
    "id" TEXT NOT NULL,
    "iikoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IikoMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_bookingId_idx" ON "NotificationLog"("bookingId");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- CreateIndex
CREATE INDEX "VRHall_branchId_idx" ON "VRHall"("branchId");

-- CreateIndex
CREATE INDEX "VRReservation_hallId_date_idx" ON "VRReservation"("hallId", "date");

-- CreateIndex
CREATE INDEX "VRReservation_bookingId_idx" ON "VRReservation"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "IikoMenuItem_iikoId_key" ON "IikoMenuItem"("iikoId");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VRHall" ADD CONSTRAINT "VRHall_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VRReservation" ADD CONSTRAINT "VRReservation_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "VRHall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VRReservation" ADD CONSTRAINT "VRReservation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VRReservation" ADD CONSTRAINT "VRReservation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "VRGame"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VRGame" ADD CONSTRAINT "VRGame_previewImageId_fkey" FOREIGN KEY ("previewImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
