-- Convert Quest.difficulty from enum to plain text FIRST
-- (the enum type "Difficulty" must be dropped before creating the table with the same name)
ALTER TABLE "Quest" ALTER COLUMN "difficulty" TYPE TEXT USING "difficulty"::TEXT;
ALTER TABLE "Quest" ALTER COLUMN "difficulty" DROP NOT NULL;

-- Map old enum keys to dictionary values
UPDATE "Quest"
SET "difficulty" = CASE "difficulty"
    WHEN 'easy' THEN 'Легкий'
    WHEN 'medium' THEN 'Средний'
    WHEN 'hard' THEN 'Сложный'
  END
WHERE "difficulty" IN ('easy', 'medium', 'hard');

-- DropType: enum no longer used (frees the name for the table)
DROP TYPE "Difficulty";

-- CreateTable: editable difficulty dictionary (mirrors "AgeRestriction")
CREATE TABLE "Difficulty" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Difficulty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Difficulty_value_key" ON "Difficulty"("value");

-- Seed dictionary with the values that were previously hardcoded in the enum
INSERT INTO "Difficulty" ("id", "value", "sortOrder", "createdAt", "updatedAt") VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Легкий', 0, NOW(), NOW()),
  ('a0000000-0000-4000-8000-000000000002', 'Средний', 1, NOW(), NOW()),
  ('a0000000-0000-4000-8000-000000000003', 'Сложный', 2, NOW(), NOW());
