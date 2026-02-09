-- Simplify the trigger function to ONLY create the event, no HTTP calls
-- This prevents the 5-second pg_net timeout issue

CREATE OR REPLACE FUNCTION process_waitlists_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_max_participants integer;
  v_registered_count integer;
  v_next_waitlist record;
BEGIN
  -- Only process when status changes to 'cancelled'
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    v_course_id := NEW.course_id;
    
    -- Get course max participants
    SELECT max_participants INTO v_max_participants
    FROM courses
    WHERE id = v_course_id;
    
    -- Count current registered participants
    SELECT COUNT(*) INTO v_registered_count
    FROM course_registrations
    WHERE course_id = v_course_id
      AND status = 'registered';
    
    -- If there's room and someone is on waitlist, promote them
    IF v_registered_count < v_max_participants THEN
      -- Get the next person on waitlist (earliest registration)
      SELECT id, user_id INTO v_next_waitlist
      FROM course_registrations
      WHERE course_id = v_course_id
        AND status = 'waitlist'
      ORDER BY registered_at ASC
      LIMIT 1;
      
      IF v_next_waitlist IS NOT NULL THEN
        -- Promote the user
        UPDATE course_registrations
        SET status = 'registered',
            updated_at = NOW()
        WHERE id = v_next_waitlist.id;
        
        -- Create an event for the dispatcher to process
        -- The Edge Function will send the webhook asynchronously
        INSERT INTO waitlist_promotion_events (
          user_id,
          course_id,
          registration_id,
          created_at
        ) VALUES (
          v_next_waitlist.user_id,
          v_course_id,
          v_next_waitlist.id,
          NOW()
        );
        
        RAISE NOTICE 'Promoted user % from waitlist for course %. Event created for async dispatch.', 
          v_next_waitlist.user_id, v_course_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;