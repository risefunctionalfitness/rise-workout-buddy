-- Add first_name and last_name to inactive_member_details
ALTER TABLE public.inactive_member_details
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add first_name and last_name to never_active_member_details
ALTER TABLE public.never_active_member_details
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;