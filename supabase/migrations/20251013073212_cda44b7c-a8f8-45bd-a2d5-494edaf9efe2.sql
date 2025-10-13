-- Step 1: Improve update_member_status() to check actual activity and send webhook
CREATE OR REPLACE FUNCTION public.update_member_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_member RECORD;
  v_webhook_url TEXT;
  v_webhook_payload JSONB;
  v_last_activity TIMESTAMPTZ;
BEGIN
  -- Get webhook URL
  v_webhook_url := current_setting('app.settings.make_main_webhook_url', true);
  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    v_webhook_url := current_setting('app.settings.MAKE_MAIN_WEBHOOK_URL', true);
  END IF;

  -- Process each active member
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
        COALESCE(MAX(cr.registered_at), '1970-01-01'::timestamptz),
        COALESCE(p.last_login_at, '1970-01-01'::timestamptz)
      ) as last_activity
    FROM public.profiles p
    LEFT JOIN public.training_sessions ts ON p.user_id = ts.user_id 
      AND ts.status = 'completed'
    LEFT JOIN public.course_registrations cr ON p.user_id = cr.user_id
      AND cr.status IN ('registered', 'waitlisted')
    WHERE p.status = 'active'
    GROUP BY p.user_id, p.display_name, p.first_name, p.last_name, p.email, p.access_code, p.membership_type, p.status, p.last_login_at
  LOOP
    -- Check if member has been inactive for 21+ days
    IF v_member.last_activity < NOW() - INTERVAL '21 days' THEN
      -- Update status to inactive
      UPDATE public.profiles 
      SET status = 'inactive'
      WHERE user_id = v_member.user_id;
      
      -- Send webhook notification (same structure as registration)
      IF v_webhook_url IS NOT NULL AND v_webhook_url != '' THEN
        BEGIN
          v_webhook_payload := jsonb_build_object(
            'event_type', 'member_inactive',
            'name', COALESCE(
              v_member.first_name || ' ' || v_member.last_name,
              v_member.display_name,
              'Unbekannt'
            ),
            'email', COALESCE(v_member.email, ''),
            'access_code', COALESCE(v_member.access_code, ''),
            'membership_type', COALESCE(v_member.membership_type, 'Member'),
            'created_at', now()::text,
            'user_id', v_member.user_id,
            'days_inactive', EXTRACT(DAY FROM NOW() - v_member.last_activity)::INTEGER,
            'last_activity', v_member.last_activity::text
          );

          PERFORM net.http_post(
            url := v_webhook_url,
            headers := '{"Content-Type":"application/json"}'::jsonb,
            body := v_webhook_payload::text
          );
          
          RAISE LOG 'Inactivity webhook sent for user: % (inactive for % days)', 
            v_member.user_id, EXTRACT(DAY FROM NOW() - v_member.last_activity)::INTEGER;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to send inactivity webhook for user %: %', v_member.user_id, SQLERRM;
        END;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Step 2: Update update_last_login() to reactivate inactive members
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    last_login_at = now(),
    status = 'active'  -- Reactivate on login
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger to reactivate on course registration
CREATE OR REPLACE FUNCTION public.reactivate_member_on_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.status IN ('registered', 'waitlisted') THEN
    UPDATE public.profiles
    SET status = 'active'
    WHERE user_id = NEW.user_id AND status = 'inactive';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reactivate_on_course_registration ON public.course_registrations;
CREATE TRIGGER trigger_reactivate_on_course_registration
AFTER INSERT OR UPDATE ON public.course_registrations
FOR EACH ROW
EXECUTE FUNCTION public.reactivate_member_on_registration();

-- Step 4: Create trigger to reactivate on training session
CREATE OR REPLACE FUNCTION public.reactivate_member_on_training()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.profiles
    SET status = 'active'
    WHERE user_id = NEW.user_id AND status = 'inactive';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reactivate_on_training ON public.training_sessions;
CREATE TRIGGER trigger_reactivate_on_training
AFTER INSERT OR UPDATE ON public.training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.reactivate_member_on_training();

-- Step 5: Set up daily cron job (08:00 UTC)
SELECT cron.schedule(
  'check-inactive-members-daily',
  '0 8 * * *',
  $$
  SELECT public.update_member_status();
  $$
);