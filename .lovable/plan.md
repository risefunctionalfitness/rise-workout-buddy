
# Plan: Webhook-Payloads an Tester-Format angleichen

## Zusammenfassung
Alle Edge Functions werden angepasst, um exakt die Payload-Strukturen zu senden, die auf der Admin-Webhook-Tester-Seite dokumentiert sind. Besonderer Fokus: `notification_method` und `phone` Felder.

---

## 1. `book-guest-training/index.ts` (Gast-Buchung)

**Aktuelles Format:**
```json
{
  "event_type": "guest_ticket",
  "booking_type": "drop_in",
  "is_drop_in": true,
  "is_probetraining": false,
  "ticket": {
    "ticketId": "...",
    "guestName": "...",
    "guestEmail": "...",
    "courseTitle": "...",
    "courseDate": "...",
    "courseTime": "18:00 - 19:00",
    "trainer": "..."
  },
  "timestamp": "...",
  "notification_method": "both",
  "phone": "4915730440756"
}
```

**Zielformat:**
```json
{
  "event_type": "guest_ticket",
  "notification_method": "email | whatsapp | both",
  "phone": "4915730440756",
  "ticket_id": "RISE-ABC123",
  "guest_name": "Max Mustermann",
  "guest_email": "max@example.com",
  "booking_type": "probetraining | drop_in",
  "course_title": "Functional Fitness",
  "course_date": "2025-02-01",
  "course_time": "18:00",
  "trainer": "Flo"
}
```

**Änderungen:**
- `ticket`-Objekt auflösen → flache Struktur
- camelCase → snake_case
- `is_drop_in`, `is_probetraining`, `timestamp` entfernen
- `courseTime` nur Startzeit (nicht "18:00 - 19:00")
- `courseDate` als ISO-Datum (YYYY-MM-DD)

---

## 2. `create-member/index.ts` (Mitglieder-Registrierung)

**Aktuelles Format:**
```json
{
  "event_type": "registration",
  "notification_method": "both",
  "phone": "4915730440756",
  "name": "Max Mustermann",
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@example.com",
  "access_code": "123456",
  "membership_type": "Premium Member",
  "created_at": "2025-02-01T10:00:00Z",
  "user_id": "uuid"
}
```

**Zielformat:**
```json
{
  "event_type": "registration",
  "notification_method": "email | whatsapp | both",
  "phone": "4915730440756",
  "name": "Max Mustermann",
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@example.com",
  "access_code": "123456",
  "membership_type": "Premium Member"
}
```

**Änderungen:**
- `created_at` entfernen
- `user_id` entfernen

---

## 3. `register-wellpass/index.ts` (Wellpass Registrierung)

**Aktuelles Format:**
```json
{
  "event_type": "registration",
  "name": "Max",
  "email": "...",
  "access_code": "...",
  "membership_type": "Wellpass",
  "created_at": "...",
  "user_id": "...",
  "notification_method": "both",
  "phone": "..."
}
```

**Zielformat:** (identisch zu create-member)
```json
{
  "event_type": "registration",
  "notification_method": "email | whatsapp | both",
  "phone": "4915730440756",
  "name": "Max Mustermann",
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@example.com",
  "access_code": "123456",
  "membership_type": "Wellpass"
}
```

**Änderungen:**
- `name` auf vollständigen Namen setzen ("firstName lastName")
- `first_name`, `last_name` hinzufügen
- `created_at` entfernen
- `user_id` entfernen

---

## 4. `notify-waitlist-promotion/index.ts` (Wartelisten-Aufrückung)

**Aktuelles Format:**
```json
{
  "event_type": "waitlist_promoted",
  "notification_method": "both",
  "user_id": "...",
  "name": "Max Mustermann",
  "email": "...",
  "phone": "...",
  "access_code": "...",
  "membership_type": "...",
  "course_id": "...",
  "course_title": "...",
  "course_date": "...",
  "course_time": "18:00",
  "promoted_at": "..."
}
```

**Zielformat:**
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

**Änderungen:**
- `event_type`: `waitlist_promoted` → `waitlist_promotion`
- `name` → `display_name`
- `first_name` hinzufügen
- `trainer` hinzufügen (aus Kurs-Daten)
- `access_code`, `membership_type`, `course_id`, `promoted_at` entfernen

---

## 5. `process-waitlists/index.ts` (Automatische Wartelisten-Aufrückung)

**Aktuelles Format:**
```json
{
  "event_type": "waitlist_promoted",
  "promotion_type": "automatic",
  "promoted_at": "...",
  "course_id": "...",
  "course_title": "...",
  "course_date": "...",
  "start_time": "18:00:00",
  "end_time": "19:00:00",
  "user_id": "...",
  "user_email": "...",
  "user_name": "...",
  "membership": "..."
}
```

**Zielformat:** (identisch zu notify-waitlist-promotion)
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

**Änderungen:**
- `event_type`: `waitlist_promoted` → `waitlist_promotion`
- `user_email` → `email`
- `user_name` → `display_name`
- `first_name` hinzufügen (aus Profil abrufen)
- `notification_method`, `phone` hinzufügen (aus Profil abrufen)
- `start_time` → `course_time` (nur HH:MM)
- `trainer` hinzufügen (aus Kurs-Daten)
- `promotion_type`, `promoted_at`, `course_id`, `end_time`, `membership` entfernen

