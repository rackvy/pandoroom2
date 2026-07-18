-- Add animator and extra players fields to Quest and QuestReservation

ALTER TABLE "Quest" ADD COLUMN "allowAnimator" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Quest" ADD COLUMN "animatorPrice" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "QuestReservation" ADD COLUMN "extraPlayers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "QuestReservation" ADD COLUMN "extraPlayersPrice" INTEGER NOT NULL DEFAULT 0;
