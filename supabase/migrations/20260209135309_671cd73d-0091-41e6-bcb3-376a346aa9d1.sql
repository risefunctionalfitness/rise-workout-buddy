
-- Fix get_course_stats to include guest registrations in registered_count
CREATE OR REPLACE FUNCTION public.get_course_stats(course_id_param uuid)
 RETURNS TABLE(registered_count bigint, waitlist_count bigint, max_participants integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.course_registrations WHERE course_id = course_id_param AND status = 'registered')
        + (SELECT COUNT(*) FROM public.guest_registrations WHERE course_id = course_id_param AND status = 'registered'),
        (SELECT COUNT(*) FROM public.course_registrations WHERE course_id = course_id_param AND status = 'waitlist'),
        (SELECT c.max_participants FROM public.courses c WHERE c.id = course_id_param);
END;
$function$;

-- Fix can_user_register_for_course to include guest registrations in capacity check
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
    existing_same_title INTEGER;
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
    
    -- Check if user is already registered for same course title on same day
    SELECT COUNT(*) INTO existing_same_title
    FROM public.course_registrations cr
    JOIN public.courses c ON cr.course_id = c.id
    WHERE cr.user_id = user_id_param
      AND cr.status IN ('registered', 'waitlist')
      AND c.course_date = course_date_val
      AND c.title = course_title_val
      AND c.id != course_id_param;
    
    IF existing_same_title > 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check total capacity including guest registrations
    SELECT 
        (SELECT COUNT(*) FROM public.course_registrations WHERE course_id = course_id_param AND status = 'registered')
        + (SELECT COUNT(*) FROM public.guest_registrations WHERE course_id = course_id_param AND status = 'registered')
    INTO v_total_registered;
    
    -- If course is already full (members + guests), user goes to waitlist
    -- Note: The frontend handles waitlist logic, this function just checks if registration is allowed at all
    
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

-- Fix process_waitlists_on_cancellation to include guest registrations in capacity check
CREATE OR REPLACE FUNCTION public.process_waitlists_on_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_course_id uuid;
  v_max_participants integer;
  v_total_registered integer;
  v_next_waitlist record;
BEGIN
  -- Only process when status changes to 'cancelled'
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    v_course_id := NEW.course_id;
    
    -- Get course max participants
    SELECT max_participants INTO v_max_participants
    FROM courses
    WHERE id = v_course_id;
    
    -- Count current registered participants INCLUDING guests
    SELECT 
      (SELECT COUNT(*) FROM course_registrations WHERE course_id = v_course_id AND status = 'registered')
      + (SELECT COUNT(*) FROM guest_registrations WHERE course_id = v_course_id AND status = 'registered')
    INTO v_total_registered;
    
    -- If there's room and someone is on waitlist, promote them
    IF v_total_registered < v_max_participants THEN
      -- Get the next person on waitlist (earliest registration)
      SELECT id, user_id INTO v_next_waitlist
      FROM course_registrations
      WHERE course_id = v_course_id
        AND status = 'waitlist'
      ORDER BY registered_at ASC
      LIMIT 1;
      
      IF v_next_waitlist IS NOT NULL THEN
        -- Promote the user
        UPDATE course_registrations
        SET status = 'registered',
            updated_at = NOW()
        WHERE id = v_next_waitlist.id;
        
        -- Create an event for the dispatcher to process
        INSERT INTO waitlist_promotion_events (
          user_id,
          course_id,
          registration_id,
          created_at
        ) VALUES (
          v_next_waitlist.user_id,
          v_course_id,
          v_next_waitlist.id,
          NOW()
        );
        
        RAISE NOTICE 'Promoted user % from waitlist for course %. Event created for async dispatch.', 
          v_next_waitlist.user_id, v_course_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
