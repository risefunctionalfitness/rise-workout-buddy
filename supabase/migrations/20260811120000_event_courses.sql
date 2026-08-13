-- =====================================================================
-- EVENT COURSES
-- A special course type that is open to everyone:
--   * Premium / Wellpass members: book as usual
--   * Basic members: booking does NOT count towards the 2 trainings/week
--   * 10er Karte: booking does NOT consume a credit (and cancelling
--     does NOT refund one)
--   * External guests: can register via a public link with name + email
--     (guest_registrations with booking_type = 'event')
-- Capacity checks and the member waitlist keep working unchanged.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. New columns on course_templates and courses
--    event_price: NULL = free for external guests,
--    otherwise price in EUR to be paid on site.
-- ---------------------------------------------------------------------
ALTER TABLE public.course_templates
  ADD COLUMN IF NOT EXISTS is_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_price numeric NULL,
  ADD COLUMN IF NOT EXISTS hide_participants boolean NOT NULL DEFAULT false;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_price numeric NULL,
  ADD COLUMN IF NOT EXISTS hide_participants boolean NOT NULL DEFAULT false;

-- hide_participants (only used for event courses): when true, members do
-- NOT see WHO is registered (names/avatars) in the app -- only the count.
-- Admins always see the full participant list.

-- ---------------------------------------------------------------------
-- 2. Allow 'event' as a guest booking type
-- ---------------------------------------------------------------------
ALTER TABLE public.guest_registrations
  DROP CONSTRAINT IF EXISTS guest_registrations_booking_type_check;

ALTER TABLE public.guest_registrations
  ADD CONSTRAINT guest_registrations_booking_type_check
  CHECK (booking_type IN ('drop_in', 'probetraining', 'event'));

-- ---------------------------------------------------------------------
-- 2b. 10er Karte: two card types with a validity period
--     * card_type: 'year' (1 Jahr) or 'ten_weeks' (10 Wochen)
--     * validity starts with the FIRST credit-consuming booking after a
--       recharge (validity_start / valid_until are set by the
--       handle_membership_limits trigger below; a recharge resets them)
--     * after valid_until, remaining credits are wiped and booking is
--       blocked (lazily enforced in can_user_register_for_course)
--     * prevention_course_1/2: informational flags for the admin
-- ---------------------------------------------------------------------
ALTER TABLE public.membership_credits
  ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'year',
  ADD COLUMN IF NOT EXISTS validity_start timestamptz NULL,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS prevention_course_1 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prevention_course_2 boolean NOT NULL DEFAULT false;

ALTER TABLE public.membership_credits
  DROP CONSTRAINT IF EXISTS membership_credits_card_type_check;

ALTER TABLE public.membership_credits
  ADD CONSTRAINT membership_credits_card_type_check
  CHECK (card_type IN ('year', 'ten_weeks'));

-- One credits row per member: deduplicate (keep the most recently
-- updated row), then enforce uniqueness. The whole app already treats
-- membership_credits as one-row-per-user.
DELETE FROM public.membership_credits mc
USING public.membership_credits mc2
WHERE mc.user_id = mc2.user_id
  AND mc.id <> mc2.id
  AND (mc.updated_at < mc2.updated_at
       OR (mc.updated_at = mc2.updated_at AND mc.id < mc2.id));

ALTER TABLE public.membership_credits
  DROP CONSTRAINT IF EXISTS membership_credits_user_id_unique;

ALTER TABLE public.membership_credits
  ADD CONSTRAINT membership_credits_user_id_unique UNIQUE (user_id);

-- ---------------------------------------------------------------------
-- 3. can_user_register_for_course:
--    * Event courses: everyone may register (no membership checks)
--    * Basic weekly count: event bookings no longer block the
--      2 regular trainings per week
-- ---------------------------------------------------------------------
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
    -- Get user role and membership type
    SELECT ur.role::TEXT, p.membership_type
    INTO user_role, user_membership_type
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    WHERE ur.user_id = user_id_param
    LIMIT 1;

    -- Get course date, title, max_participants and event flag
    SELECT c.course_date, c.title, c.max_participants, COALESCE(c.is_event, false)
    INTO course_date_val, course_title_val, v_max_participants, v_is_event
    FROM public.courses c
    WHERE c.id = course_id_param;

    -- Event courses are open to everyone: no limit or credit checks
    IF v_is_event THEN
        RETURN TRUE;
    END IF;

    -- Admin and trainers can always register
    IF user_role IN ('admin', 'trainer') THEN
        RETURN TRUE;
    END IF;

    -- Check total capacity including guest registrations
    SELECT
        (SELECT COUNT(*) FROM public.course_registrations WHERE course_id = course_id_param AND status = 'registered')
        + (SELECT COUNT(*) FROM public.guest_registrations WHERE course_id = course_id_param AND status = 'registered')
    INTO v_total_registered;

    -- Check based on membership type
    IF user_membership_type = 'Basic Member' THEN
        -- Calculate week start (Monday)
        week_start := course_date_val - ((EXTRACT(DOW FROM course_date_val)::INTEGER + 6) % 7);

        -- Count registrations for the current week (event courses excluded)
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
        -- Read credits and validity from membership_credits table
        SELECT credits_remaining, valid_until, card_type
        INTO user_credits, v_valid_until, v_card_type
        FROM public.membership_credits
        WHERE user_id = user_id_param;

        -- Card expired: wipe remaining credits (once) and block booking
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

        -- Courses that take place after the validity end cannot be booked
        IF v_valid_until IS NOT NULL AND course_date_val > v_valid_until::date THEN
            RETURN FALSE;
        END IF;

        -- Validity not started yet: it would start NOW with this booking,
        -- so the course must lie within the prospective validity window
        IF v_valid_until IS NULL AND course_date_val > (now() + CASE
            WHEN v_card_type = 'ten_weeks' THEN interval '10 weeks'
            ELSE interval '1 year'
        END)::date THEN
            RETURN FALSE;
        END IF;

        RETURN COALESCE(user_credits, 0) > 0;
    ELSE
        -- All other membership types can register freely
        RETURN TRUE;
    END IF;
