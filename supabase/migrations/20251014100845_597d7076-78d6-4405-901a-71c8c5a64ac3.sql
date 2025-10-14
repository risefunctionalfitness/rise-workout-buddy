-- Extend handle_membership_limits to handle reactivations (UPDATE from cancelled to registered/waitlisted)
CREATE OR REPLACE FUNCTION public.handle_membership_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    user_membership_type TEXT;
    week_start DATE;
BEGIN
    -- Handle new registrations (INSERT)
    IF TG_OP = 'INSERT' AND NEW.status IN ('registered', 'waitlisted') THEN
        -- Get user's membership type
        SELECT membership_type INTO user_membership_type
        FROM public.profiles
        WHERE user_id = NEW.user_id;
        
        -- Handle 10er Karte credit deduction
        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining - 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        
        -- Handle Basic Member weekly tracking
        IF user_membership_type = 'Basic Member' THEN
            -- Calculate week start (Monday)
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start
            FROM public.courses
            WHERE id = NEW.course_id;
            
            -- Insert or update weekly limit tracking
            INSERT INTO public.weekly_course_limits (user_id, week_start_date, registrations_count)
            VALUES (NEW.user_id, week_start, 1)
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET 
                registrations_count = public.weekly_course_limits.registrations_count + 1,
                updated_at = now();
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle reactivations (UPDATE from cancelled to registered/waitlisted)
    IF TG_OP = 'UPDATE' AND OLD.status = 'cancelled' AND NEW.status IN ('registered', 'waitlisted') THEN
        -- Get user's membership type
        SELECT membership_type INTO user_membership_type
        FROM public.profiles
        WHERE user_id = NEW.user_id;
        
        -- Handle 10er Karte credit deduction
        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining - 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        
        -- Handle Basic Member weekly tracking
        IF user_membership_type = 'Basic Member' THEN
            -- Calculate week start (Monday)
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start
            FROM public.courses
            WHERE id = NEW.course_id;
            
            -- Insert or update weekly limit tracking
            INSERT INTO public.weekly_course_limits (user_id, week_start_date, registrations_count)
            VALUES (NEW.user_id, week_start, 1)
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET 
                registrations_count = public.weekly_course_limits.registrations_count + 1,
                updated_at = now();
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle cancellations (UPDATE to cancelled status)
    IF TG_OP = 'UPDATE' AND OLD.status IN ('registered', 'waitlisted') AND NEW.status = 'cancelled' THEN
        -- Get user's membership type
        SELECT membership_type INTO user_membership_type
        FROM public.profiles
        WHERE user_id = NEW.user_id;
        
        -- Restore 10er Karte credit
        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining + 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        
        -- Restore Basic Member weekly count
        IF user_membership_type = 'Basic Member' THEN
            -- Calculate week start (Monday)
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start
            FROM public.courses
            WHERE id = NEW.course_id;
            
            -- Decrease weekly count
            UPDATE public.weekly_course_limits
            SET registrations_count = GREATEST(0, registrations_count - 1),
                updated_at = now()
            WHERE user_id = NEW.user_id AND week_start_date = week_start;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- For all other cases, just return the row
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Fix credits for affected users
-- This calculates the correct number of credits based on active registrations
WITH credit_fixes AS (
  SELECT 
    mc.user_id,
    p.display_name,
    mc.credits_remaining,
    mc.credits_total,
    COUNT(cr.id) FILTER (WHERE cr.status IN ('registered', 'waitlisted')) as active_registrations,
    (mc.credits_total - mc.credits_remaining) as credits_used,
    COUNT(cr.id) FILTER (WHERE cr.status IN ('registered', 'waitlisted')) - (mc.credits_total - mc.credits_remaining) as credits_to_deduct
  FROM public.membership_credits mc
  JOIN public.profiles p ON mc.user_id = p.user_id
  LEFT JOIN public.course_registrations cr ON mc.user_id = cr.user_id
  WHERE p.membership_type = '10er Karte'
  GROUP BY mc.user_id, p.display_name, mc.credits_remaining, mc.credits_total
  HAVING COUNT(cr.id) FILTER (WHERE cr.status IN ('registered', 'waitlisted')) != (mc.credits_total - mc.credits_remaining)
)
UPDATE public.membership_credits mc
SET credits_remaining = mc.credits_remaining - cf.credits_to_deduct,
    updated_at = now()
FROM credit_fixes cf
WHERE mc.user_id = cf.user_id
  AND cf.credits_to_deduct > 0;