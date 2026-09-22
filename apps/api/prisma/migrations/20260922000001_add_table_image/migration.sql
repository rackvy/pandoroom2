-- AlterTable
ALTER TABLE "Table" ADD COLUMN "imageId" TEXT;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
