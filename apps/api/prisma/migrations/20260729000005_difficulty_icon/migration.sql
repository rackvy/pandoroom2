-- AlterTable: custom difficulty icon (emoji) for quests and VR games
ALTER TABLE "Quest" ADD COLUMN "difficultyIcon" TEXT;
ALTER TABLE "VRGame" ADD COLUMN "difficultyIcon" TEXT;
