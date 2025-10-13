-- Update get_inactive_members to exclude Trainer and Administrator
DROP FUNCTION IF EXISTS public.get_inactive_members(integer);

CREATE OR REPLACE FUNCTION public.get_inactive_members(days_threshold integer DEFAULT 21)
RETURNS TABLE(
  user_id uuid, 
  display_name text, 
  first_name text, 
  last_name text, 
  membership_type text, 
  last_activity timestamp with time zone, 
  days_since_activity integer,
  was_ever_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user_activities AS (
    SELECT 
      p.user_id,
      p.display_name,
      p.first_name,
      p.last_name,
      p.membership_type,
      p.created_at,
      GREATEST(
        COALESCE(MAX(ts.created_at), '1970-01-01'::timestamptz),
        COALESCE(MAX(cr.registered_at), '1970-01-01'::timestamptz)
      ) as last_activity
    FROM profiles p
    LEFT JOIN training_sessions ts ON p.user_id = ts.user_id 
      AND ts.status = 'completed'
    LEFT JOIN course_registrations cr ON p.user_id = cr.user_id
      AND cr.status IN ('registered', 'waitlisted')
    WHERE p.status = 'inactive'
      AND p.membership_type NOT IN ('Trainer', 'Administrator')
    GROUP BY p.user_id, p.display_name, p.first_name, p.last_name, p.membership_type, p.created_at
  )
  SELECT 
    ua.user_id,
    ua.display_name,
    ua.first_name,
    ua.last_name,
    ua.membership_type,
    ua.last_activity,
    CASE 
      WHEN ua.last_activity = '1970-01-01'::timestamptz 
      THEN EXTRACT(DAY FROM NOW() - ua.created_at)::INTEGER
      ELSE EXTRACT(DAY FROM NOW() - ua.last_activity)::INTEGER
    END as days_since_activity,
    (ua.last_activity != '1970-01-01'::timestamptz) as was_ever_active
  FROM user_activities ua
  ORDER BY 
    CASE 
      WHEN ua.last_activity = '1970-01-01'::timestamptz 
      THEN ua.created_at
      ELSE ua.last_activity
    END ASC;
END;
$function$;

-- Update update_member_status to exclude Trainer and Administrator from inactivity processing
DROP FUNCTION IF EXISTS public.update_member_status();

CREATE OR REPLACE FUNCTION public.update_member_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member RECORD;
  v_webhook_url TEXT;
  v_webhook_payload JSONB;
  v_last_activity TIMESTAMPTZ;
BEGIN
  v_webhook_url := current_setting('app.settings.make_main_webhook_url', true);
  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    v_webhook_url := current_setting('app.settings.MAKE_MAIN_WEBHOOK_URL', true);
  END IF;

  FOR v_member IN 
    SELECT 
      p.user_id,
      p.display_name,
      p.first_name,
      p.last_name,
      p.email,
      p.access_code,
      p.membership_type,
      p.status,
      GREATEST(
        COALESCE(MAX(ts.created_at), '1970-01-01'::timestamptz),
        COALESCE(MAX(cr.registered_at), '1970-01-01'::timestamptz)
      ) as last_activity
    FROM profiles p
    LEFT JOIN training_sessions ts ON p.user_id = ts.user_id AND ts.status = 'completed'
    LEFT JOIN course_registrations cr ON p.user_id = cr.user_id AND cr.status IN ('registered', 'waitlisted')
    WHERE p.status = 'active'
      AND p.membership_type NOT IN ('Trainer', 'Administrator')
    GROUP BY p.user_id, p.display_name, p.first_name, p.last_name, p.email, p.access_code, p.membership_type, p.status
  LOOP
    v_last_activity := v_member.last_activity;

    IF v_last_activity <= NOW() - INTERVAL '21 days' THEN
      UPDATE profiles
      SET status = 'inactive'
      WHERE user_id = v_member.user_id;

      IF v_webhook_url IS NOT NULL AND v_webhook_url != '' THEN
        v_webhook_payload := jsonb_build_object(
          'event_type', 'member_inactive',
          'user_id', v_member.user_id,
          'display_name', v_member.display_name,
          'first_name', v_member.first_name,
          'last_name', v_member.last_name,
          'email', v_member.email,
          'access_code', v_member.access_code,
          'membership_type', v_member.membership_type,
          'days_inactive', EXTRACT(DAY FROM NOW() - v_last_activity),
          'last_activity', v_last_activity,
          'marked_inactive_at', NOW()
        );

        BEGIN
          PERFORM net.http_post(
            url := v_webhook_url,
            headers := '{"Content-Type":"application/json"}'::jsonb,
            body := v_webhook_payload::text
          );
          RAISE LOG 'Inactivity webhook sent for user_id=%', v_member.user_id;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to send inactivity webhook for user_id=%: %', v_member.user_id, SQLERRM;
        END;
      END IF;
    END IF;
  END LOOP;
END;
$function$;