-- 10-Wochen-Karten: nur Kurse bei Flo buchbar
--
-- Das Merkmal wird beim Aufladen gesetzt (Kartentyp "10 Wochen" -> an,
-- "1 Jahr" -> aus). Bereits bestehende Karten behalten den Standardwert false
-- und laufen damit unveraendert weiter, bis sie das naechste Mal aufgeladen
-- werden. Der Haken laesst sich in der Admin-Ansicht pro Mitglied umschalten.
--
-- Geprueft wird nur im Moment der Anmeldung: wechselt der Coach spaeter,
-- bleibt eine bestehende Reservierung erhalten.

ALTER TABLE public.membership_credits
  ADD COLUMN IF NOT EXISTS flo_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.membership_credits.flo_only IS
  '10-Wochen-Karte: Mitglied kann nur Kurse buchen, die Flo gibt. Wird beim Aufladen gesetzt.';

-- Ein Kurs "bei Flo" - erkannt an der Trainer-Verknuepfung, ersatzweise am
-- Namen (im Kursplan steht teils "Flo", teils "Flo " mit Leerzeichen).
CREATE OR REPLACE FUNCTION public.is_flo_course(p_course_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
    SELECT c.trainer_user_id = '055a2fcd-6b5e-407a-b968-d8ccbb638aac'::uuid
           OR btrim(lower(c.trainer)) = 'flo'
    FROM public.courses c
    WHERE c.id = p_course_id
  ), false);
$function$;

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
    v_max_participants INTEGER;
    v_total_registered INTEGER;
    v_is_event BOOLEAN;
    v_valid_until TIMESTAMPTZ;
    v_card_type TEXT;
    v_start_time TIME;
    v_deadline_minutes INTEGER;
    v_flo_only BOOLEAN;
BEGIN
    SELECT ur.role::TEXT, p.membership_type
    INTO user_role, user_membership_type
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    WHERE ur.user_id = user_id_param
    LIMIT 1;

    SELECT c.course_date, c.title, c.max_participants, COALESCE(c.is_event, false),
           c.start_time, COALESCE(c.registration_deadline_minutes, 0)
    INTO course_date_val, course_title_val, v_max_participants, v_is_event,
         v_start_time, v_deadline_minutes
    FROM public.courses c
    WHERE c.id = course_id_param;

    -- Event-Kurse: fuer alle offen, keine Limit-/Credit-Pruefung und kein
    -- Anmeldeschluss (externe Gaeste buchen ueber die Edge Function, die
    -- ebenfalls keinen Anmeldeschluss kennt)
    IF v_is_event THEN
        RETURN TRUE;
    END IF;

    -- Admins und Trainer duerfen immer (auch nachtraeglich eintragen)
    IF user_role IN ('admin', 'trainer') THEN
        RETURN TRUE;
    END IF;

    -- Anmeldeschluss vorbei? Gilt fuer alle Wege in den Kurs, also auch fuer
    -- das Annehmen einer Kurseinladung.
    IF course_date_val IS NOT NULL
       AND ((course_date_val + v_start_time)::timestamp AT TIME ZONE 'Europe/Berlin')
           - make_interval(mins => v_deadline_minutes) <= now() THEN
        RETURN FALSE;
    END IF;

    SELECT
        (SELECT COUNT(*) FROM public.course_registrations WHERE course_id = course_id_param AND status = 'registered')
        + (SELECT COUNT(*) FROM public.guest_registrations WHERE course_id = course_id_param AND status = 'registered')
    INTO v_total_registered;

    IF user_membership_type = 'Basic Member' THEN
        week_start := course_date_val - ((EXTRACT(DOW FROM course_date_val)::INTEGER + 6) % 7);

        SELECT COUNT(*) INTO weekly_count
        FROM public.course_registrations cr
        JOIN public.courses c ON cr.course_id = c.id
        WHERE cr.user_id = user_id_param
          AND cr.status IN ('registered', 'waitlist')
          AND c.course_date >= week_start
          AND c.course_date < week_start + 7
          AND COALESCE(c.is_event, false) = false;

        RETURN weekly_count < 2;

    ELSIF user_membership_type = '10er Karte' THEN
        SELECT credits_remaining, valid_until, card_type, COALESCE(flo_only, false)
        INTO user_credits, v_valid_until, v_card_type, v_flo_only
        FROM public.membership_credits
        WHERE user_id = user_id_param;

        -- Karte abgelaufen: Restcredits verfallen (einmalig) und keine Buchung mehr
        IF v_valid_until IS NOT NULL AND v_valid_until < now() THEN
            IF COALESCE(user_credits, 0) > 0 THEN
                UPDATE public.membership_credits
                SET credits_remaining = 0,
                    updated_at = now()
                WHERE user_id = user_id_param;

                INSERT INTO public.credit_transactions
                    (user_id, amount, transaction_type, description, balance_after)
                VALUES
                    (user_id_param, -user_credits, 'expired',
                     '10er Karte abgelaufen - Restcredits verfallen', 0);
            END IF;
            RETURN FALSE;
        END IF;

        -- Kurse nach dem Gueltigkeitsende sind nicht buchbar
        IF v_valid_until IS NOT NULL AND course_date_val > v_valid_until::date THEN
            RETURN FALSE;
        END IF;

        -- 10-Wochen-Karte mit Flo-Bindung: nur Kurse bei Flo
        IF COALESCE(v_flo_only, false) AND NOT public.is_flo_course(course_id_param) THEN
            RETURN FALSE;
        END IF;

        RETURN COALESCE(user_credits, 0) > 0;
    ELSE
        RETURN TRUE;
    END IF;
END;
$function$;
