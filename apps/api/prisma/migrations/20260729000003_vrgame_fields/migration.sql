-- AlterTable: quest-like content fields for VR games
ALTER TABLE "VRGame" ADD COLUMN "branchId" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "difficulty" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "ageRestriction" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "backgroundImageId" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "videoId" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "contentSections" JSONB;
ALTER TABLE "VRGame" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "seoKeywords" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "schemaJson" TEXT;

-- AddForeignKey
ALTER TABLE "VRGame" ADD CONSTRAINT "VRGame_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VRGame" ADD CONSTRAINT "VRGame_backgroundImageId_fkey" FOREIGN KEY ("backgroundImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VRGame" ADD CONSTRAINT "VRGame_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
