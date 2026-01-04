-- Simple policy for authenticated users to update attendance on courses happening today
-- Frontend will check if user is trainer or admin
CREATE POLICY "Authenticated users can update attendance for today courses"
ON public.course_registrations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id
    AND c.course_date = CURRENT_DATE
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id
    AND c.course_date = CURRENT_DATE
  )
);