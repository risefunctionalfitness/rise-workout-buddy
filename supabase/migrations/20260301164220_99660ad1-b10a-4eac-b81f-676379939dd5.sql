
CREATE OR REPLACE FUNCTION public.get_user_reliability_score(p_user_id uuid)
RETURNS TABLE(
  score numeric,
  level integer,
  booking_window_days integer,
  total_bookings bigint,
  cancellations bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
  v_cancelled bigint;
  v_score numeric;
  v_level integer;
  v_window integer;
  v_is_privileged boolean;
BEGIN
  -- Check if user is admin or trainer (exempt from system)
  SELECT EXISTS(
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role IN ('admin', 'trainer')
  ) INTO v_is_privileged;

  IF v_is_privileged THEN
    RETURN QUERY SELECT 0::numeric, 1, 14, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  -- Count bookings in last 90 days (only courses that have already happened or are today)
  SELECT
    COUNT(*) FILTER (WHERE cr.status IN ('registered', 'cancelled')),
    COUNT(*) FILTER (WHERE cr.status = 'cancelled')
  INTO v_total, v_cancelled
  FROM course_registrations cr
  JOIN courses c ON cr.course_id = c.id
  WHERE cr.user_id = p_user_id
    AND c.course_date >= (CURRENT_DATE - INTERVAL '90 days')
    AND c.course_date <= CURRENT_DATE;

  -- Less than 5 bookings = Level 1
  IF v_total < 5 THEN
    RETURN QUERY SELECT 0::numeric, 1, 14, v_total, v_cancelled;
    RETURN;
  END IF;

  v_score := ROUND((v_cancelled::numeric / v_total::numeric) * 100, 1);

  -- Determine level
  IF v_score <= 15 THEN
    v_level := 1; v_window := 14;
  ELSIF v_score <= 25 THEN
    v_level := 2; v_window := 7;
  ELSIF v_score <= 35 THEN
    v_level := 3; v_window := 5;
  ELSE
    v_level := 4; v_window := 3;
  END IF;

  RETURN QUERY SELECT v_score, v_level, v_window, v_total, v_cancelled;
END;
$$;
