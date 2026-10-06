-- AlterTable: мягкое возрастное ограничение зала (null — без ограничений)
ALTER TABLE "TableZone" ADD COLUMN "recommendedMaxAge" INTEGER;
