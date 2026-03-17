
-- 1. Update can_user_register_for_course: remove the same-title duplicate check
CREATE OR REPLACE FUNCTION public.can_user_register_for_course(user_id_param uuid, course_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_role TEXT;
    user_membership_type TEXT;
    weekly_count INTEGER;
    user_credits INTEGER;
    course_date_val DATE;
    course_title_val TEXT;
    week_start DATE;
    v_max_participants INTEGER;
    v_total_registered INTEGER;
BEGIN
    -- Get user role and membership type
    SELECT ur.role::TEXT, p.membership_type
    INTO user_role, user_membership_type
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    WHERE ur.user_id = user_id_param
    LIMIT 1;
    
    -- Get course date, title, and max_participants
    SELECT c.course_date, c.title, c.max_participants
    INTO course_date_val, course_title_val, v_max_participants
    FROM public.courses c
    WHERE c.id = course_id_param;
    
    -- Admin and trainers can always register
    IF user_role IN ('admin', 'trainer') THEN
        RETURN TRUE;
    END IF;
    
    -- REMOVED: same-title duplicate check (now handled as frontend warning)
    
    -- Check total capacity including guest registrations
    SELECT 
        (SELECT COUNT(*) FROM public.course_registrations WHERE course_id = course_id_param AND status = 'registered')
        + (SELECT COUNT(*) FROM public.guest_registrations WHERE course_id = course_id_param AND status = 'registered')
    INTO v_total_registered;
    
    -- Check based on membership type
    IF user_membership_type = 'Basic Member' THEN
        -- Calculate week start (Monday)
        week_start := course_date_val - ((EXTRACT(DOW FROM course_date_val)::INTEGER + 6) % 7);
        
        -- Count registrations for the current week
        SELECT COUNT(*) INTO weekly_count
        FROM public.course_registrations cr
        JOIN public.courses c ON cr.course_id = c.id
        WHERE cr.user_id = user_id_param
          AND cr.status IN ('registered', 'waitlist')
          AND c.course_date >= week_start
          AND c.course_date < week_start + 7;
        
        RETURN weekly_count < 2;
        
    ELSIF user_membership_type = '10er Karte' THEN
        -- Read credits from membership_credits table
        SELECT credits_remaining INTO user_credits
        FROM public.membership_credits
        WHERE user_id = user_id_param;
        
        RETURN COALESCE(user_credits, 0) > 0;
    ELSE
        -- All other membership types can register freely
        RETURN TRUE;
    END IF;
END;
$function$;

-- 2. Update handle_membership_limits to also handle waitlist_cancelled status
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
        SELECT membership_type INTO user_membership_type
        FROM public.profiles
        WHERE user_id = NEW.user_id;
        
        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining - 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        
        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start
            FROM public.courses
            WHERE id = NEW.course_id;
            
            INSERT INTO public.weekly_course_limits (user_id, week_start_date, registrations_count)
            VALUES (NEW.user_id, week_start, 1)
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET 
                registrations_count = public.weekly_course_limits.registrations_count + 1,
                updated_at = now();
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle reactivations (UPDATE from cancelled/waitlist_cancelled to registered/waitlisted)
    IF TG_OP = 'UPDATE' AND OLD.status IN ('cancelled', 'waitlist_cancelled') AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles
        WHERE user_id = NEW.user_id;
        
        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining - 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        
        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start
            FROM public.courses
            WHERE id = NEW.course_id;
            
            INSERT INTO public.weekly_course_limits (user_id, week_start_date, registrations_count)
            VALUES (NEW.user_id, week_start, 1)
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET 
                registrations_count = public.weekly_course_limits.registrations_count + 1,
                updated_at = now();
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle cancellations (UPDATE to cancelled or waitlist_cancelled status)
    IF TG_OP = 'UPDATE' AND OLD.status IN ('registered', 'waitlisted') AND NEW.status IN ('cancelled', 'waitlist_cancelled') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles
        WHERE user_id = NEW.user_id;
        
        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining + 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        
        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start
            FROM public.courses
            WHERE id = NEW.course_id;
            
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
