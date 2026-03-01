
-- Add column to track one-time fairness score reset
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS fairness_score_reset_at timestamptz DEFAULT NULL;

-- Update the reliability score function to respect the reset timestamp
CREATE OR REPLACE FUNCTION public.get_user_reliability_score(p_user_id uuid)
RETURNS TABLE(score numeric, level integer, booking_window_days integer, total_bookings bigint, cancellations bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_cancelled bigint;
  v_score numeric;
  v_level integer;
  v_window integer;
  v_is_admin boolean;
  v_reset_at timestamptz;
BEGIN
  -- Check if user is admin (admins are exempt)
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN QUERY SELECT 0::numeric, 1, 14, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  -- Get reset timestamp if any
  SELECT fairness_score_reset_at INTO v_reset_at
  FROM profiles
  WHERE profiles.user_id = p_user_id;

  -- Count total bookings and cancellations, respecting reset timestamp
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_total, v_cancelled
  FROM course_registrations
  WHERE user_id = p_user_id
    AND registered_at >= GREATEST(NOW() - INTERVAL '90 days', COALESCE(v_reset_at, '1970-01-01'::timestamptz))
    AND status IN ('registered', 'cancelled');

  -- Under 5 bookings = automatic Level 1
  IF v_total < 5 THEN
    RETURN QUERY SELECT 0::numeric, 1, 14, v_total, v_cancelled;
    RETURN;
  END IF;

  v_score := (v_cancelled::numeric / v_total::numeric) * 100;

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
