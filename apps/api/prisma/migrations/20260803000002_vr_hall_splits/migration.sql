-- CreateEnum: половина зала в режиме сплита
CREATE TYPE "VRSplitSide" AS ENUM ('A', 'B');

-- AlterTable: привязка брони к половине сплита
ALTER TABLE "VRReservation" ADD COLUMN "halfSide" "VRSplitSide";

-- CreateTable: окна сплита зала (зал делится на две половины на указанный период)
CREATE TABLE "VRHallSplit" (
    "id" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VRHallSplit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VRHallSplit_hallId_date_idx" ON "VRHallSplit"("hallId", "date");

-- AddForeignKey
ALTER TABLE "VRHallSplit" ADD CONSTRAINT "VRHallSplit_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "VRHall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
