-- Drei Korrekturen rund um die Storno-Rate
--
-- 1) Die 30-Sekunden-Schonfrist laesst sich nicht mehr missbrauchen
--    (weder durch Ab- und sofortiges Wiederanmelden noch durch direktes
--    Setzen der Felder ueber die API).
-- 2) Automatische Absagen wegen zu weniger Anmeldungen bekommen einen eigenen
--    Status und zaehlen nicht mehr als Storno des Mitglieds.
-- 3) Der Anmeldeschluss wird jetzt auch serverseitig geprueft - damit gilt er
--    auch beim Annehmen einer Kurseinladung.
--
-- Diese Datei ist bewusst so geschrieben, dass ein erneutes Ausfuehren nichts
-- kaputt macht: Spalten werden nur angelegt, wenn sie fehlen, und die
-- einmaligen Datenkorrekturen laufen nur, solange sie noch nicht gelaufen sind.

-- ---------------------------------------------------------------------------
-- 1) Schonfrist: generierte Spalte -> per Trigger gepflegte Spalten
-- ---------------------------------------------------------------------------

-- Die generierte Spalte konnte nur "Storno < 30 s nach registered_at" sehen.
-- Da registered_at bei einer erneuten Anmeldung neu gesetzt wird, liess sich
-- ein echtes Storno verstecken: abmelden -> sofort wieder anmelden -> innerhalb
-- von 30 s erneut abmelden. Deshalb merkt sich die Zeile jetzt, ob es fuer
-- diese Anmeldung schon einmal ein echtes Storno gab.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'course_registrations'
          AND column_name = 'is_accidental_cancel'
          AND is_generated = 'ALWAYS'
    ) THEN
        ALTER TABLE public.course_registrations DROP COLUMN is_accidental_cancel;
    END IF;
END $$;

ALTER TABLE public.course_registrations
  ADD COLUMN IF NOT EXISTS is_accidental_cancel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS had_real_cancel boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.course_registrations.is_accidental_cancel IS
  'Storno innerhalb von 30 s nach der Anmeldung - zaehlt nicht in die Storno-Rate. Wird ausschliesslich vom Trigger gesetzt.';
COMMENT ON COLUMN public.course_registrations.had_real_cancel IS
  'Es gab fuer diese Anmeldung bereits ein echtes Storno - danach greift die Schonfrist nicht mehr.';

-- ---------------------------------------------------------------------------
-- 2) Eigener Status fuer automatische Absagen
-- ---------------------------------------------------------------------------

ALTER TABLE public.course_registrations
  DROP CONSTRAINT IF EXISTS course_registrations_status_check;

ALTER TABLE public.course_registrations
  ADD CONSTRAINT course_registrations_status_check
  CHECK (status = ANY (ARRAY[
    'registered'::text,
    'waitlisted'::text,
    'cancelled'::text,
    'waitlist'::text,
    'waitlist_cancelled'::text,
    'admin_cancelled'::text,
    'rebooked'::text,
    'course_cancelled'::text
  ]));

-- Credits / Wochenlimit muessen auch beim neuen Status zurueckgegeben werden
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
-- Trigger: setzt die beiden Felder und schuetzt sie vor Manipulation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_accidental_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cancel_states CONSTANT text[] :=
        ARRAY['cancelled', 'waitlist_cancelled', 'admin_cancelled', 'rebooked', 'course_cancelled'];
BEGIN
    -- Beide Felder werden ausschliesslich hier gesetzt. Werte, die von aussen
    -- mitgeschickt werden, werden dadurch immer ueberschrieben.
    IF TG_OP = 'INSERT' THEN
        NEW.is_accidental_cancel := false;
        NEW.had_real_cancel := false;
        -- Ein in der Zukunft liegender Anmeldezeitpunkt wuerde die Schonfrist
        -- beliebig lang machen
        NEW.registered_at := LEAST(COALESCE(NEW.registered_at, now()), now());
        RETURN NEW;
    END IF;

    -- registered_at darf sich nur aendern, wenn man sich wirklich neu anmeldet
    -- (also aus einem Storno-Status heraus). Sonst liesse sich die Schonfrist
    -- durch Zuruecksetzen des Zeitstempels erschleichen.
    IF OLD.status = ANY (v_cancel_states)
       AND NEW.status IN ('registered', 'waitlist', 'waitlisted') THEN
        NEW.registered_at := LEAST(COALESCE(NEW.registered_at, now()), now());
    ELSE
        NEW.registered_at := OLD.registered_at;
    END IF;

    NEW.had_real_cancel := COALESCE(OLD.had_real_cancel, false);

    IF NEW.status = 'cancelled' AND COALESCE(OLD.status, '') <> 'cancelled' THEN
        -- Schonfrist gilt nur, solange es fuer diese Anmeldung noch kein
        -- echtes Storno gab
        NEW.is_accidental_cancel :=
            NOT NEW.had_real_cancel
            AND (now() - NEW.registered_at) < interval '30 seconds';

        NEW.had_real_cancel := NEW.had_real_cancel OR NOT NEW.is_accidental_cancel;

    ELSIF NEW.status = 'cancelled' THEN
        -- war schon storniert: Markierung unveraendert uebernehmen
        NEW.is_accidental_cancel := COALESCE(OLD.is_accidental_cancel, false);

    ELSE
        NEW.is_accidental_cancel := false;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS mark_accidental_cancellation_trigger ON public.course_registrations;

