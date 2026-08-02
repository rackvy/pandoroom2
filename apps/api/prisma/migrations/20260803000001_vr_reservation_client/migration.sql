-- AlterTable
ALTER TABLE "VRReservation" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE INDEX "VRReservation_clientId_idx" ON "VRReservation"("clientId");

-- AddForeignKey
ALTER TABLE "VRReservation" ADD CONSTRAINT "VRReservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