END;
$function$;

-- ---------------------------------------------------------------------
-- 4. handle_membership_limits:
--    Event courses never touch credits or the weekly counter --
--    neither on booking, nor on reactivation, nor on waitlist
--    promotion, nor on cancellation (otherwise a 10er-Karte member
--    would wrongly GAIN a credit when cancelling an event booking).
--    Body is based on the latest version (20260423093545) with the
--    event short-circuit added at the top -- all existing branches
--    (incl. waitlist promotion, admin_cancelled/rebooked handling and
--    the GREATEST(0, ...) guards) are preserved unchanged.
-- ---------------------------------------------------------------------
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
BEGIN
    -- 0) Event-Kurse: weder Credits noch Wochenlimit anfassen
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        SELECT COALESCE(is_event, false) INTO v_is_event
        FROM public.courses
        WHERE id = NEW.course_id;

        IF v_is_event THEN
            RETURN NEW;
        END IF;
    END IF;

    -- 1) INSERT: nur 'registered' zieht ab
    IF TG_OP = 'INSERT' AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            -- First credit-consuming booking after a recharge starts the
            -- validity period (1 year or 10 weeks depending on card_type)
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                validity_start = COALESCE(validity_start, now()),
                valid_until = COALESCE(valid_until, now() + CASE
                    WHEN card_type = 'ten_weeks' THEN interval '10 weeks'
                    ELSE interval '1 year'
                END),
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
            -- First credit-consuming booking after a recharge starts the
            -- validity period (1 year or 10 weeks depending on card_type)
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                validity_start = COALESCE(validity_start, now()),
                valid_until = COALESCE(valid_until, now() + CASE
                    WHEN card_type = 'ten_weeks' THEN interval '10 weeks'
                    ELSE interval '1 year'
                END),
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
            -- First credit-consuming booking after a recharge starts the
            -- validity period (1 year or 10 weeks depending on card_type)
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                validity_start = COALESCE(validity_start, now()),
                valid_until = COALESCE(valid_until, now() + CASE
                    WHEN card_type = 'ten_weeks' THEN interval '10 weeks'
                    ELSE interval '1 year'
                END),
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

-- ---------------------------------------------------------------------
-- 5. generate_courses_from_template (legacy RPC):
--    copy is_event / event_price from the template so event courses
--    generated through this RPC keep their event settings.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_courses_from_template(
  template_id_param UUID,
  start_date_param DATE,
  end_date_param DATE
) RETURNS TABLE(
  course_id UUID,
  course_date DATE,
  start_time TIME,
  end_time TIME
) AS $$
DECLARE
  template_record RECORD;
  iter_date DATE;
  start_time_calc TIME;
  end_time_calc TIME;
  new_course_id UUID;
BEGIN
  -- Get template details
  SELECT * INTO template_record
  FROM course_templates
  WHERE id = template_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Generate courses for each day in the date range
  iter_date := start_date_param;
  WHILE iter_date <= end_date_param LOOP
    -- For now, create courses at 18:00 (can be customized later)
    start_time_calc := '18:00:00'::TIME;
    end_time_calc := start_time_calc + (template_record.duration_minutes || ' minutes')::INTERVAL;

    -- Insert the course
    INSERT INTO courses (
      template_id,
      title,
      trainer,
      strength_exercise,
      course_date,
      start_time,
      end_time,
      max_participants,
      registration_deadline_minutes,
      duration_minutes,
      is_event,
      event_price,
      hide_participants
    ) VALUES (
      template_id_param,
      template_record.title,
      template_record.trainer,
      template_record.strength_exercise,
      iter_date,
      start_time_calc,
      end_time_calc,
      template_record.max_participants,
      template_record.registration_deadline_minutes,
      template_record.duration_minutes,
      COALESCE(template_record.is_event, false),
      CASE WHEN COALESCE(template_record.is_event, false) THEN template_record.event_price ELSE NULL END,
      CASE WHEN COALESCE(template_record.is_event, false) THEN COALESCE(template_record.hide_participants, false) ELSE false END
    ) RETURNING id INTO new_course_id;

    -- Return the generated course info
    course_id := new_course_id;
    course_date := iter_date;
    start_time := start_time_calc;
    end_time := end_time_calc;
    RETURN NEXT;

    iter_date := iter_date + INTERVAL '1 day';
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 6. get_weekly_registrations_count:
--    Event bookings are excluded, so the "X/2" display for Basic
--    members stays correct automatically.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekly_registrations_count(user_id_param uuid, check_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    week_start DATE;
    reg_count INTEGER;
BEGIN
    -- Calculate start of week (Monday)
    week_start := check_date - EXTRACT(DOW FROM check_date)::INTEGER + 1;

    -- Count non-cancelled registrations in the current week (events excluded)
    SELECT COUNT(*) INTO reg_count
    FROM public.course_registrations cr
    JOIN public.courses c ON cr.course_id = c.id
    WHERE cr.user_id = user_id_param
      AND cr.status IN ('registered', 'waitlisted')
      AND c.course_date >= week_start
      AND c.course_date < week_start + INTERVAL '7 days'
      AND COALESCE(c.is_event, false) = false;

    RETURN COALESCE(reg_count, 0);
END;
$$;
