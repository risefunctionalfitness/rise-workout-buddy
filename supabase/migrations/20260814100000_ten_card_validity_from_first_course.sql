-- =====================================================================
-- 10er Karte: Die Gültigkeit startet mit dem DATUM DES ERSTEN TRAININGS
-- (vorher: mit dem Zeitpunkt der Anmeldung).
-- Beispiel: Anmeldung am 01.09. für einen Kurs am 25.09., 10-Wochen-Karte
--           -> gültig vom 25.09. bis 04.12. (10 Wochen ab dem Kurs).
-- Die Karte ist am letzten Gültigkeitstag noch den ganzen Tag nutzbar.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_membership_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
                        WHEN card_type = 'ten_weeks' THEN interval '10 weeks'
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
       AND OLD.status IN ('cancelled', 'waitlist_cancelled', 'admin_cancelled', 'rebooked')
       AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                validity_start = COALESCE(validity_start, v_course_date::timestamptz),
                valid_until = COALESCE(valid_until,
                    ((v_course_date + CASE
                        WHEN card_type = 'ten_weeks' THEN interval '10 weeks'
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
                        WHEN card_type = 'ten_weeks' THEN interval '10 weeks'
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
       AND NEW.status IN ('cancelled', 'waitlist_cancelled', 'admin_cancelled', 'rebooked') THEN
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
$$;

-- can_user_register_for_course: die Vorab-Prüfung "Kurs liegt außerhalb des
-- künftigen Gültigkeitsfensters" entfällt -- die Gültigkeit startet ja jetzt
-- genau mit diesem ersten Kurs.
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
BEGIN
    SELECT ur.role::TEXT, p.membership_type
    INTO user_role, user_membership_type
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    WHERE ur.user_id = user_id_param
    LIMIT 1;

    SELECT c.course_date, c.title, c.max_participants, COALESCE(c.is_event, false)
    INTO course_date_val, course_title_val, v_max_participants, v_is_event
    FROM public.courses c
    WHERE c.id = course_id_param;

    -- Event-Kurse: für alle offen, keine Limit-/Credit-Prüfung
    IF v_is_event THEN
        RETURN TRUE;
    END IF;

    IF user_role IN ('admin', 'trainer') THEN
        RETURN TRUE;
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
        SELECT credits_remaining, valid_until, card_type
        INTO user_credits, v_valid_until, v_card_type
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

        -- Kurse nach dem Gültigkeitsende sind nicht buchbar
        IF v_valid_until IS NOT NULL AND course_date_val > v_valid_until::date THEN
            RETURN FALSE;
        END IF;

        RETURN COALESCE(user_credits, 0) > 0;
    ELSE
        RETURN TRUE;
    END IF;
END;
$function$;
