-- Drop existing unique constraint that prevents re-invitations
DROP INDEX IF EXISTS course_invitations_course_id_sender_id_recipient_id_key;

-- Create partial unique index that only applies to 'pending' invitations
-- This allows multiple declined/accepted invitations but prevents duplicate pending ones
CREATE UNIQUE INDEX course_invitations_pending_unique 
ON public.course_invitations (course_id, sender_id, recipient_id) 
WHERE status = 'pending';

-- Add comment for documentation
COMMENT ON INDEX course_invitations_pending_unique IS 
'Ensures only one pending invitation exists per course/sender/recipient combination, while allowing multiple declined/accepted invitations for history tracking';