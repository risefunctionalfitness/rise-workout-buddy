-- Add optional link_url column to news table
ALTER TABLE public.news 
ADD COLUMN link_url TEXT NULL;