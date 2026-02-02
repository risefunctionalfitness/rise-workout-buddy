
# Plan: Webhook-Payloads an Tester-Format angleichen (Final Check)

## Gefundene Inkonsistenzen

### 1. Course Invitation (notify-course-invitation/index.ts)

**Ist-Zustand (Edge Function - Zeile 147-167):**
```json
{
  "event_type": "course_invitation",
  "notification_method": "both",
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

**Soll-Zustand (AdminWebhookTester - Zeile 161-181):**
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

**Status: KORREKT** - Die Struktur stimmt exakt überein.

---

### 2. Course Cancellation (check-course-attendance/index.ts)

**Ist-Zustand (Edge Function - Zeile 183-197):**
```json
{
  "event_type": "course_cancelled_low_attendance",
  "course": {
    "id": "uuid",
    "title": "Functional Fitness",
    "date": "2025-02-01",
    "start_time": "18:00:00",
    "end_time": "19:00:00",
    "trainer": "Flo"
  },
  "registered_count": 2,
  "minimum_required": 3,
  "participants": [...],
  "cancelled_at": "2025-02-01T10:00:00Z"
}
```

**Soll-Zustand (AdminWebhookTester - Zeile 189-205):**
```json
{
  "event_type": "course_cancelled_low_attendance",
  "course": {
    "id": "uuid",
    "title": "Functional Fitness",
    "date": "2025-02-01",
    "start_time": "18:00:00",
    "end_time": "19:00:00",
    "trainer": "Flo"
  },
  "registered_count": 2,
  "minimum_required": 3,
  "participants": [...],
  "cancelled_at": "2025-02-01T10:00:00Z"
}
```

**Status: KORREKT** - Die Struktur stimmt exakt überein.

---

### 3. Mitglieder-Registrierung (create-member/index.ts)

**Ist-Zustand (Zeile 163-173):**
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
  "membership_type": "Premium Member"
}
```

**Soll-Zustand (Zeile 25-35):**
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

**Status: KORREKT** - Die Struktur stimmt exakt überein.

---

### 4. Wellpass Registrierung (register-wellpass/index.ts)

**Ist-Zustand (Zeile 164-174):**
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
  "membership_type": "Wellpass"
}
```

**Status: KORREKT** - Identisch zur Mitglieder-Registrierung.

---

### 5. Gast-Buchung (book-guest-training/index.ts)

**Ist-Zustand (Zeile 151-163):**
```json
{
  "event_type": "guest_ticket",
  "notification_method": "both",
  "phone": "4915730440756",
  "ticket_id": "RISE-ABC123",
  "guest_name": "Max Mustermann",
  "guest_email": "max@example.com",
  "booking_type": "probetraining",
  "course_title": "Functional Fitness",
  "course_date": "2025-02-01",
  "course_time": "18:00",
  "trainer": "Flo"
}
```

**Soll-Zustand (Zeile 62-73):**
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

**Status: KORREKT** - Die Struktur stimmt exakt überein.

---

### 6. News Email (send-news-email/index.ts)

**Ist-Zustand (Zeile 261-273):**
```json
{
  "event_type": "news_email",
  "batch_number": 1,
  "total_batches": 1,
  "total_recipients": 50,
  "timestamp": "2025-02-01T10:00:00Z",
  "news": {
    "id": "uuid",
    "title": "News Titel",
    "content": "<p>HTML Inhalt...</p>"
  },
  "emails": [...]
}
```

**Soll-Zustand (Zeile 82-114):**
```json
{
  "event_type": "news_email",
  "batch_number": 1,
  "total_batches": 1,
  "total_recipients": 2,
  "timestamp": "2025-02-01T10:00:00Z",
  "news": {
    "id": "uuid",
    "title": "News Titel",
    "content": "<p>HTML Inhalt der News...</p>"
  },
  "emails": [...]
}
```

**Status: KORREKT** - Die Struktur stimmt exakt überein.

---

### 7. Wartelisten-Aufrückung (notify-waitlist-promotion/index.ts)

**Ist-Zustand (Zeile 114-126):**
```json
{
  "event_type": "waitlist_promotion",
  "notification_method": "both",
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

**Soll-Zustand (Zeile 122-134):**
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

**Status: KORREKT** - Die Struktur stimmt exakt überein.

---

### 8. No-Show (notify-no-show/index.ts)

**Ist-Zustand (Zeile 114-125):**
```json
{
  "event_type": "no_show",
  "notification_method": "both",
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

**Soll-Zustand (Zeile 142-153):**
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

**Status: KORREKT** - Die Struktur stimmt exakt überein.

---

### 9. Mitglied inaktiv (check-member-inactivity/index.ts)

**Aus provided code (Zeile 90-99):**
```json
{
  "event_type": "member_inactive",
  "user_id": "uuid",
  "display_name": "Max Mustermann",
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@example.com",
  "membership_type": "Premium Member",
  "days_inactive": 21,
  "last_activity_date": "2025-01-15",
  "was_ever_active": true
}
```

**Soll-Zustand (Zeile 233-244):**
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

**Status: KORREKT** - Die Struktur stimmt exakt überein.

---

## Zusammenfassung

Nach der detaillierten Prüfung **stimmen alle Edge Function Payloads exakt mit den AdminWebhookTester-Definitionen überein**. 

**Alle 9 Webhook-Typen sind korrekt strukturiert:**
1. Mitglieder-Registrierung (create-member)
2. Wellpass Registrierung (register-wellpass)
3. Gast-Buchung (book-guest-training)
4. News Email (send-news-email)
5. Wartelisten-Aufrückung (notify-waitlist-promotion)
6. No-Show (notify-no-show)
7. Kurs-Einladung (notify-course-invitation)
8. Kurs-Absage (check-course-attendance)
9. Mitglied inaktiv (check-member-inactivity)

Die einzige noch offene Aufgabe ist die Datenbankfunktion `process_waitlists_on_cancellation`, die bereits mit der letzten Migration aktualisiert wurde.

---

## Nächste Schritte

Da alle Edge Functions korrekt sind, solltest du prüfen:
1. **Wurden die Edge Functions deployed?** - Manchmal werden Änderungen erst nach einem Deploy aktiv
2. **Gibt es alte Webhooks in Make.com?** - Alte Webhook-Strukturen könnten noch gecached sein
3. **Test der Einladungs-Funktion** - Kannst du mir zeigen, was Make.com tatsächlich empfängt?
