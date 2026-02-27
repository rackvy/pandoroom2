-- CreateTable
CREATE TABLE "QuestScheduleSlot" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestScheduleSpecialPrice" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "specialDate" DATE NOT NULL,
    "specialPrice" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestScheduleSpecialPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestScheduleSlot_questId_idx" ON "QuestScheduleSlot"("questId");

-- CreateIndex
CREATE INDEX "QuestScheduleSlot_dayOfWeek_idx" ON "QuestScheduleSlot"("dayOfWeek");

-- CreateIndex
CREATE INDEX "QuestScheduleSlot_sortOrder_idx" ON "QuestScheduleSlot"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "QuestScheduleSlot_questId_dayOfWeek_startTime_key" ON "QuestScheduleSlot"("questId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "QuestScheduleSpecialPrice_slotId_idx" ON "QuestScheduleSpecialPrice"("slotId");

-- CreateIndex
CREATE INDEX "QuestScheduleSpecialPrice_specialDate_idx" ON "QuestScheduleSpecialPrice"("specialDate");

-- CreateIndex
CREATE UNIQUE INDEX "QuestScheduleSpecialPrice_slotId_specialDate_key" ON "QuestScheduleSpecialPrice"("slotId", "specialDate");

-- AddForeignKey
ALTER TABLE "QuestScheduleSlot" ADD CONSTRAINT "QuestScheduleSlot_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestScheduleSpecialPrice" ADD CONSTRAINT "QuestScheduleSpecialPrice_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "QuestScheduleSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
