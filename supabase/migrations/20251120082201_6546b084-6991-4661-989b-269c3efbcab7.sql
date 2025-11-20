-- Create webhook settings table
CREATE TABLE IF NOT EXISTS public.webhook_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;

-- Admin can view and manage webhooks
CREATE POLICY "Admins can view webhook settings"
  ON public.webhook_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert webhook settings"
  ON public.webhook_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update webhook settings"
  ON public.webhook_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete webhook settings"
  ON public.webhook_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default webhook types
INSERT INTO public.webhook_settings (webhook_type, webhook_url, description, is_active)
VALUES 
  ('member_registration', '', 'Webhook für neue Mitglieder-Anmeldungen', false),
  ('member_reactivation', '', 'Webhook für Mitglieder-Reaktivierung nach 21 Tagen Inaktivität', false)
ON CONFLICT (webhook_type) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_webhook_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_settings_updated_at
BEFORE UPDATE ON public.webhook_settings
FOR EACH ROW
EXECUTE FUNCTION update_webhook_settings_updated_at();