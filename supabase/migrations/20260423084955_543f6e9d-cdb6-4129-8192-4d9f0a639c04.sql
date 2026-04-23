-- =====================================================================
-- 1. Audit log table for diagnosing future booking anomalies
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.registration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,                  -- INSERT / UPDATE / DELETE
  course_id uuid,
  user_id uuid,                             -- members only
  guest_email text,                         -- guests only
  old_status text,
  new_status text,
  old_row jsonb,
  new_row jsonb,
  db_user text NOT NULL DEFAULT current_user,
  app_name text,
  txid bigint NOT NULL DEFAULT txid_current(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
ON public.registration_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit log"
ON public.registration_audit_log FOR INSERT
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_registration_audit_log_course
  ON public.registration_audit_log (course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_audit_log_txid
  ON public.registration_audit_log (txid);

-- =====================================================================
-- 2. Audit trigger function (writes one row per change)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.log_registration_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.registration_audit_log (
      table_name, operation, course_id, user_id, guest_email,
      old_status, new_status, old_row, new_row, app_name
    ) VALUES (
      TG_TABLE_NAME, TG_OP, NEW.course_id,
      CASE WHEN TG_TABLE_NAME = 'course_registrations' THEN NEW.user_id END,
      CASE WHEN TG_TABLE_NAME = 'guest_registrations' THEN NEW.guest_email END,
      NULL, NEW.status, NULL, to_jsonb(NEW),
      current_setting('application_name', true)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- only log if status actually changed (avoid noise from attendance updates etc.)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.registration_audit_log (
        table_name, operation, course_id, user_id, guest_email,
        old_status, new_status, old_row, new_row, app_name
      ) VALUES (
        TG_TABLE_NAME, TG_OP, NEW.course_id,
        CASE WHEN TG_TABLE_NAME = 'course_registrations' THEN NEW.user_id END,
        CASE WHEN TG_TABLE_NAME = 'guest_registrations' THEN NEW.guest_email END,
        OLD.status, NEW.status, to_jsonb(OLD), to_jsonb(NEW),
        current_setting('application_name', true)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.registration_audit_log (
      table_name, operation, course_id, user_id, guest_email,
      old_status, new_status, old_row, new_row, app_name
    ) VALUES (
      TG_TABLE_NAME, TG_OP, OLD.course_id,
      CASE WHEN TG_TABLE_NAME = 'course_registrations' THEN OLD.user_id END,
      CASE WHEN TG_TABLE_NAME = 'guest_registrations' THEN OLD.guest_email END,
      OLD.status, NULL, to_jsonb(OLD), NULL,
      current_setting('application_name', true)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_course_registrations ON public.course_registrations;
CREATE TRIGGER audit_course_registrations
AFTER INSERT OR UPDATE OR DELETE ON public.course_registrations
FOR EACH ROW EXECUTE FUNCTION public.log_registration_change();

DROP TRIGGER IF EXISTS audit_guest_registrations ON public.guest_registrations;
CREATE TRIGGER audit_guest_registrations
AFTER INSERT OR UPDATE OR DELETE ON public.guest_registrations
FOR EACH ROW EXECUTE FUNCTION public.log_registration_change();

-- =====================================================================
-- 3. Hard capacity guard (BEFORE INSERT/UPDATE on both tables)
--    Uses pg_advisory_xact_lock to serialize per course_id
--    Raises P0001 'Course capacity exceeded' when overbooking would occur
-- =====================================================================
CREATE OR REPLACE FUNCTION public.assert_course_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_total integer;
  v_course_id uuid;
BEGIN
  -- Only enforce when the new row is 'registered'
  IF NEW.status IS DISTINCT FROM 'registered' THEN
    RETURN NEW;
  END IF;

  -- Skip if UPDATE and previously already 'registered' (no net change in count)
  IF TG_OP = 'UPDATE' AND OLD.status = 'registered' AND OLD.course_id = NEW.course_id THEN
    RETURN NEW;
  END IF;

  v_course_id := NEW.course_id;

  -- Serialize concurrent operations on the same course
  PERFORM pg_advisory_xact_lock(hashtext(v_course_id::text));

  SELECT max_participants INTO v_max FROM public.courses WHERE id = v_course_id;
  IF v_max IS NULL THEN
    RETURN NEW;  -- course not found (shouldn't happen) – let FK / other checks handle it
  END IF;

  SELECT
    (SELECT count(*) FROM public.course_registrations
       WHERE course_id = v_course_id AND status = 'registered'
         AND (TG_TABLE_NAME <> 'course_registrations' OR id <> NEW.id))
    +
    (SELECT count(*) FROM public.guest_registrations
       WHERE course_id = v_course_id AND status = 'registered'
         AND (TG_TABLE_NAME <> 'guest_registrations' OR id <> NEW.id))
  INTO v_total;

  -- v_total = other 'registered' rows; +1 for NEW would push us to v_total + 1
  IF (v_total + 1) > v_max THEN
    RAISE EXCEPTION 'Course capacity exceeded (% / %)', v_total + 1, v_max
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assert_capacity_course_registrations ON public.course_registrations;
CREATE TRIGGER assert_capacity_course_registrations
BEFORE INSERT OR UPDATE ON public.course_registrations
FOR EACH ROW EXECUTE FUNCTION public.assert_course_capacity();

DROP TRIGGER IF EXISTS assert_capacity_guest_registrations ON public.guest_registrations;
CREATE TRIGGER assert_capacity_guest_registrations
BEFORE INSERT OR UPDATE ON public.guest_registrations
FOR EACH ROW EXECUTE FUNCTION public.assert_course_capacity();

-- =====================================================================
-- 4. Update register_for_course to catch capacity exception
--    and gracefully return waitlist status (user-facing behavior unchanged)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.register_for_course(
  p_user_id uuid,
  p_course_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_max integer;
  v_total integer;
  v_status text;
  v_existing record;
BEGIN
  SELECT max_participants INTO v_max FROM courses WHERE id = p_course_id;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  SELECT
    (SELECT count(*) FROM course_registrations
       WHERE course_id = p_course_id AND status = 'registered')
    +
    (SELECT count(*) FROM guest_registrations
       WHERE course_id = p_course_id AND status = 'registered')
  INTO v_total;

  v_status := CASE WHEN v_total >= v_max THEN 'waitlist' ELSE 'registered' END;

  SELECT id, status INTO v_existing
  FROM course_registrations
  WHERE course_id = p_course_id AND user_id = p_user_id;

  BEGIN
    IF v_existing IS NOT NULL THEN
      UPDATE course_registrations
      SET status = v_status, registered_at = now(), updated_at = now()
      WHERE id = v_existing.id;
    ELSE
      INSERT INTO course_registrations (course_id, user_id, status)
      VALUES (p_course_id, p_user_id, v_status);
    END IF;
  EXCEPTION WHEN sqlstate 'P0001' THEN
    -- Capacity guard fired: course actually full. Fall back to waitlist.
    v_status := 'waitlist';
    IF v_existing IS NOT NULL THEN
      UPDATE course_registrations
      SET status = 'waitlist', registered_at = now(), updated_at = now()
      WHERE id = v_existing.id;
    ELSE
      INSERT INTO course_registrations (course_id, user_id, status)
      VALUES (p_course_id, p_user_id, 'waitlist');
    END IF;
  END;

  RETURN jsonb_build_object(
    'status', v_status,
    'registered_count', v_total + (CASE WHEN v_status = 'registered' THEN 1 ELSE 0 END)
  );
END;
$$;