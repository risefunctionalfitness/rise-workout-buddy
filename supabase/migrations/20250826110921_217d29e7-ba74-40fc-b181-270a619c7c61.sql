-- Update the handle_new_user function to handle first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    display_name, 
    first_name,
    last_name,
    access_code, 
    membership_type,
    authors
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'access_code',
    new.raw_user_meta_data ->> 'membership_type',
    COALESCE((new.raw_user_meta_data ->> 'authors')::boolean, false)
  );
  RETURN new;
END;
$$;