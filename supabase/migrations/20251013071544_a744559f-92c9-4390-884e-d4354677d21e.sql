-- Create function to get inactive members based on actual activity
CREATE OR REPLACE FUNCTION get_inactive_members(days_threshold INTEGER DEFAULT 21)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  membership_type TEXT,
  last_activity TIMESTAMPTZ,
  days_since_activity INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        COALESCE(MAX(cr.registered_at), '1970-01-01'::timestamptz),
        COALESCE(p.last_login_at, '1970-01-01'::timestamptz)
      ) as last_activity
    FROM profiles p
    LEFT JOIN training_sessions ts ON p.user_id = ts.user_id 
      AND ts.status = 'completed'
    LEFT JOIN course_registrations cr ON p.user_id = cr.user_id
      AND cr.status IN ('registered', 'waitlisted')
    WHERE p.status = 'active'
    GROUP BY p.user_id, p.display_name, p.first_name, p.last_name, p.membership_type, p.last_login_at
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
$$;