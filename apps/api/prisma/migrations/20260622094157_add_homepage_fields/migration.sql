-- AlterTable
ALTER TABLE "News" ADD COLUMN     "cardBg" TEXT,
ADD COLUMN     "coverSub" TEXT,
ADD COLUMN     "coverTitle" TEXT,
ADD COLUMN     "coverVariant" TEXT;

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "ageRestriction" TEXT,
ADD COLUMN     "hasActors" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subtitle" TEXT;
