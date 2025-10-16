-- Add attachments column to news table
ALTER TABLE public.news 
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for news attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-attachments',
  'news-attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
);

-- RLS policies for news-attachments bucket

-- Allow authenticated users to read all attachments
CREATE POLICY "Authenticated users can view news attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'news-attachments');

-- Allow admins to upload attachments
CREATE POLICY "Admins can upload news attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'news-attachments' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- Allow admins to delete attachments
CREATE POLICY "Admins can delete news attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'news-attachments'
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);