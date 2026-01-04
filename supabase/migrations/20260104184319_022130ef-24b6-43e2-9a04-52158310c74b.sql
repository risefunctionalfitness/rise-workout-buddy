-- Add missing attendance columns to course_registrations
ALTER TABLE course_registrations 
ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT NULL;

ALTER TABLE course_registrations 
ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE course_registrations 
ADD COLUMN IF NOT EXISTS attendance_marked_by UUID DEFAULT NULL;

-- Drop old restrictive policy if it exists
DROP POLICY IF EXISTS "Trainers can update attendance for their courses" ON course_registrations;

-- Create new policy that allows updates for current and future courses
CREATE POLICY "Trainers can update attendance for their courses"
ON course_registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = course_registrations.course_id
    AND c.course_date >= CURRENT_DATE
    AND (
      c.trainer = (SELECT display_name FROM profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = course_registrations.course_id
    AND c.course_date >= CURRENT_DATE
    AND (
      c.trainer = (SELECT display_name FROM profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    )
  )
);