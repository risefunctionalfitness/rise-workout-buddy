-- Add show_in_leaderboard column to profiles table
ALTER TABLE profiles 
ADD COLUMN show_in_leaderboard BOOLEAN NOT NULL DEFAULT true;

-- Add comment to document the column
COMMENT ON COLUMN profiles.show_in_leaderboard IS 'Controls whether the user appears in the public leaderboard';

-- Update trigger function to include show_in_leaderboard
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    display_name, 
    first_name,
    last_name,
    access_code, 
    membership_type,
    authors,
    show_in_leaderboard
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'access_code',
    new.raw_user_meta_data ->> 'membership_type',
    COALESCE((new.raw_user_meta_data ->> 'authors')::boolean, false),
    COALESCE((new.raw_user_meta_data ->> 'show_in_leaderboard')::boolean, true)
  );
  RETURN new;
END;
$$;