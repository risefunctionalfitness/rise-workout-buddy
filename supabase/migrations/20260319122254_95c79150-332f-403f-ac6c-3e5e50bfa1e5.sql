
-- 1. Add 'rebooked' to the CHECK constraint
ALTER TABLE public.course_registrations DROP CONSTRAINT course_registrations_status_check;
ALTER TABLE public.course_registrations ADD CONSTRAINT course_registrations_status_check 
  CHECK (status = ANY (ARRAY['registered','waitlisted','cancelled','waitlist','waitlist_cancelled','admin_cancelled','rebooked']));

-- 2. Update handle_membership_limits to treat 'rebooked' like 'cancelled' (refund credits/limits)
CREATE OR REPLACE FUNCTION public.handle_membership_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_membership_type TEXT;
    week_start DATE;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;
        
        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining - 1, updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        
        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start FROM public.courses WHERE id = NEW.course_id;
            
            INSERT INTO public.weekly_course_limits (user_id, week_start_date, registrations_count)
            VALUES (NEW.user_id, week_start, 1)
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET registrations_count = public.weekly_course_limits.registrations_count + 1, updated_at = now();
        END IF;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' AND OLD.status IN ('cancelled', 'waitlist_cancelled', 'admin_cancelled', 'rebooked') AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;
        
        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining - 1, updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        
        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start FROM public.courses WHERE id = NEW.course_id;
            
            INSERT INTO public.weekly_course_limits (user_id, week_start_date, registrations_count)
            VALUES (NEW.user_id, week_start, 1)
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET registrations_count = public.weekly_course_limits.registrations_count + 1, updated_at = now();
        END IF;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' AND OLD.status IN ('registered', 'waitlisted') AND NEW.status IN ('cancelled', 'waitlist_cancelled', 'admin_cancelled', 'rebooked') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;
        
        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining + 1, updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        
        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start FROM public.courses WHERE id = NEW.course_id;
            
            UPDATE public.weekly_course_limits
            SET registrations_count = GREATEST(0, registrations_count - 1), updated_at = now()
            WHERE user_id = NEW.user_id AND week_start_date = week_start;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Update process_waitlists_on_cancellation to also trigger on 'rebooked'
CREATE OR REPLACE FUNCTION public.process_waitlists_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_max_participants integer;
  v_total_registered integer;
  v_next_waitlist record;
BEGIN
  IF NEW.status IN ('cancelled', 'admin_cancelled', 'rebooked') AND (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'admin_cancelled', 'rebooked')) THEN
    v_course_id := NEW.course_id;
    
    SELECT max_participants INTO v_max_participants FROM courses WHERE id = v_course_id;
    
    SELECT 
      (SELECT COUNT(*) FROM course_registrations WHERE course_id = v_course_id AND status = 'registered')
      + (SELECT COUNT(*) FROM guest_registrations WHERE course_id = v_course_id AND status = 'registered')
    INTO v_total_registered;
    
    IF v_total_registered < v_max_participants THEN
      SELECT id, user_id INTO v_next_waitlist
      FROM course_registrations
      WHERE course_id = v_course_id AND status = 'waitlist'
      ORDER BY registered_at ASC LIMIT 1;
      
      IF v_next_waitlist IS NOT NULL THEN
        UPDATE course_registrations SET status = 'registered', updated_at = NOW() WHERE id = v_next_waitlist.id;
        
        INSERT INTO waitlist_promotion_events (user_id, course_id, registration_id, created_at)
        VALUES (v_next_waitlist.user_id, v_course_id, v_next_waitlist.id, NOW());
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
