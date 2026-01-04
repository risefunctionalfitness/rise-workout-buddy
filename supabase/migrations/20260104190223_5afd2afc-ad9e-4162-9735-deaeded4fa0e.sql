-- Add trainer_user_id column to courses table (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'trainer_user_id') THEN
    ALTER TABLE public.courses ADD COLUMN trainer_user_id UUID REFERENCES public.profiles(user_id);
  END IF;
END $$;

-- Add trainer_user_id column to course_templates table (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_templates' AND column_name = 'trainer_user_id') THEN
    ALTER TABLE public.course_templates ADD COLUMN trainer_user_id UUID REFERENCES public.profiles(user_id);
  END IF;
END $$;

-- Add missing trainer roles for Flo, Björn, and Tabea
INSERT INTO public.user_roles (user_id, role) VALUES
  ('055a2fcd-6b5e-407a-b968-d8ccbb638aac', 'trainer'),
  ('0478b110-b882-40d5-9802-65464143d6bb', 'trainer'),
  ('e0a8ee44-5a61-4e1f-ae74-3b4e068c1f65', 'trainer')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update existing courses with trainer user IDs based on trainer name
UPDATE public.courses SET trainer_user_id = '055a2fcd-6b5e-407a-b968-d8ccbb638aac' WHERE LOWER(TRIM(trainer)) = 'flo' AND trainer_user_id IS NULL;
UPDATE public.courses SET trainer_user_id = '3d02ec9a-384a-454d-a994-b0daa5798ddb' WHERE LOWER(TRIM(trainer)) = 'jenny' AND trainer_user_id IS NULL;
UPDATE public.courses SET trainer_user_id = '0478b110-b882-40d5-9802-65464143d6bb' WHERE LOWER(TRIM(trainer)) LIKE 'björn%' AND trainer_user_id IS NULL;
UPDATE public.courses SET trainer_user_id = 'f99f5499-db60-4806-ab3f-94f4e134ab4a' WHERE LOWER(TRIM(trainer)) = 'micha' AND trainer_user_id IS NULL;
UPDATE public.courses SET trainer_user_id = 'e0a8ee44-5a61-4e1f-ae74-3b4e068c1f65' WHERE LOWER(TRIM(trainer)) = 'tabea' AND trainer_user_id IS NULL;

-- Update existing course_templates with trainer user IDs
UPDATE public.course_templates SET trainer_user_id = '055a2fcd-6b5e-407a-b968-d8ccbb638aac' WHERE LOWER(TRIM(trainer)) = 'flo' AND trainer_user_id IS NULL;
UPDATE public.course_templates SET trainer_user_id = '3d02ec9a-384a-454d-a994-b0daa5798ddb' WHERE LOWER(TRIM(trainer)) = 'jenny' AND trainer_user_id IS NULL;
UPDATE public.course_templates SET trainer_user_id = '0478b110-b882-40d5-9802-65464143d6bb' WHERE LOWER(TRIM(trainer)) LIKE 'björn%' AND trainer_user_id IS NULL;
UPDATE public.course_templates SET trainer_user_id = 'f99f5499-db60-4806-ab3f-94f4e134ab4a' WHERE LOWER(TRIM(trainer)) = 'micha' AND trainer_user_id IS NULL;
UPDATE public.course_templates SET trainer_user_id = 'e0a8ee44-5a61-4e1f-ae74-3b4e068c1f65' WHERE LOWER(TRIM(trainer)) = 'tabea' AND trainer_user_id IS NULL;

-- Drop existing trainer/admin update policy if it exists
DROP POLICY IF EXISTS "Trainers and admins can update attendance" ON public.course_registrations;
DROP POLICY IF EXISTS "Trainers can update attendance for their courses" ON public.course_registrations;

-- Create new policy that allows trainers to update attendance only for their own courses
CREATE POLICY "Trainers can update attendance for their courses"
ON public.course_registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_registrations.course_id
    AND c.trainer_user_id = auth.uid()
    AND c.course_date >= CURRENT_DATE
  )
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_registrations.course_id
    AND c.trainer_user_id = auth.uid()
    AND c.course_date >= CURRENT_DATE
  )
  OR public.has_role(auth.uid(), 'admin')
);