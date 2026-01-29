-- Add phone columns to guest_registrations
ALTER TABLE guest_registrations 
ADD COLUMN phone_country_code text DEFAULT '+49',
ADD COLUMN phone_number text;

-- Add phone columns and terms_accepted_at to wellpass_registrations
ALTER TABLE wellpass_registrations 
ADD COLUMN phone_country_code text DEFAULT '+49',
ADD COLUMN phone_number text,
ADD COLUMN terms_accepted_at timestamp with time zone;