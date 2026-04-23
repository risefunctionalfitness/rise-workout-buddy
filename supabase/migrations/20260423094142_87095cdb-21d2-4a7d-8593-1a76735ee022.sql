CREATE OR REPLACE FUNCTION public.log_registration_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := NULL;
  v_guest_email text := NULL;
  v_course_id uuid;
  v_old_status text := NULL;
  v_new_status text := NULL;
  v_old_row jsonb := NULL;
  v_new_row jsonb := NULL;
BEGIN
  -- Build jsonb representations safely (no static field references on NEW/OLD)
  IF TG_OP = 'DELETE' THEN
    v_old_row := to_jsonb(OLD);
    v_course_id := (v_old_row ->> 'course_id')::uuid;
    v_old_status := v_old_row ->> 'status';
    IF TG_TABLE_NAME = 'guest_registrations' THEN
      v_guest_email := v_old_row ->> 'guest_email';
    ELSE
      v_user_id := (v_old_row ->> 'user_id')::uuid;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_row := to_jsonb(NEW);
    v_course_id := (v_new_row ->> 'course_id')::uuid;
    v_new_status := v_new_row ->> 'status';
    IF TG_TABLE_NAME = 'guest_registrations' THEN
      v_guest_email := v_new_row ->> 'guest_email';
    ELSE
      v_user_id := (v_new_row ->> 'user_id')::uuid;
    END IF;
  ELSE -- UPDATE
    v_old_row := to_jsonb(OLD);
    v_new_row := to_jsonb(NEW);
    v_course_id := (v_new_row ->> 'course_id')::uuid;
    v_old_status := v_old_row ->> 'status';
    v_new_status := v_new_row ->> 'status';
    IF TG_TABLE_NAME = 'guest_registrations' THEN
      v_guest_email := v_new_row ->> 'guest_email';
    ELSE
      v_user_id := (v_new_row ->> 'user_id')::uuid;
    END IF;
  END IF;

  -- For UPDATEs, only log on actual status changes
  IF TG_OP = 'UPDATE' AND v_new_status IS NOT DISTINCT FROM v_old_status THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.registration_audit_log (
      table_name, operation, course_id, user_id, guest_email,
      old_status, new_status, old_row, new_row, app_name
    ) VALUES (
      TG_TABLE_NAME, TG_OP, v_course_id, v_user_id, v_guest_email,
      v_old_status, v_new_status, v_old_row, v_new_row,
      current_setting('application_name', true)
    );
  EXCEPTION WHEN OTHERS THEN
    -- NEVER let audit logging break a registration
    RAISE WARNING 'log_registration_change: audit insert failed: %', SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;