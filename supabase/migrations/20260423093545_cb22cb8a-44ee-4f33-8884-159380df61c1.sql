CREATE OR REPLACE FUNCTION public.handle_membership_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_membership_type TEXT;
    week_start DATE;
BEGIN
    -- 1) INSERT: nur 'registered' zieht ab
    IF TG_OP = 'INSERT' AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
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