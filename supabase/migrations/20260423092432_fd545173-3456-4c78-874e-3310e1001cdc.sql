-- Fix: Credit-Abzug beim Nachrücken von der Warteliste für 10er-Karte-Mitglieder
-- Vorher: Übergang waitlist -> registered (durch Cron oder DB-Trigger) zog keinen Credit ab.
-- Nachher: Promotion zieht Credit ab; Storno aus 'waitlist' gibt KEINEN Credit zurück.

CREATE OR REPLACE FUNCTION public.handle_membership_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_membership_type TEXT;
    week_start DATE;
    new_balance INTEGER;
BEGIN
    -- 1) INSERT: nur 'registered' zieht ab; 'waitlist'/'waitlisted' nicht
    IF TG_OP = 'INSERT' AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                updated_at = now()
            WHERE user_id = NEW.user_id
            RETURNING credits_remaining INTO new_balance;

            IF new_balance IS NOT NULL THEN
                INSERT INTO public.credit_transactions
                    (user_id, amount, balance_after, transaction_type, reference_id, description)
                VALUES
                    (NEW.user_id, -1, new_balance, 'course_registration', NEW.course_id,
                     'Kursanmeldung');
            END IF;
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

    -- 2) Re-Aktivierung aus Storno-Status zurück nach registered/waitlisted
    IF TG_OP = 'UPDATE'
       AND OLD.status IN ('cancelled', 'waitlist_cancelled', 'admin_cancelled', 'rebooked')
       AND NEW.status IN ('registered', 'waitlisted') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                updated_at = now()
            WHERE user_id = NEW.user_id
            RETURNING credits_remaining INTO new_balance;

            IF new_balance IS NOT NULL THEN
                INSERT INTO public.credit_transactions
                    (user_id, amount, balance_after, transaction_type, reference_id, description)
                VALUES
                    (NEW.user_id, -1, new_balance, 'course_registration', NEW.course_id,
                     'Kursanmeldung (reaktiviert)');
            END IF;
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

    -- 3) NEU: Promotion von Warteliste -> registriert (App nutzt 'waitlist')
    IF TG_OP = 'UPDATE'
       AND OLD.status IN ('waitlist', 'waitlisted')
       AND NEW.status = 'registered' THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = GREATEST(0, credits_remaining - 1),
                updated_at = now()
            WHERE user_id = NEW.user_id
            RETURNING credits_remaining INTO new_balance;

            IF new_balance IS NOT NULL THEN
                INSERT INTO public.credit_transactions
                    (user_id, amount, balance_after, transaction_type, reference_id, description)
                VALUES
                    (NEW.user_id, -1, new_balance, 'waitlist_promotion', NEW.course_id,
                     'Nachgerückt von Warteliste');
            END IF;
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

    -- 4) Storno aus 'registered' -> Refund. Storno aus 'waitlist'/'waitlisted' KEIN Refund.
    IF TG_OP = 'UPDATE'
       AND OLD.status = 'registered'
       AND NEW.status IN ('cancelled', 'waitlist_cancelled', 'admin_cancelled', 'rebooked') THEN
        SELECT membership_type INTO user_membership_type
        FROM public.profiles WHERE user_id = NEW.user_id;

        IF user_membership_type = '10er Karte' THEN
            UPDATE public.membership_credits
            SET credits_remaining = credits_remaining + 1,
                updated_at = now()
            WHERE user_id = NEW.user_id
            RETURNING credits_remaining INTO new_balance;

            IF new_balance IS NOT NULL THEN
                INSERT INTO public.credit_transactions
                    (user_id, amount, balance_after, transaction_type, reference_id, description)
                VALUES
                    (NEW.user_id, 1, new_balance, 'course_cancellation', NEW.course_id,
                     'Stornierung Kursanmeldung');
            END IF;
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