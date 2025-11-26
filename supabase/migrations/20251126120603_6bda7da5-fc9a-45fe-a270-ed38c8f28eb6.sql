-- Create email_templates table for saving reusable email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage all templates
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates for member reactivation
INSERT INTO public.email_templates (title, subject, body) VALUES
('Reaktivierung - Inaktives Mitglied', 
 'Wir vermissen Dich bei RISE Fitness! 💪',
 'Hallo {{first_name}},

wir haben bemerkt, dass Du schon eine Weile nicht mehr bei uns warst. 

Wir würden uns freuen, Dich bald wieder bei RISE Fitness zu sehen! 

Viele Grüße,
Dein RISE Team'),

('Willkommen zurück', 
 'Schön, dass Du wieder da bist! 🎉',
 'Hallo {{first_name}},

herzlich willkommen zurück bei RISE Fitness! 

Wir freuen uns, dass Du wieder dabei bist und unterstützen Dich gerne auf Deinem Weg zu Deinen Zielen.

Viele Grüße,
Dein RISE Team'),

('Credits-Erinnerung', 
 'Deine Credits laufen bald ab ⏰',
 'Hallo {{first_name}},

wir möchten Dich daran erinnern, dass Deine Credits bald ablaufen.

Buche Dir jetzt einen Kurs und nutze Deine Credits!

Viele Grüße,
Dein RISE Team');