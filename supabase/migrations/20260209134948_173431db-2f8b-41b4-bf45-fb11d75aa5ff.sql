
-- Remove the old Database Webhook trigger that sends raw payload without notification_method/phone
-- The new dispatch-waitlist-webhooks Edge Function handles this correctly now
DROP TRIGGER IF EXISTS "waitlist-promotion-webhook" ON waitlist_promotion_events;