CREATE TRIGGER mark_accidental_cancellation_trigger
    BEFORE INSERT OR UPDATE ON public.course_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_accidental_cancellation();

CREATE INDEX IF NOT EXISTS idx_course_registrations_accidental
  ON public.course_registrations (user_id, is_accidental_cancel);

-- ---------------------------------------------------------------------------
-- Einmalige Datenkorrektur (laeuft nur beim ersten Mal)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.course_registrations
        WHERE had_real_cancel OR status = 'course_cancelled'
    ) THEN
        RAISE NOTICE 'Datenkorrektur wurde bereits ausgefuehrt - uebersprungen.';
        RETURN;
    END IF;

    -- updated_at soll dabei nicht ueberschrieben werden, sonst gehen die
    -- urspruenglichen Abmeldezeitpunkte verloren
    ALTER TABLE public.course_registrations DISABLE TRIGGER update_course_registrations_updated_at;
    ALTER TABLE public.course_registrations DISABLE TRIGGER mark_accidental_cancellation_trigger;

    -- a) Bisherige automatische Absagen umstellen. Erkennbar daran, dass die
    --    Zeile erst nach dem Anmeldeschluss des Kurses geaendert wurde - vorher
    --    kann der Cron-Job den Kurs nicht abgesagt haben.
    UPDATE public.course_registrations cr
    SET status = 'course_cancelled'
    FROM public.courses c
    WHERE c.id = cr.course_id
      AND c.cancelled_due_to_low_attendance = true
      AND cr.status = 'cancelled'
      AND cr.updated_at >= ((c.course_date + c.start_time)::timestamp AT TIME ZONE 'Europe/Berlin')
                            - make_interval(mins => c.registration_deadline_minutes);

    -- b) Schonfrist fuer die Vergangenheit so berechnen wie bisher
    UPDATE public.course_registrations
    SET is_accidental_cancel = true
    WHERE status = 'cancelled'
      AND (updated_at - registered_at) < interval '30 seconds';

    -- c) Wer schon ein echtes Storno hatte, bekommt fuer diesen Kurs keine
    --    Schonfrist mehr - auch rueckwirkend aus dem Audit-Log
    UPDATE public.course_registrations
    SET had_real_cancel = true
    WHERE status = 'cancelled'
      AND is_accidental_cancel = false;

    UPDATE public.course_registrations cr
    SET had_real_cancel = true
    FROM (
        SELECT DISTINCT (new_row->>'id')::uuid AS reg_id
        FROM public.registration_audit_log
        WHERE table_name = 'course_registrations'
          AND old_status = 'registered'
          AND new_status = 'cancelled'
          AND new_row ? 'registered_at'
          AND (created_at - (new_row->>'registered_at')::timestamptz) >= interval '30 seconds'
    ) rc
    WHERE cr.id = rc.reg_id
      AND cr.had_real_cancel = false;

    -- d) Schonfrist und "echtes Storno" schliessen sich aus
    UPDATE public.course_registrations
    SET is_accidental_cancel = false
    WHERE is_accidental_cancel = true
      AND had_real_cancel = true;

    ALTER TABLE public.course_registrations ENABLE TRIGGER mark_accidental_cancellation_trigger;
    ALTER TABLE public.course_registrations ENABLE TRIGGER update_course_registrations_updated_at;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Anmeldeschluss serverseitig pruefen
-- ---------------------------------------------------------------------------

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

        -- Kurse nach dem Gueltigkeitsende sind nicht buchbar
        IF v_valid_until IS NOT NULL AND course_date_val > v_valid_until::date THEN
            RETURN FALSE;
        END IF;

        RETURN COALESCE(user_credits, 0) > 0;
    ELSE
        RETURN TRUE;
    END IF;
END;
$function$;
