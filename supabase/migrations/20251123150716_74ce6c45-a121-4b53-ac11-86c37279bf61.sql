-- Add email_sent_at column to news table to track email sending
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.news.email_sent_at IS 'Timestamp when email was sent to members. NULL means no email sent yet.';