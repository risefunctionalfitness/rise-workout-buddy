-- Fix get_course_stats to work for anonymous users in embed widgets
-- SECURITY DEFINER allows the function to bypass RLS and access course_registrations

CREATE OR REPLACE FUNCTION public.get_course_stats(course_id_param UUID)
RETURNS TABLE(
    registered_count BIGINT,
    waitlist_count BIGINT,
    max_participants INTEGER
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.course_registrations WHERE course_id = course_id_param AND status = 'registered'),
        (SELECT COUNT(*) FROM public.course_registrations WHERE course_id = course_id_param AND status = 'waitlist'),
        (SELECT c.max_participants FROM public.courses c WHERE c.id = course_id_param);
END;
$$;