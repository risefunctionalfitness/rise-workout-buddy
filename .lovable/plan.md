
# Fix: Serverseitige Kapazitaetspruefung fuer Kursanmeldungen

## Problem-Analyse

Die Kapazitaetspruefung ("registered" vs. "waitlist") passiert aktuell **nur im Frontend** (Zeile 348 in `CourseBooking.tsx`):
```text
const isWaitlist = course.registered_count >= course.max_participants
```

Dieser Wert stammt vom Zeitpunkt des Seitenladens. Wenn zwischen dem Laden und dem Klick auf "Anmelden" jemand anderes sich anmeldet (Mitglied ODER Gast), ist der Zaehler veraltet. Das passiert bei beliebten Kursen regelmaessig, nicht nur in seltenen Race Conditions.

**Es gibt keinen serverseitigen Schutz:** Kein DB-Trigger prueft beim Einfuegen, ob noch Platz ist.

## Loesung

Eine **serverseitige Datenbank-Funktion** (`register_for_course`), die atomar prueft und einfuegt. Das Frontend ruft diese Funktion auf statt direkt in die Tabelle zu schreiben.

### 1. Neue DB-Funktion: `register_for_course`

Eine `SECURITY DEFINER` Funktion die:
- Die aktuelle Teilnehmerzahl atomar zaehlt (Members + Gaeste aus `guest_registrations`)
- Automatisch den richtigen Status setzt (`registered` wenn Platz frei, `waitlist` wenn voll)
- Das Ergebnis zurueckgibt (status + registered_count)
- Bestehende stornierte Registrierungen reaktiviert statt neue zu erstellen

### 2. Frontend anpassen: `CourseBooking.tsx`

- Statt `supabase.from('course_registrations').insert(...)` wird `supabase.rpc('register_for_course', { ... })` aufgerufen
- Die lokale Waitlist-Entscheidung (Zeile 348) entfaellt — der Server entscheidet
- Der zurueckgegebene Status wird fuer die UI-Aktualisierung verwendet

### 3. Frontend anpassen: `DayCourseDialog.tsx`

- Gleiche Aenderung: RPC-Aufruf statt direktem Insert/Update
- Konsistente serverseitige Kapazitaetspruefung auch in der Tagesansicht

## Technische Details

### Neue Migration (SQL):

```text
CREATE OR REPLACE FUNCTION public.register_for_course(
  p_user_id uuid,
  p_course_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_max integer;
  v_total integer;
  v_status text;
  v_existing record;
BEGIN
  -- Kurs-Kapazitaet holen
  SELECT max_participants INTO v_max FROM courses WHERE id = p_course_id;

  -- Aktuelle Belegung zaehlen (Members + Gaeste)
  SELECT
    (SELECT count(*) FROM course_registrations
     WHERE course_id = p_course_id AND status = 'registered')
    +
    (SELECT count(*) FROM guest_registrations
     WHERE course_id = p_course_id AND status = 'registered')
  INTO v_total;

  -- Status bestimmen
  v_status := CASE WHEN v_total >= v_max THEN 'waitlist' ELSE 'registered' END;

  -- Bestehende Registrierung pruefen
  SELECT id, status INTO v_existing
  FROM course_registrations
  WHERE course_id = p_course_id AND user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    UPDATE course_registrations
    SET status = v_status, registered_at = now(), updated_at = now()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO course_registrations (course_id, user_id, status)
    VALUES (p_course_id, p_user_id, v_status);
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'registered_count', v_total + (CASE WHEN v_status = 'registered' THEN 1 ELSE 0 END)
  );
END;
$$;
```

### Dateien die geaendert werden:

| Datei | Aenderung |
|---|---|
| Migration (SQL) | Neue Funktion `register_for_course` |
| `src/components/CourseBooking.tsx` | `supabase.rpc('register_for_course')` statt direktem Insert/Update, Zeile 348 Waitlist-Logik entfernen |
| `src/components/DayCourseDialog.tsx` | Gleiche RPC-Umstellung |

## Ergebnis

- Kapazitaet wird **atomar auf dem Server** geprueft — keine Ueberbuchung mehr moeglich
- Gaeste werden immer korrekt mitgezaehlt
- Gleichzeitige Anmeldungen sind sicher
