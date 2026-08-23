-- Migration: add_room_gender_block
-- Adds blockName (nullable text) and gender (text, default 'MIXED') to the Room table
-- Implements Model 1: Block/Wing Level Gender Segregation

ALTER TABLE "Room"
  ADD COLUMN IF NOT EXISTS "blockName" TEXT,
  ADD COLUMN IF NOT EXISTS "gender"    TEXT NOT NULL DEFAULT 'MIXED';

-- Index for filtering rooms by gender
CREATE INDEX IF NOT EXISTS "Room_gender_idx" ON "Room"("gender");
