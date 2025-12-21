-- Create guest_registrations table for Drop-In and Probetraining bookings
CREATE TABLE public.guest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('drop_in', 'probetraining')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  ticket_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wellpass_registrations table for Wellpass signups
CREATE TABLE public.wellpass_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  wellpass_member_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.guest_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellpass_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guest_registrations
-- Public can insert (for booking from embed widget)
CREATE POLICY "Anyone can create guest registrations"
ON public.guest_registrations
FOR INSERT
WITH CHECK (true);

-- Admins can manage all guest registrations
CREATE POLICY "Admins can manage guest registrations"
ON public.guest_registrations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view guest registrations (for participant list)
CREATE POLICY "Authenticated users can view guest registrations"
ON public.guest_registrations
FOR SELECT
USING (auth.role() = 'authenticated');

-- RLS Policies for wellpass_registrations
-- Public can insert (for registration from embed widget)
CREATE POLICY "Anyone can create wellpass registrations"
ON public.wellpass_registrations
FOR INSERT
WITH CHECK (true);

-- Admins can manage all wellpass registrations
CREATE POLICY "Admins can manage wellpass registrations"
ON public.wellpass_registrations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_guest_registrations_course_id ON public.guest_registrations(course_id);
CREATE INDEX idx_guest_registrations_status ON public.guest_registrations(status);
CREATE INDEX idx_wellpass_registrations_status ON public.wellpass_registrations(status);