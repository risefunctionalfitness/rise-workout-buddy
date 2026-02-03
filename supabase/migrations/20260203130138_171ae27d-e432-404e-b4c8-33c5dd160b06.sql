-- Drop the old function and recreate with correct webhook format
CREATE OR REPLACE FUNCTION public.process_waitlists_on_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  course_rec RECORD;
  waitlist_rec RECORD;
  profile_rec RECORD;
  user_email TEXT;
  current_registered_count INTEGER;
  notification_method TEXT;
  formatted_phone TEXT;
  wants_email BOOLEAN;
  wants_whatsapp BOOLEAN;
  webhook_url TEXT;
  webhook_payload JSONB;
BEGIN
  -- Only handle when status changes from registered/waitlist to cancelled
  IF OLD.status IN ('registered', 'waitlist') AND NEW.status = 'cancelled' THEN
    BEGIN
      -- Fetch course
      SELECT * INTO course_rec FROM public.courses WHERE id = NEW.course_id;

      IF FOUND THEN
        -- Count current registered
        SELECT COUNT(*) INTO current_registered_count
        FROM public.course_registrations
        WHERE course_id = NEW.course_id AND status = 'registered';

        -- If spot available and waitlist exists, promote earliest
        IF current_registered_count < course_rec.max_participants THEN
          SELECT * INTO waitlist_rec
          FROM public.course_registrations
          WHERE course_id = NEW.course_id AND status = 'waitlist'
          ORDER BY registered_at ASC
          LIMIT 1;

          IF FOUND THEN
            -- Promote
            UPDATE public.course_registrations
            SET status = 'registered',
                updated_at = now()
            WHERE id = waitlist_rec.id;

            -- Get profile with notification preferences
            SELECT 
              display_name, 
              first_name, 
              phone_country_code, 
              phone_number,
              COALESCE(notify_email_enabled, true) as notify_email_enabled,
              COALESCE(notify_whatsapp_enabled, false) as notify_whatsapp_enabled
            INTO profile_rec
            FROM public.profiles
            WHERE user_id = waitlist_rec.user_id;

            -- Get email from auth.users
            SELECT email INTO user_email
            FROM auth.users
            WHERE id = waitlist_rec.user_id;

            -- Calculate notification_method
            wants_email := COALESCE(profile_rec.notify_email_enabled, true);
            wants_whatsapp := profile_rec.notify_whatsapp_enabled 
                              AND profile_rec.phone_number IS NOT NULL;
            
            IF wants_email AND wants_whatsapp THEN
              notification_method := 'both';
            ELSIF wants_email THEN
              notification_method := 'email';
            ELSIF wants_whatsapp THEN
              notification_method := 'whatsapp';
            ELSE
              notification_method := 'none';
            END IF;

            -- Format phone (remove + and spaces)
            IF wants_whatsapp AND profile_rec.phone_number IS NOT NULL THEN
              formatted_phone := REPLACE(
                REPLACE(COALESCE(profile_rec.phone_country_code, '+49'), '+', ''), 
                ' ', ''
              ) || REPLACE(profile_rec.phone_number, ' ', '');
            ELSE
              formatted_phone := NULL;
            END IF;

            -- Build webhook payload matching AdminWebhookTester flat format
            webhook_payload := jsonb_build_object(
              'event_type', 'waitlist_promotion',
              'notification_method', notification_method,
              'phone', formatted_phone,
              'user_id', waitlist_rec.user_id,
              'display_name', COALESCE(profile_rec.display_name, 'Unbekannt'),
              'first_name', COALESCE(profile_rec.first_name, ''),
              'email', user_email,
              'course_title', course_rec.title,
              'course_date', course_rec.course_date,
              'course_time', SUBSTRING(course_rec.start_time::TEXT FROM 1 FOR 5),
              'trainer', COALESCE(course_rec.trainer, '')
            );

            -- Insert event with correct payload
            INSERT INTO public.waitlist_promotion_events 
              (registration_id, course_id, user_id, payload, notified_at)
            VALUES (
              waitlist_rec.id,
              NEW.course_id,
              waitlist_rec.user_id,
              webhook_payload,
              now()
            );

            -- Send webhook via pg_net
            BEGIN
              PERFORM net.http_post(
                url := 'https://hook.eu2.make.com/YOUR_WAITLIST_WEBHOOK_URL'::TEXT,
                headers := '{"Content-Type":"application/json"}'::jsonb,
                body := webhook_payload::TEXT
              );
            EXCEPTION WHEN OTHERS THEN
              RAISE WARNING 'Webhook failed: %', SQLERRM;
            END;

            RAISE LOG 'Waitlist promotion: user=%, course=%, method=%', 
                       waitlist_rec.user_id, NEW.course_id, notification_method;
          END IF;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing waitlist: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Also drop the old function that might be interfering
DROP FUNCTION IF EXISTS public.process_waitlists_with_notification() CASCADE;