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
  -- Get course capacity
  SELECT max_participants INTO v_max FROM courses WHERE id = p_course_id;

  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  -- Count current occupancy atomically (members + guests)
  SELECT
    (SELECT count(*) FROM course_registrations
     WHERE course_id = p_course_id AND status = 'registered')
    +
    (SELECT count(*) FROM guest_registrations
     WHERE course_id = p_course_id AND status = 'registered')
  INTO v_total;

  -- Determine status
  v_status := CASE WHEN v_total >= v_max THEN 'waitlist' ELSE 'registered' END;

  -- Check for existing registration
  SELECT id, status INTO v_existing
  FROM course_registrations
  WHERE course_id = p_course_id AND user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    UPDATE course_registrations
    SET status = v_status, registered_at = now(), updated_at = now()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO course_registrations (course_id, user_id, status)
    VALUES (p_course_id, p_user_id, v_status);
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'registered_count', v_total + (CASE WHEN v_status = 'registered' THEN 1 ELSE 0 END)
  );
END;
$$;