-- CreateTable
CREATE TABLE "QuestGalleryPhoto" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestGalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestGalleryPhoto_questId_idx" ON "QuestGalleryPhoto"("questId");

-- CreateIndex
CREATE INDEX "QuestGalleryPhoto_sortOrder_idx" ON "QuestGalleryPhoto"("sortOrder");

-- AddForeignKey
ALTER TABLE "QuestGalleryPhoto" ADD CONSTRAINT "QuestGalleryPhoto_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestGalleryPhoto" ADD CONSTRAINT "QuestGalleryPhoto_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
