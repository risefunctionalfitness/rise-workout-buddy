-- Enable realtime for course_invitations table
ALTER TABLE course_invitations REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already present
-- Note: This will only work if the table is not already in the publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'course_invitations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE course_invitations;
  END IF;
END $$;