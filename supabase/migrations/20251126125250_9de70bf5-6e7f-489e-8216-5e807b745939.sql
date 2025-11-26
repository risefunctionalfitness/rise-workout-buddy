-- Add cancellations column to inactive_member_details table
ALTER TABLE inactive_member_details ADD COLUMN IF NOT EXISTS cancellations integer DEFAULT 0;