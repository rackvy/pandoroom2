-- CreateTable: gallery photos for VR games (additive, zero-downtime)
CREATE TABLE "VRGameGalleryPhoto" (
    "id" TEXT NOT NULL,
    "vrGameId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VRGameGalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VRGameGalleryPhoto_vrGameId_idx" ON "VRGameGalleryPhoto"("vrGameId");
CREATE INDEX "VRGameGalleryPhoto_sortOrder_idx" ON "VRGameGalleryPhoto"("sortOrder");

-- AddForeignKey
ALTER TABLE "VRGameGalleryPhoto" ADD CONSTRAINT "VRGameGalleryPhoto_vrGameId_fkey" FOREIGN KEY ("vrGameId") REFERENCES "VRGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VRGameGalleryPhoto" ADD CONSTRAINT "VRGameGalleryPhoto_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
