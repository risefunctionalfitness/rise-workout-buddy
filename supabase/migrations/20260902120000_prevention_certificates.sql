-- Automatische Teilnahmebescheinigungen fuer Praeventionskurse
--
-- Ablauf: Ist die 8-Wochen-Karte abgelaufen, erzeugt die Edge Function
-- "send-prevention-certificates" das ausgefuellte ZPP-Formular, legt es im
-- Speicher-Ordner "praevention" ab und schickt es ueber Make per E-Mail an das
-- Mitglied (Kopie ans Studio). Der Zeitplan dafuer laeuft taeglich um 06:00.

-- ---------------------------------------------------------------------------
-- Ausgestellte Bescheinigungen
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prevention_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  -- Karten-Zyklus, zu dem die Bescheinigung gehoert (erstes Training)
  validity_start date NOT NULL,
  -- Formular: Kurszeitraum (bis = von + 49 Tage, also der 8. Termin)
  period_from date NOT NULL,
  period_to date NOT NULL,
  -- Formular: Datum neben der Unterschrift (Ablauf der Karte in der App)
  signature_date date NOT NULL,
  -- eingetragene Einheiten (max. 8) und die tatsaechlich gezaehlten Buchungen
  units integer NOT NULL,
  units_counted integer NOT NULL,
  cert_year integer NOT NULL,
  pdf_path text,
  recipient_email text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prevention_certificates_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])),
  -- pro Karten-Zyklus hoechstens eine Bescheinigung
  CONSTRAINT prevention_certificates_unique_cycle UNIQUE (user_id, validity_start)
);

CREATE INDEX IF NOT EXISTS idx_prevention_certificates_user_year
  ON public.prevention_certificates (user_id, cert_year);

ALTER TABLE public.prevention_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage prevention certificates" ON public.prevention_certificates;
CREATE POLICY "Admins can manage prevention certificates"
  ON public.prevention_certificates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.prevention_certificates IS
  'Teilnahmebescheinigungen fuer Praeventionskurse: eine Zeile je Karten-Zyklus, dient auch als Sperre gegen Doppelversand und als Zaehler fuer die 2 Kurse pro Jahr.';

-- ---------------------------------------------------------------------------
-- Speicher-Ordner fuer Vorlage, Unterschrift und die fertigen Bescheinigungen
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('praevention', 'praevention', false, 10485760,
        ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins verwalten Praeventions-Dateien" ON storage.objects;
CREATE POLICY "Admins verwalten Praeventions-Dateien"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'praevention' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'praevention' AND has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- Kleine Einstellungstabelle (Make-Webhook)
-- ---------------------------------------------------------------------------
--
-- Der Wert selbst steht bewusst NICHT in dieser Datei, weil das Repository
-- oeffentlich ist. Er ist direkt in der Datenbank hinterlegt:
--   INSERT INTO public.app_settings (key, value)
--   VALUES ('make_praevention_webhook_url', '<Adresse aus Make>')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins verwalten Einstellungen" ON public.app_settings;
CREATE POLICY "Admins verwalten Einstellungen"
  ON public.app_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- Wer ist dran?
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_due_prevention_certificates()
 RETURNS TABLE(
   user_id uuid,
   first_name text,
   last_name text,
   full_name text,
   validity_start date,
   period_from date,
   period_to date,
   signature_date date,
   units integer,
   units_counted integer,
   cert_year integer
 )
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH faellig AS (
    SELECT
      mc.user_id,
      p.first_name,
      p.last_name,
      mc.validity_start::date            AS validity_start,
      mc.valid_until::date               AS card_end,
      (SELECT count(*)
         FROM course_registrations cr
         JOIN courses c ON c.id = cr.course_id
        WHERE cr.user_id = mc.user_id
          AND cr.status = 'registered'
          AND c.course_date >= mc.validity_start::date
          AND c.course_date <= mc.valid_until::date
      )::integer                         AS gezaehlt
    FROM membership_credits mc
    JOIN profiles p ON p.user_id = mc.user_id
    WHERE mc.card_type IN ('prevention', 'ten_weeks')
      AND mc.validity_start IS NOT NULL
      AND mc.valid_until IS NOT NULL
      -- nur die neue Karte: genau 8 Wochen Laufzeit (die alten hatten 70 Tage
      -- und laufen bewusst ohne Bescheinigung aus)
      AND (mc.valid_until::date - mc.validity_start::date) = 56
      AND mc.valid_until < now()
      -- fuer diesen Zyklus noch keine Bescheinigung
      AND NOT EXISTS (
        SELECT 1 FROM prevention_certificates pc
        WHERE pc.user_id = mc.user_id
          AND pc.validity_start = mc.validity_start::date
      )
      -- hoechstens zwei Bescheinigungen im laufenden Jahr
      AND (
        SELECT count(*) FROM prevention_certificates pc
        WHERE pc.user_id = mc.user_id
          AND pc.cert_year = EXTRACT(year FROM now())::integer
          AND pc.status <> 'failed'
      ) < 2
  )
  SELECT
    f.user_id,
    f.first_name,
    f.last_name,
    btrim(COALESCE(f.first_name, '') || ' ' || COALESCE(f.last_name, ''))  AS full_name,
    f.validity_start,
    f.validity_start                                                       AS period_from,
    (f.validity_start + 49)                                                AS period_to,
    f.card_end                                                             AS signature_date,
    LEAST(f.gezaehlt, 8)                                                   AS units,
    f.gezaehlt                                                             AS units_counted,
    EXTRACT(year FROM now())::integer                                      AS cert_year
  FROM faellig f;
$function$;

-- ---------------------------------------------------------------------------
-- Taeglicher Zeitplan um 06:00
-- ---------------------------------------------------------------------------
--
-- Ist bereits eingerichtet (cron.schedule 'send-prevention-certificates').
-- Der Aufruf enthaelt einen API-Schluessel und steht deshalb nicht hier,
-- sondern nur in der Datenbank.
