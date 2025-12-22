-- Allow public access to courses for the embed widget (no authentication required)
CREATE POLICY "Public can view courses for embed"
ON public.courses
FOR SELECT
USING (true);