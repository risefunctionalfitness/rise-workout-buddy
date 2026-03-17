
ALTER TABLE public.course_registrations 
DROP CONSTRAINT course_registrations_status_check;

ALTER TABLE public.course_registrations 
ADD CONSTRAINT course_registrations_status_check 
CHECK (status = ANY (ARRAY['registered', 'waitlisted', 'cancelled', 'waitlist', 'waitlist_cancelled']));
