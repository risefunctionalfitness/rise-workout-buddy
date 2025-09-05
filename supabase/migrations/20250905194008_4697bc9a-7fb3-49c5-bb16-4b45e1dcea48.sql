-- Remove unique constraints and indices on access_code in profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_access_code_key;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS unique_access_code;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_access_code_unique;

DROP INDEX IF EXISTS profiles_access_code_key;
DROP INDEX IF EXISTS unique_access_code_index;
DROP INDEX IF EXISTS idx_profiles_access_code_unique;