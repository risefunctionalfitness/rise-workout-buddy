

## Problem

Meine Migration vom 23.04. (`20260423084955`) hat die Audit-Trigger-Funktion `log_registration_change()` eingeführt. Diese ist an **beide** Tabellen `course_registrations` und `guest_registrations` gekoppelt und enthält:

```sql
CASE WHEN TG_TABLE_NAME = 'guest_registrations' THEN NEW.guest_email END
```

PL/pgSQL prüft Feldzugriffe auf `NEW` zur Laufzeit gegen das **tatsächliche Record-Layout** der Trigger-Tabelle. Da `course_registrations` keine Spalte `guest_email` hat, schlägt der Ausdruck mit `record "new" has no field "guest_email"` fehl — bei **jeder** Course-Registrierung. Der `CASE WHEN ... END` wird leider nicht "lazy" evaluiert.

Effekte:
- Niemand kann sich mehr für Kurse anmelden (Status 400 bei `register_for_course`).
- Das `registration_audit_log` ist leer (Insert kracht jedes Mal).
- Die Credit-Logik in `handle_membership_limits()` wird nie erreicht.

## Lösung

Eine einzige Migration, die `log_registration_change()` so umbaut, dass `NEW.guest_email` **nur dann** referenziert wird, wenn der Trigger wirklich auf `guest_registrations` läuft. Umsetzung mit zwei getrennten Code-Pfaden statt eines CASE-Ausdrucks:

```sql
CREATE OR REPLACE FUNCTION public.log_registration_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_guest_email text := NULL;
  v_user_id uuid := NULL;
BEGIN
  IF TG_TABLE_NAME = 'guest_registrations' THEN
    IF TG_OP = 'DELETE' THEN
      v_guest_email := (to_jsonb(OLD) ->> 'guest_email');
    ELSE
      v_guest_email := (to_jsonb(NEW) ->> 'guest_email');
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      v_user_id := (to_jsonb(OLD) ->> 'user_id')::uuid;
    ELSE
      v_user_id := (to_jsonb(NEW) ->> 'user_id')::uuid;
    END IF;
  END IF;
  -- restlicher Insert-Logik analog, aber ohne direkten NEW.guest_email-Zugriff
  ...
END $$;
```

Der Trick: `to_jsonb(NEW) ->> 'guest_email'` umgeht die statische Feld-Prüfung von PL/pgSQL — es liefert `NULL`, wenn die Spalte fehlt, statt zu crashen.

## Verifikation nach Deploy

1. Mit Test-Account auf einen Kurs anmelden → muss erfolgreich sein.
2. `SELECT * FROM registration_audit_log ORDER BY created_at DESC LIMIT 5;` → Eintrag muss existieren.
3. Bei Warteliste-Promotion eines „10er Karte"-Mitglieds: `credits_remaining` muss um 1 sinken.
4. Bei Storno aus `registered`: `credits_remaining` muss um 1 steigen (für 10er Karte).

Die bestehende Credit-Logik in `handle_membership_limits()` bleibt komplett unangetastet — nur der Audit-Trigger wird gefixt.

## Dateien

- **Neu**: `supabase/migrations/<timestamp>_fix_audit_trigger_guest_email.sql`

