-- Add phone and notification preference columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+49';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_email_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_whatsapp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_prompt_shown BOOLEAN DEFAULT FALSE;