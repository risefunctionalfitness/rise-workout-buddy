-- Add column to track when inactivity webhook was last sent
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_inactivity_webhook_sent_at timestamp with time zone;

-- Update the reactivate_member_on_registration trigger to reset webhook timestamp
CREATE OR REPLACE FUNCTION public.reactivate_member_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status IN ('registered', 'waitlisted') THEN
    UPDATE public.profiles
    SET 
      status = 'active',
      last_inactivity_webhook_sent_at = NULL  -- Reset webhook timestamp on reactivation
    WHERE user_id = NEW.user_id AND status = 'inactive';
  END IF;
  RETURN NEW;
END;
$function$;