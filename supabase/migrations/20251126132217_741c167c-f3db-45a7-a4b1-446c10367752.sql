-- Add RLS policy for admins to view all training sessions
CREATE POLICY "Admins can view all training sessions"
ON training_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));