-- Add webhook_sent_at column to track successful webhook delivery
ALTER TABLE waitlist_promotion_events 
ADD COLUMN IF NOT EXISTS webhook_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for efficient querying of pending webhooks
CREATE INDEX IF NOT EXISTS idx_waitlist_promotion_events_pending 
ON waitlist_promotion_events (webhook_sent_at) 
WHERE webhook_sent_at IS NULL;

-- Mark old successful events as sent (before the outage)
UPDATE waitlist_promotion_events 
SET webhook_sent_at = notified_at 
WHERE webhook_sent_at IS NULL 
  AND notified_at IS NOT NULL 
  AND created_at < '2026-02-06 11:50:00+00';