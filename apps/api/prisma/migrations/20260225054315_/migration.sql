-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "PageKey" AS ENUM ('HOME', 'PARTY_GUIDE', 'PARTY_GUIDE_KIDS', 'PARTY_GUIDE_6_10', 'PARTY_GUIDE_10_15', 'CAFE', 'CAFE_KAFE', 'CAFE_LOUNGE', 'CAFE_KIDS');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('ADMIN', 'CONTENT', 'MANAGER');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'file');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('draft', 'confirmed', 'canceled', 'done');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'cashless', 'card', 'transfer');

-- CreateEnum
CREATE TYPE "BookingExtraType" AS ENUM ('show_program', 'pinata', 'other');

-- CreateEnum
CREATE TYPE "ServeMode" AS ENUM ('before', 'after');

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geoLat" DECIMAL(10,8) NOT NULL,
    "geoLng" DECIMAL(11,8) NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "max" TEXT,
    "telegram" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "address" TEXT NOT NULL,
    "minPlayers" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "previewImageId" TEXT,
    "backgroundImageId" TEXT,
    "description" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "safety" TEXT NOT NULL,
    "extraServices" TEXT NOT NULL,
    "extraPlayerPrice" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "imageId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutFact" (
    "id" TEXT NOT NULL,
    "iconId" TEXT,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageBlock" (
    "id" TEXT NOT NULL,
    "pageKey" "PageKey" NOT NULL,
    "blockKey" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT,
    "linkUrl" TEXT,
    "fileId" TEXT,
    "imageId" TEXT,
    "extraJson" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "telegram" TEXT,
    "email" TEXT,
    "requisites" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cake" (
    "id" TEXT NOT NULL,
    "imageId" TEXT,
    "name" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL DEFAULT 0,
    "weightGrams" INTEGER NOT NULL DEFAULT 0,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowProgram" (
    "id" TEXT NOT NULL,
    "imageId" TEXT,
    "name" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL DEFAULT 0,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decoration" (
    "id" TEXT NOT NULL,
    "imageId" TEXT,
    "name" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decoration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" DATE,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "birthdayPersonName" TEXT,
    "birthdayPersonAge" INTEGER,
    "guestsKids" INTEGER,
    "guestsAdults" INTEGER,
    "commentClient" TEXT,
    "commentInternal" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'draft',
    "managerId" TEXT,
    "depositRub" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingTableSlot" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "comment" TEXT,

    CONSTRAINT "BookingTableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingQuestSlot" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "questId" TEXT,
    "title" TEXT NOT NULL,
    "startTime" TIME NOT NULL,
    "comment" TEXT,
    "animatorName" TEXT,

    CONSTRAINT "BookingQuestSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingExtraSlot" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "BookingExtraType" NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIME,
    "endTime" TIME,
    "priceRub" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,

    CONSTRAINT "BookingExtraSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingCake" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "cakeId" TEXT,
    "title" TEXT NOT NULL,
    "inscription" TEXT,
    "priceRub" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,

    CONSTRAINT "BookingCake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingDecorationItem" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "decorationId" TEXT,
    "title" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "priceRub" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,

    CONSTRAINT "BookingDecorationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingFoodItem" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "serveAt" TIME,
    "serveMode" "ServeMode",
    "priceRub" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,

    CONSTRAINT "BookingFoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageBlock_pageKey_idx" ON "PageBlock"("pageKey");

-- CreateIndex
CREATE INDEX "PageBlock_blockKey_idx" ON "PageBlock"("blockKey");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Booking_eventDate_idx" ON "Booking"("eventDate");

-- CreateIndex
CREATE INDEX "Booking_branchId_idx" ON "Booking"("branchId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "BookingTableSlot_bookingId_idx" ON "BookingTableSlot"("bookingId");

-- CreateIndex
CREATE INDEX "BookingQuestSlot_bookingId_idx" ON "BookingQuestSlot"("bookingId");

-- CreateIndex
CREATE INDEX "BookingQuestSlot_questId_idx" ON "BookingQuestSlot"("questId");

-- CreateIndex
CREATE INDEX "BookingExtraSlot_bookingId_idx" ON "BookingExtraSlot"("bookingId");

-- CreateIndex
CREATE INDEX "BookingCake_bookingId_idx" ON "BookingCake"("bookingId");

-- CreateIndex
CREATE INDEX "BookingCake_cakeId_idx" ON "BookingCake"("cakeId");

-- CreateIndex
CREATE INDEX "BookingDecorationItem_bookingId_idx" ON "BookingDecorationItem"("bookingId");

-- CreateIndex
CREATE INDEX "BookingDecorationItem_decorationId_idx" ON "BookingDecorationItem"("decorationId");

-- CreateIndex
CREATE INDEX "BookingFoodItem_bookingId_idx" ON "BookingFoodItem"("bookingId");

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_previewImageId_fkey" FOREIGN KEY ("previewImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_backgroundImageId_fkey" FOREIGN KEY ("backgroundImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AboutFact" ADD CONSTRAINT "AboutFact_iconId_fkey" FOREIGN KEY ("iconId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSource" ADD CONSTRAINT "ReviewSource_iconId_fkey" FOREIGN KEY ("iconId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ReviewSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cake" ADD CONSTRAINT "Cake_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cake" ADD CONSTRAINT "Cake_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowProgram" ADD CONSTRAINT "ShowProgram_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowProgram" ADD CONSTRAINT "ShowProgram_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decoration" ADD CONSTRAINT "Decoration_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTableSlot" ADD CONSTRAINT "BookingTableSlot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingQuestSlot" ADD CONSTRAINT "BookingQuestSlot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingQuestSlot" ADD CONSTRAINT "BookingQuestSlot_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingExtraSlot" ADD CONSTRAINT "BookingExtraSlot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCake" ADD CONSTRAINT "BookingCake_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCake" ADD CONSTRAINT "BookingCake_cakeId_fkey" FOREIGN KEY ("cakeId") REFERENCES "Cake"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDecorationItem" ADD CONSTRAINT "BookingDecorationItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDecorationItem" ADD CONSTRAINT "BookingDecorationItem_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "Decoration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFoodItem" ADD CONSTRAINT "BookingFoodItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
