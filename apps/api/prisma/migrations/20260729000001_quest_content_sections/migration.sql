-- AlterTable: make address optional (now derived from branch)
ALTER TABLE "Quest" ALTER COLUMN "address" DROP NOT NULL;

-- AlterTable: make legacy fixed content fields optional (content now lives in contentSections)
ALTER TABLE "Quest" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Quest" ALTER COLUMN "rules" DROP NOT NULL;
ALTER TABLE "Quest" ALTER COLUMN "safety" DROP NOT NULL;
ALTER TABLE "Quest" ALTER COLUMN "extraServices" DROP NOT NULL;

-- AlterTable: add dynamic content sections (array of {title, text})
ALTER TABLE "Quest" ADD COLUMN "contentSections" JSONB;

-- DataMigration: populate contentSections from legacy fixed fields (only non-empty ones)
UPDATE "Quest" q
SET "contentSections" = s.sections
FROM (
  SELECT
    qq.id,
    (
      SELECT COALESCE(jsonb_agg(obj ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT 1 AS ord, jsonb_build_object('title', 'Описание', 'text', qq."description") AS obj
        WHERE qq."description" IS NOT NULL AND qq."description" <> ''
        UNION ALL
        SELECT 2, jsonb_build_object('title', 'Правила', 'text', qq."rules")
        WHERE qq."rules" IS NOT NULL AND qq."rules" <> ''
        UNION ALL
        SELECT 3, jsonb_build_object('title', 'Безопасность', 'text', qq."safety")
        WHERE qq."safety" IS NOT NULL AND qq."safety" <> ''
        UNION ALL
        SELECT 4, jsonb_build_object('title', 'Доп. услуги', 'text', qq."extraServices")
        WHERE qq."extraServices" IS NOT NULL AND qq."extraServices" <> ''
      ) sections
    ) AS sections
  FROM "Quest" qq
) s
WHERE q.id = s.id;
