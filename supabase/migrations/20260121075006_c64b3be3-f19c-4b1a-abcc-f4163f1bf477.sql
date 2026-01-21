CREATE OR REPLACE FUNCTION public.can_user_register_for_course(user_id_param UUID, course_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_membership_type TEXT;
    weekly_count INTEGER;
    user_credits INTEGER;
    course_date_val DATE;
    course_title_val TEXT;
    week_start DATE;
    existing_same_title INTEGER;
BEGIN
    -- Get user role and membership type
    SELECT ur.role::TEXT, p.membership_type
    INTO user_role, user_membership_type
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    WHERE ur.user_id = user_id_param
    LIMIT 1;
    
    -- Get course date and title
    SELECT c.course_date, c.title 
    INTO course_date_val, course_title_val
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
        -- FIX: Read credits from membership_credits table, not profiles
        SELECT credits_remaining INTO user_credits
        FROM public.membership_credits
        WHERE user_id = user_id_param;
        
        RETURN COALESCE(user_credits, 0) > 0;
    ELSE
        -- All other membership types can register freely
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;