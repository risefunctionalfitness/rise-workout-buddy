-- Enable required extensions for cron jobs and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old cron job if exists (this will fail silently if it doesn't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('check-inactive-members-daily');
EXCEPTION
  WHEN undefined_function THEN
    -- Ignore if the job doesn't exist
    NULL;
END $$;

-- Create daily cron job to check for inactive members
-- Runs every day at 08:00 UTC (09:00 MEZ / 10:00 MESZ)
SELECT cron.schedule(
  'check-inactive-members-daily',
  '0 8 * * *',
  $$
  SELECT public.update_member_status();
  $$
);