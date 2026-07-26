-- AlterTable: add SEO fields to Quest
ALTER TABLE "Quest" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Quest" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "Quest" ADD COLUMN "seoKeywords" TEXT;
ALTER TABLE "Quest" ADD COLUMN "schemaJson" TEXT;

-- AlterTable: add SEO fields to News
ALTER TABLE "News" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "News" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "News" ADD COLUMN "seoKeywords" TEXT;
ALTER TABLE "News" ADD COLUMN "schemaJson" TEXT;

-- AlterTable: add SEO fields to BlogPost
ALTER TABLE "BlogPost" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN "seoKeywords" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN "schemaJson" TEXT;