---

## 6. `notify-no-show/index.ts` (No-Show Benachrichtigung)

**Aktuelles Format:**
```json
{
  "event_type": "no_show",
  "notification_method": "both",
  "user_id": "...",
  "email": "...",
  "phone": "...",
  "name": "Max",
  "course_id": "...",
  "course_title": "...",
  "course_date": "...",
  "course_time": "18:00",
  "trainer_name": "Flo",
  "marked_at": "..."
}
```

**Zielformat:**
```json
{
  "event_type": "no_show",
  "notification_method": "email | whatsapp | both",
  "phone": "4915730440756",
  "user_id": "uuid",
  "display_name": "Max Mustermann",
  "first_name": "Max",
  "email": "max@example.com",
  "course_title": "Functional Fitness",
  "course_date": "2025-02-01",
  "course_time": "18:00"
}
```

**Änderungen:**
- `name` → `display_name`
- `first_name` hinzufügen (bereits im Profil vorhanden)
- `course_id`, `trainer_name`, `marked_at` entfernen

---

## 7. `notify-course-invitation/index.ts` (Kurs-Einladung)

**Aktuelles Format:**
```json
{
  "event_type": "course_invitation",
  "notification_method": "both",
  "invitation_id": "...",
  "sender": {
    "user_id": "...",
    "name": "Anna",
    "avatar_url": "..."
  },
  "recipient": {
    "user_id": "...",
    "name": "Max",
    "email": "...",
    "phone": "..."
  },
  "course": {
    "id": "...",
    "title": "...",
    "date": "...",
    "time": "18:00 - 19:00",
    "trainer": "..."
  },
  "invitation_link": "...",
  "message": "...",
  "created_at": "..."
}
```

**Zielformat:**
```json
{
  "event_type": "course_invitation",
  "notification_method": "email | whatsapp | both",
  "sender": {
    "display_name": "Anna Musterfrau",
    "first_name": "Anna"
  },
  "recipient": {
    "display_name": "Max Mustermann",
    "first_name": "Max",
    "email": "max@example.com",
    "phone": "4915730440756"
  },
  "course": {
    "title": "Functional Fitness",
    "date": "2025-02-01",
    "time": "18:00",
    "trainer": "Flo"
  },
  "message": "Komm doch mit!"
}
```

**Änderungen:**
- `sender.user_id`, `sender.avatar_url` entfernen
- `sender.name` → `sender.display_name` + `sender.first_name`
- `recipient.user_id` entfernen
- `recipient.name` → `recipient.display_name` + `recipient.first_name`
- `course.id` entfernen
- `course.time`: "18:00 - 19:00" → "18:00" (nur Startzeit)
- `invitation_id`, `invitation_link`, `created_at` entfernen

---

## 8. `check-member-inactivity/index.ts` (Mitglied inaktiv)

**Aktuelles Format:**
```json
{
  "event_type": "member_inactivity_detected",
  "member": {
    "id": "...",
    "name": "Max",
    "email": "...",
    "membership_type": "...",
    "last_course_registration": "...",
    "days_inactive": 21
  },
  "detected_at": "..."
}
```

**Zielformat:**
```json
{
  "event_type": "member_inactive",
  "user_id": "uuid",
  "display_name": "Max Mustermann",
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@example.com",
  "membership_type": "Premium Member",
  "days_inactive": 14,
  "last_activity_date": "2025-01-15",
  "was_ever_active": true
}
```

**Änderungen:**
- `event_type`: `member_inactivity_detected` → `member_inactive`
- `member`-Objekt auflösen → flache Struktur
- `member.id` → `user_id`
- `member.name` → `display_name`
- `first_name`, `last_name` hinzufügen
- `last_course_registration` → `last_activity_date` (nur Datum)
- `was_ever_active: true` hinzufügen
- `detected_at` entfernen

---

## 9. `check-course-attendance/index.ts` (Kurs-Absage)

**Status:** Weitgehend korrekt, keine größeren Änderungen nötig

---

## 10. `send-news-email/index.ts` (News)

**Status:** Bereits korrekt implementiert

---

## Betroffene Dateien

| Datei | Priorität | Änderungsumfang |
|-------|-----------|-----------------|
| `supabase/functions/book-guest-training/index.ts` | Hoch | Groß (Struktur) |
| `supabase/functions/create-member/index.ts` | Mittel | Klein |
| `supabase/functions/register-wellpass/index.ts` | Mittel | Klein |
| `supabase/functions/notify-waitlist-promotion/index.ts` | Hoch | Mittel |
| `supabase/functions/process-waitlists/index.ts` | Hoch | Mittel |
| `supabase/functions/notify-no-show/index.ts` | Hoch | Klein |
| `supabase/functions/notify-course-invitation/index.ts` | Hoch | Mittel |
| `supabase/functions/check-member-inactivity/index.ts` | Hoch | Groß (Struktur) |

---

## Erwartetes Ergebnis

Nach der Implementierung senden alle Edge Functions exakt die Payload-Strukturen, die auf der Admin-Webhook-Tester-Seite definiert sind. Dies ermöglicht:
- Konsistente Filter in Make.com (`notification_method`, `phone`)
- Einheitliche Feldnamen für alle Szenarien
- Einfachere Konfiguration ohne manuelle Anpassungen pro Webhook
