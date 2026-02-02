

# Plan: Datenbankfunktion für Waitlist-Webhooks aktualisieren

## Problem
Der Webhook für Wartelisten-Aufrückungen sendet das alte Format statt dem auf der Webhook-Tester-Seite dokumentierten Format.

**Ist-Zustand (Screenshot):**
```json
{
  "event_type": "waitlist_promoted",
  "promotion_type": "automatic",
  "user_email": "m.heer@web.de",
  "user_name": "Melanie Heer",
  "start_time": "19:10:00",
  "end_time": "19:40:00",
  // Fehlt: notification_method, phone, first_name, trainer
}
```

**Soll-Zustand (Tester-Seite):**
```json
{
  "event_type": "waitlist_promotion",
  "notification_method": "email | whatsapp | both",
  "phone": "4915730440756",
  "user_id": "uuid",
  "display_name": "Max Mustermann",
  "first_name": "Max",
  "email": "max@example.com",
  "course_title": "Functional Fitness",
  "course_date": "2025-02-01",
  "course_time": "18:00",
  "trainer": "Flo"
}
```

## Ursache

Der Webhook wird **nicht** von der Edge Function gesendet, sondern:

1. Trigger `trg_process_waitlists_on_cancellation` auf `course_registrations`
2. Ruft Datenbankfunktion `process_waitlists_on_cancellation` auf
3. Speichert Event in `waitlist_promotion_events` mit altem `payload`-Format
4. Database Webhook sendet diese Daten direkt an Make.com

Die Datenbankfunktion muss aktualisiert werden, um das korrekte Format zu speichern.

---

## Lösung: SQL-Migration

### Neue Datenbankfunktion `process_waitlists_on_cancellation`

Die Funktion wird erweitert um:
- Profildaten abrufen (phone_number, phone_country_code, first_name, notify_email_enabled, notify_whatsapp_enabled)
- Email aus auth.users abrufen
- notification_method berechnen
- phone formatieren (ohne + und Leerzeichen)
- Korrektes Payload-Format speichern

```text
Änderungen in der Funktion:
1. Zusätzliche Profile-Daten abrufen:
   - first_name
   - phone_country_code
   - phone_number
   - notify_email_enabled
   - notify_whatsapp_enabled

2. Email aus auth.users holen

3. notification_method berechnen:
   - 'both' wenn email UND whatsapp enabled
   - 'email' wenn nur email
   - 'whatsapp' wenn nur whatsapp
   - 'none' wenn beides aus

4. phone formatieren: country_code (ohne +) + number (ohne Leerzeichen)

5. Neues payload-Format:
   - event_type: 'waitlist_promotion' (statt 'waitlist_promoted')
   - notification_method: 'email|whatsapp|both'
   - phone: '49157...'
   - user_id: uuid
   - display_name: 'Max Mustermann'
   - first_name: 'Max'
   - email: 'max@example.com'
   - course_title: 'Functional Fitness'
   - course_date: '2025-02-01'
   - course_time: '18:00' (nur HH:MM, nicht HH:MM:SS)
   - trainer: 'Flo'
```

---

## Technische Details

### SQL-Migration

```sql
CREATE OR REPLACE FUNCTION process_waitlists_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  course_rec RECORD;
  waitlist_rec RECORD;
  profile_rec RECORD;
  user_email TEXT;
  current_registered_count INTEGER;
  notification_method TEXT;
  formatted_phone TEXT;
  wants_email BOOLEAN;
  wants_whatsapp BOOLEAN;
BEGIN
  IF OLD.status IN ('registered', 'waitlist') AND NEW.status = 'cancelled' THEN
    BEGIN
      SELECT * INTO course_rec FROM public.courses WHERE id = NEW.course_id;

      IF FOUND THEN
        SELECT COUNT(*) INTO current_registered_count
        FROM public.course_registrations
        WHERE course_id = NEW.course_id AND status = 'registered';

        IF current_registered_count < course_rec.max_participants THEN
          SELECT * INTO waitlist_rec
          FROM public.course_registrations
          WHERE course_id = NEW.course_id AND status = 'waitlist'
          ORDER BY registered_at ASC
          LIMIT 1;

          IF FOUND THEN
            -- Promote
            UPDATE public.course_registrations
            SET status = 'registered', updated_at = now()
            WHERE id = waitlist_rec.id;

            -- Get profile with notification preferences
            SELECT 
              display_name, first_name, phone_country_code, phone_number,
              COALESCE(notify_email_enabled, true) as notify_email_enabled,
              COALESCE(notify_whatsapp_enabled, false) as notify_whatsapp_enabled
            INTO profile_rec
            FROM public.profiles
            WHERE user_id = waitlist_rec.user_id;

            -- Get email from auth.users
            SELECT email INTO user_email
            FROM auth.users
            WHERE id = waitlist_rec.user_id;

            -- Calculate notification_method
            wants_email := COALESCE(profile_rec.notify_email_enabled, true);
            wants_whatsapp := profile_rec.notify_whatsapp_enabled 
                              AND profile_rec.phone_number IS NOT NULL;
            
            IF wants_email AND wants_whatsapp THEN
              notification_method := 'both';
            ELSIF wants_email THEN
              notification_method := 'email';
            ELSIF wants_whatsapp THEN
              notification_method := 'whatsapp';
            ELSE
              notification_method := 'none';
            END IF;

            -- Format phone (remove + and spaces)
            IF wants_whatsapp AND profile_rec.phone_number IS NOT NULL THEN
              formatted_phone := REPLACE(
                REPLACE(COALESCE(profile_rec.phone_country_code, '+49'), '+', ''), 
                ' ', ''
              ) || REPLACE(profile_rec.phone_number, ' ', '');
            ELSE
              formatted_phone := NULL;
            END IF;

            -- Insert event with correct payload format
            INSERT INTO public.waitlist_promotion_events 
              (registration_id, course_id, user_id, payload)
            VALUES (
              waitlist_rec.id,
              NEW.course_id,
              waitlist_rec.user_id,
              jsonb_build_object(
                'event_type', 'waitlist_promotion',
                'notification_method', notification_method,
                'phone', formatted_phone,
                'user_id', waitlist_rec.user_id,
                'display_name', COALESCE(profile_rec.display_name, 'Unbekannt'),
                'first_name', COALESCE(profile_rec.first_name, ''),
                'email', user_email,
                'course_title', course_rec.title,
                'course_date', course_rec.course_date,
                'course_time', SUBSTRING(course_rec.start_time::TEXT FROM 1 FOR 5),
                'trainer', COALESCE(course_rec.trainer, '')
              )
            );

            RAISE LOG 'Waitlist promotion event created: user_id=%, course_id=%', 
                       waitlist_rec.user_id, NEW.course_id;
          END IF;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing waitlist: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Erwartetes Ergebnis

Nach der Migration werden alle Wartelisten-Webhooks im korrekten Format gesendet:
- `event_type: waitlist_promotion`
- `notification_method` basierend auf User-Präferenzen
- `phone` korrekt formatiert (ohne + und Leerzeichen)
- Alle Felder wie auf der Tester-Seite dokumentiert

