-- Option B: Nur echte Gym-Aktivität zählt (Kursanmeldungen + Open Gym Check-ins)
-- KEIN last_login_at mehr!

-- 1. Update get_inactive_members() - entferne last_login_at
CREATE OR REPLACE FUNCTION public.get_inactive_members(days_threshold integer DEFAULT 21)
RETURNS TABLE(user_id uuid, display_name text, first_name text, last_name text, membership_type text, last_activity timestamp with time zone, days_since_activity integer)
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
      GREATEST(
        COALESCE(MAX(ts.created_at), '1970-01-01'::timestamptz),
        COALESCE(MAX(cr.registered_at), '1970-01-01'::timestamptz)
        -- KEIN last_login_at - nur echte Gym-Aktivität!
      ) as last_activity
    FROM profiles p
    LEFT JOIN training_sessions ts ON p.user_id = ts.user_id 
      AND ts.status = 'completed'
    LEFT JOIN course_registrations cr ON p.user_id = cr.user_id
      AND cr.status IN ('registered', 'waitlisted')
    WHERE p.status = 'active'
    GROUP BY p.user_id, p.display_name, p.first_name, p.last_name, p.membership_type
  )
  SELECT 
    ua.user_id,
    ua.display_name,
    ua.first_name,
    ua.last_name,
    ua.membership_type,
    ua.last_activity,
    EXTRACT(DAY FROM NOW() - ua.last_activity)::INTEGER as days_since_activity
  FROM user_activities ua
  WHERE ua.last_activity < NOW() - (days_threshold || ' days')::INTERVAL
  ORDER BY ua.last_activity ASC NULLS FIRST;
END;
$function$;

-- 2. Update update_member_status() - entferne last_login_at
CREATE OR REPLACE FUNCTION public.update_member_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
        COALESCE(MAX(cr.registered_at), '1970-01-01'::timestamptz)
        -- KEIN last_login_at - nur echte Gym-Aktivität!
      ) as last_activity
    FROM public.profiles p
    LEFT JOIN public.training_sessions ts ON p.user_id = ts.user_id 
      AND ts.status = 'completed'
    LEFT JOIN public.course_registrations cr ON p.user_id = cr.user_id
      AND cr.status IN ('registered', 'waitlisted')
    WHERE p.status = 'active'
    GROUP BY p.user_id, p.display_name, p.first_name, p.last_name, p.email, p.access_code, p.membership_type, p.status
  LOOP
    -- Check if member has been inactive for 21+ days
    IF v_member.last_activity < NOW() - INTERVAL '21 days' THEN
      -- Update status to inactive
      UPDATE public.profiles 
      SET status = 'inactive'
      WHERE user_id = v_member.user_id;
      
      -- Send webhook notification
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
$function$;

-- 3. MANUELLER BEREINIGUNGSLAUF - Sofort ausführen!
DO $$
DECLARE
  v_member RECORD;
  v_updated_to_active INTEGER := 0;
  v_updated_to_inactive INTEGER := 0;
  v_last_activity TIMESTAMPTZ;
BEGIN
  RAISE NOTICE 'Starting manual cleanup of member status...';
  
  FOR v_member IN 
    SELECT 
      p.user_id,
      p.status as current_status,
      p.display_name,
      GREATEST(
        COALESCE(MAX(ts.created_at), '1970-01-01'::timestamptz),
        COALESCE(MAX(cr.registered_at), '1970-01-01'::timestamptz)
        -- KEIN last_login_at - nur echte Gym-Aktivität!
      ) as last_activity
    FROM public.profiles p
    LEFT JOIN public.training_sessions ts ON p.user_id = ts.user_id 
      AND ts.status = 'completed'
    LEFT JOIN public.course_registrations cr ON p.user_id = cr.user_id
      AND cr.status IN ('registered', 'waitlisted')
    GROUP BY p.user_id, p.status, p.display_name
  LOOP
    -- Inaktiv wenn letzte Aktivität > 21 Tage
    IF v_member.last_activity < NOW() - INTERVAL '21 days' THEN
      IF v_member.current_status != 'inactive' THEN
        UPDATE public.profiles
        SET status = 'inactive'
        WHERE user_id = v_member.user_id;
        v_updated_to_inactive := v_updated_to_inactive + 1;
        
        RAISE LOG 'Set to inactive: user_id=%, name=%, last_activity=%, days=%', 
          v_member.user_id, v_member.display_name, v_member.last_activity,
          EXTRACT(DAY FROM NOW() - v_member.last_activity)::INTEGER;
      END IF;
    ELSE
      -- Aktiv wenn Aktivität innerhalb 21 Tage
      IF v_member.current_status != 'active' THEN
        UPDATE public.profiles
        SET status = 'active'
        WHERE user_id = v_member.user_id;
        v_updated_to_active := v_updated_to_active + 1;
        
        RAISE LOG 'Set to active: user_id=%, name=%, last_activity=%, days=%', 
          v_member.user_id, v_member.display_name, v_member.last_activity,
          EXTRACT(DAY FROM NOW() - v_member.last_activity)::INTEGER;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Manual cleanup completed: % set to active, % set to inactive', 
    v_updated_to_active, v_updated_to_inactive;
END;
$$;