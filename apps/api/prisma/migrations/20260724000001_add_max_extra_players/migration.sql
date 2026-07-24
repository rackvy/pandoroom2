-- Add maxExtraPlayers column to Quest table
ALTER TABLE "Quest" ADD COLUMN "maxExtraPlayers" INTEGER NOT NULL DEFAULT 2;
