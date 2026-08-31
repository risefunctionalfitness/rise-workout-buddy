-- 10-Wochen-Karten: keine Einschraenkung durch die Storno-Rate
--
-- Wer eine 10-Wochen-Karte hat, hat nur ein kurzes Zeitfenster, um seine
-- Credits zu nutzen. Ein durch die Storno-Rate verkuerztes Buchungsfenster
-- wuerde das zusaetzlich erschweren. Diese Mitglieder duerfen deshalb immer
-- 14 Tage im Voraus buchen - begrenzt allein durch die Gueltigkeit ihrer Karte,
-- die weiterhin in can_user_register_for_course geprueft wird.

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
  v_ten_weeks boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN QUERY SELECT 0::numeric, 1, 14, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  -- 10-Wochen-Karte: volles Buchungsfenster, unabhaengig von der Storno-Rate
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN membership_credits mc ON mc.user_id = p.user_id
    WHERE p.user_id = p_user_id
      AND p.membership_type = '10er Karte'
      AND mc.card_type = 'ten_weeks'
  ) INTO v_ten_weeks;

  IF v_ten_weeks THEN
    RETURN QUERY SELECT 0::numeric, 1, 14, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT fairness_score_reset_at INTO v_reset_at
  FROM profiles
  WHERE profiles.user_id = p_user_id;

  -- Versehentliche Anmeldungen (Storno innerhalb von 30 s) zaehlen weder
  -- als Buchung noch als Stornierung
  SELECT
    COUNT(*) FILTER (WHERE status = 'registered' OR status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_total, v_cancelled
  FROM course_registrations
  WHERE user_id = p_user_id
    AND registered_at >= GREATEST(NOW() - INTERVAL '90 days', COALESCE(v_reset_at, '1970-01-01'::timestamptz))
    AND status IN ('registered', 'cancelled')
    AND is_accidental_cancel = false;

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
