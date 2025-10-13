-- Fix get_inactive_members to show members marked as 'inactive'
CREATE OR REPLACE FUNCTION public.get_inactive_members(days_threshold integer DEFAULT 21)
RETURNS TABLE(
  user_id uuid, 
  display_name text, 
  first_name text, 
  last_name text, 
  membership_type text, 
  last_activity timestamp with time zone, 
  days_since_activity integer
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
    WHERE p.status = 'inactive'
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
  ORDER BY ua.last_activity ASC NULLS FIRST;
END;
$function$;