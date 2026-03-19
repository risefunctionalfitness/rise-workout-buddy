

## Admin-Entfernung ohne Stornierungsrate-Einfluss

**Problem**: Wenn ein Admin einen Nutzer aus einem Kurs entfernt (`CourseParticipantsList.tsx`, Zeile 145), wird der Status auf `'cancelled'` gesetzt. Die `get_user_reliability_score`-Funktion zaehlt alle `'cancelled'`-Eintraege und erhoet damit die Stornierungsrate des Nutzers.

**Loesung**: Einen neuen Status `'admin_cancelled'` einfuehren. Wenn der Admin einen Teilnehmer entfernt, wird dieser Status statt `'cancelled'` gesetzt. Die Reliability-Score-Funktion zaehlt nur `'cancelled'`, daher wird `'admin_cancelled'` automatisch ignoriert.

### Aenderungen

**1. DB-Migration**: CHECK-Constraint um `'admin_cancelled'` erweitern + `handle_membership_limits` Trigger-Funktion aktualisieren (Credits/Limits zurueckgeben bei `admin_cancelled`).

```sql
ALTER TABLE public.course_registrations 
DROP CONSTRAINT course_registrations_status_check;

ALTER TABLE public.course_registrations 
ADD CONSTRAINT course_registrations_status_check 
CHECK (status = ANY (ARRAY['registered','waitlisted','cancelled','waitlist',
  'waitlist_cancelled','admin_cancelled']));
```

Zusaetzlich `handle_membership_limits` erweitern, damit bei `admin_cancelled` Credits/Weekly-Limits zurueckgegeben werden (gleiche Logik wie bei `cancelled`).

**2. `CourseParticipantsList.tsx`** (Zeile 143-146): Status von `'cancelled'` auf `'admin_cancelled'` aendern in der `removeParticipant`-Funktion fuer regulaere (nicht-Gast) Teilnehmer.

### Dateien
- Neue DB-Migration (CHECK-Constraint + Trigger)
- `src/components/CourseParticipantsList.tsx` (1 Zeile)

