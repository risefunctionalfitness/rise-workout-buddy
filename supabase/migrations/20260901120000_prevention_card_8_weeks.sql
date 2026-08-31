-- Aus der "10 Wochen"-Karte wird die "Präventionskurs 10er Karte" mit
-- 8 Wochen Gueltigkeit.
--
-- Hintergrund: Auf dem Formular der Krankenkasse stehen 8 Wochen, also muss
-- die Karte auch 8 Wochen laufen.
--
-- Bestehende Karten sind nicht betroffen: Bei allen sechs laufenden Karten ist
-- valid_until bereits gesetzt, und die Berechnung greift nur, solange das Feld
-- leer ist (COALESCE). Sie behalten also ihre 10 Wochen.
--
-- Der gespeicherte Wert heisst jetzt 'prevention'. Der alte Wert 'ten_weeks'
-- wird weiterhin akzeptiert, damit nichts bricht, falls irgendwo noch die
-- alte Schreibweise ankommt.

ALTER TABLE public.membership_credits
  DROP CONSTRAINT IF EXISTS membership_credits_card_type_check;

ALTER TABLE public.membership_credits
  ADD CONSTRAINT membership_credits_card_type_check
  CHECK (card_type = ANY (ARRAY['year'::text, 'ten_weeks'::text, 'prevention'::text]));

COMMENT ON COLUMN public.membership_credits.card_type IS
  'year = 1 Jahr gueltig, prevention = Praeventionskurs 10er Karte (8 Wochen). ten_weeks ist der alte Name der Praeventionskarte und wird weiterhin akzeptiert.';

-- Bestehende Karten umbenennen; ihre Gueltigkeit bleibt unveraendert
UPDATE public.membership_credits
SET card_type = 'prevention'
WHERE card_type = 'ten_weeks';

-- ---------------------------------------------------------------------------
-- Gueltigkeit: 8 Wochen ab dem ersten Training
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_membership_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_membership_type TEXT;
    week_start DATE;
    v_is_event BOOLEAN := false;
    v_course_date DATE;
BEGIN
    -- 0) Kursdaten einmalig holen; Event-Kurse fassen nichts an
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        SELECT COALESCE(c.is_event, false), c.course_date
        INTO v_is_event, v_course_date
        FROM public.courses c
        WHERE c.id = NEW.course_id;

        IF v_is_event THEN
            RETURN NEW;
        END IF;
    END IF;

    -- 1) INSERT: nur 'registered' zieht ab
    IF TG_OP = 'INSERT' AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                validity_start = COALESCE(validity_start, v_course_date::timestamptz),
                valid_until = COALESCE(valid_until,
                    ((v_course_date + CASE
                        WHEN card_type IN ('prevention', 'ten_weeks') THEN interval '8 weeks'
                        ELSE interval '1 year'
                    END)::date + time '23:59:59')::timestamptz),
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;

        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start FROM public.courses WHERE id = NEW.course_id;

            INSERT INTO public.weekly_course_limits (user_id, week_start_date, registrations_count)
            VALUES (NEW.user_id, week_start, 1)
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET registrations_count = public.weekly_course_limits.registrations_count + 1,
                          updated_at = now();
        END IF;
        RETURN NEW;
    END IF;

    -- 2) Re-Aktivierung aus Storno-Status
    IF TG_OP = 'UPDATE'
       AND OLD.status IN ('cancelled', 'waitlist_cancelled', 'admin_cancelled', 'rebooked', 'course_cancelled')
       AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                validity_start = COALESCE(validity_start, v_course_date::timestamptz),
                valid_until = COALESCE(valid_until,
                    ((v_course_date + CASE
                        WHEN card_type IN ('prevention', 'ten_weeks') THEN interval '8 weeks'
                        ELSE interval '1 year'
                    END)::date + time '23:59:59')::timestamptz),
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;

        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start FROM public.courses WHERE id = NEW.course_id;

            INSERT INTO public.weekly_course_limits (user_id, week_start_date, registrations_count)
            VALUES (NEW.user_id, week_start, 1)
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET registrations_count = public.weekly_course_limits.registrations_count + 1,
                          updated_at = now();
        END IF;
        RETURN NEW;
    END IF;

    -- 3) Promotion von Warteliste -> registriert
    IF TG_OP = 'UPDATE'
       AND OLD.status IN ('waitlist', 'waitlisted')
       AND NEW.status = 'registered' THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                validity_start = COALESCE(validity_start, v_course_date::timestamptz),
                valid_until = COALESCE(valid_until,
                    ((v_course_date + CASE
                        WHEN card_type IN ('prevention', 'ten_weeks') THEN interval '8 weeks'
                        ELSE interval '1 year'
                    END)::date + time '23:59:59')::timestamptz),
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;

        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start FROM public.courses WHERE id = NEW.course_id;

            INSERT INTO public.weekly_course_limits (user_id, week_start_date, registrations_count)
            VALUES (NEW.user_id, week_start, 1)
            ON CONFLICT (user_id, week_start_date)
            DO UPDATE SET registrations_count = public.weekly_course_limits.registrations_count + 1,
                          updated_at = now();
        END IF;
        RETURN NEW;
    END IF;

    -- 4) Storno aus 'registered' -> Refund
    IF TG_OP = 'UPDATE'
       AND OLD.status = 'registered'
       AND NEW.status IN ('cancelled', 'waitlist_cancelled', 'admin_cancelled', 'rebooked', 'course_cancelled') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining + 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;

        IF user_membership_type = 'Basic Member' THEN
            SELECT course_date - EXTRACT(DOW FROM course_date)::INTEGER + 1
            INTO week_start FROM public.courses WHERE id = NEW.course_id;

            UPDATE public.weekly_course_limits
            SET registrations_count = GREATEST(0, registrations_count - 1),
                updated_at = now()
            WHERE user_id = NEW.user_id AND week_start_date = week_start;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Storno-Ausnahme gilt weiterhin fuer die Praeventionskarte
-- ---------------------------------------------------------------------------

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
  v_prevention boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN QUERY SELECT 0::numeric, 1, 14, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  -- Praeventionskurs-Karte: volles Buchungsfenster, unabhaengig von der
  -- Storno-Rate
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN membership_credits mc ON mc.user_id = p.user_id
    WHERE p.user_id = p_user_id
      AND p.membership_type = '10er Karte'
      AND mc.card_type IN ('prevention', 'ten_weeks')
  ) INTO v_prevention;

  IF v_prevention THEN
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
