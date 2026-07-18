-- AlterTable: Make bookingId optional, add waitlistId
ALTER TABLE "NotificationLog" ALTER COLUMN "bookingId" DROP NOT NULL;
ALTER TABLE "NotificationLog" ADD COLUMN "waitlistId" TEXT;

-- CreateTable: WaitlistEntry
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "desiredDate" DATE,
    "desiredTime" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_waitlistId_idx" ON "NotificationLog"("waitlistId");
CREATE INDEX "WaitlistEntry_questId_status_idx" ON "WaitlistEntry"("questId", "status");
CREATE INDEX "WaitlistEntry_desiredDate_idx" ON "WaitlistEntry"("desiredDate");
CREATE INDEX "WaitlistEntry_createdAt_idx" ON "WaitlistEntry"("createdAt");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_waitlistId_fkey" FOREIGN KEY ("waitlistId") REFERENCES "WaitlistEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
