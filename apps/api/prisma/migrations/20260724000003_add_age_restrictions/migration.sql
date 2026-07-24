-- CreateTable
CREATE TABLE "AgeRestriction" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgeRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgeRestriction_value_key" ON "AgeRestriction"("value");

-- Seed default age restriction options
INSERT INTO "AgeRestriction" ("id", "value", "sortOrder", "createdAt", "updatedAt") VALUES
    (gen_random_uuid(), '0+', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), '8+', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), '12+', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), '18+', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
