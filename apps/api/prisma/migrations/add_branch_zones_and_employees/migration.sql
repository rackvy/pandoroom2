-- AlterTable: Add zone flags to Branch
ALTER TABLE "Branch" ADD COLUMN "hasCafe" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Branch" ADD COLUMN "hasLounge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Branch" ADD COLUMN "hasKids" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Branch" ADD COLUMN "hasQuests" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Branch" ADD COLUMN "hasVR" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Branch" ADD COLUMN "hasLava" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Branch" ADD COLUMN "hasLaserTag" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: BranchEmployee junction table for many-to-many relationship
CREATE TABLE "BranchEmployee" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BranchEmployee_branchId_employeeId_key" ON "BranchEmployee"("branchId", "employeeId");

-- CreateIndex
CREATE INDEX "BranchEmployee_branchId_idx" ON "BranchEmployee"("branchId");

-- CreateIndex
CREATE INDEX "BranchEmployee_employeeId_idx" ON "BranchEmployee"("employeeId");

-- AddForeignKey
ALTER TABLE "BranchEmployee" ADD CONSTRAINT "BranchEmployee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchEmployee" ADD CONSTRAINT "BranchEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
