-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Update existing records to split display_name into first_name and last_name
UPDATE public.profiles 
SET 
  first_name = CASE 
    WHEN position(' ' in display_name) > 0 
    THEN substring(display_name from 1 for position(' ' in display_name) - 1)
    ELSE display_name
  END,
  last_name = CASE 
    WHEN position(' ' in display_name) > 0 
    THEN substring(display_name from position(' ' in display_name) + 1)
    ELSE ''
  END
WHERE display_name IS NOT NULL;