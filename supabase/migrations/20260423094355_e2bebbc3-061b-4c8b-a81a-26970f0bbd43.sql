CREATE OR REPLACE FUNCTION public.get_user_reliability_score(p_user_id uuid)
 RETURNS TABLE(score numeric, level integer, booking_window_days integer, total_bookings bigint, cancellations bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total bigint;
  v_cancelled bigint;
  v_score numeric;
  v_level integer;
  v_window integer;
  v_is_admin boolean;
  v_reset_at timestamptz;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN QUERY SELECT 0::numeric, 1, 14, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT fairness_score_reset_at INTO v_reset_at
  FROM profiles
  WHERE profiles.user_id = p_user_id;

  -- Count totals; ignore "accidental" cancellations (cancel within 5s of registering)
  SELECT
    COUNT(*) FILTER (
      WHERE status = 'registered'
         OR (status = 'cancelled' AND EXTRACT(EPOCH FROM (updated_at - registered_at)) >= 5)
    ),
    COUNT(*) FILTER (
      WHERE status = 'cancelled' AND EXTRACT(EPOCH FROM (updated_at - registered_at)) >= 5
    )
  INTO v_total, v_cancelled
  FROM course_registrations
  WHERE user_id = p_user_id
    AND registered_at >= GREATEST(NOW() - INTERVAL '90 days', COALESCE(v_reset_at, '1970-01-01'::timestamptz))
    AND status IN ('registered', 'cancelled');

  IF v_total < 4 THEN
    RETURN QUERY SELECT 0::numeric, 1, 14, v_total, v_cancelled;
    RETURN;
  END IF;

  v_score := (v_cancelled::numeric / v_total::numeric) * 100;

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
$function$;