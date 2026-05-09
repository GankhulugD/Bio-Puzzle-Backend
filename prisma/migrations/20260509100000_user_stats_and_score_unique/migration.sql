-- User statistics + best score per user per level

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gamesPlayed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveDay" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayNameMn" TEXT;

-- Backfill level from totalPoints (400 pts per level step, cap 99)
UPDATE "User" SET "level" = LEAST(99, 1 + FLOOR(GREATEST("totalPoints", 0) / 400.0)::int) WHERE true;

-- Remove duplicate scores; keep best (highest points, then fastest time)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "userId", "levelId"
           ORDER BY points DESC, "timeSeconds" ASC, "completedAt" DESC
         ) AS rn
  FROM "Score"
)
DELETE FROM "Score" s USING ranked r WHERE s.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Score_userId_levelId_key" ON "Score"("userId", "levelId");
