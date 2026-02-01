

## Plan: Test-Webhooks mit korrekten spezifischen Secrets verbinden

### Übersicht

Die Test-Funktionen sollen dieselben Webhook-URLs wie die produktiven Funktionen verwenden, nicht `MAKE_MAIN_WEBHOOK_URL`.

### Zuordnung der Secrets

| Test-Function | Produktive Function | Secret (sollte verwendet werden) |
|---------------|---------------------|----------------------------------|
| `send-test-registration-webhook` | `create-member` | `MAKE_MAIN_WEBHOOK_URL` |
| `send-test-guest-booking-webhook` | `book-guest-training` | `MAKE_GUEST_TICKET_WEBHOOK_URL` |
| `send-test-news-webhook` | `send-news-email` | `MAKE_NEWS_EMAIL_WEBHOOK_URL` |
| `send-test-waitlist-webhook` | `notify-waitlist-promotion` | `MAKE_WAITLIST_WEBHOOK_URL` |
| `send-test-noshow-webhook` | `notify-no-show` | `MAKE_NO_SHOW_WEBHOOK_URL` |
| `send-test-invitation-webhook` | `notify-course-invitation` | `MAKE_COURSE_INVITATION_WEBHOOK_URL` |
| `send-test-inactivity-webhook` | `check-member-inactivity` | `MAKE_REACTIVATION_WEBHOOK_URL` |
| `send-test-cancellation-webhook` | (bereits korrekt) | `MAKE_COURSE_CANCELLATION_WEBHOOK_URL` |
| `send-test-reactivation-webhook` | (bereits korrekt) | `MAKE_REACTIVATION_WEBHOOK_URL` |

### Änderungen pro Datei

**1. `supabase/functions/send-test-guest-booking-webhook/index.ts`**
```typescript
// VORHER:
const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL')
// NACHHER:
const webhookUrl = Deno.env.get('MAKE_GUEST_TICKET_WEBHOOK_URL')
```

**2. `supabase/functions/send-test-news-webhook/index.ts`**
```typescript
// VORHER:
const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL')
// NACHHER:
const webhookUrl = Deno.env.get('MAKE_NEWS_EMAIL_WEBHOOK_URL')
```

**3. `supabase/functions/send-test-waitlist-webhook/index.ts`**
```typescript
// VORHER:
const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL')
// NACHHER:
const webhookUrl = Deno.env.get('MAKE_WAITLIST_WEBHOOK_URL')
```

**4. `supabase/functions/send-test-noshow-webhook/index.ts`**
```typescript
// VORHER:
const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL')
// NACHHER:
const webhookUrl = Deno.env.get('MAKE_NO_SHOW_WEBHOOK_URL')
```

**5. `supabase/functions/send-test-invitation-webhook/index.ts`**
```typescript
// VORHER:
const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL')
// NACHHER:
const webhookUrl = Deno.env.get('MAKE_COURSE_INVITATION_WEBHOOK_URL')
```

**6. `supabase/functions/send-test-inactivity-webhook/index.ts`**
```typescript
// VORHER:
const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL')
// NACHHER:
const webhookUrl = Deno.env.get('MAKE_REACTIVATION_WEBHOOK_URL')
```

**7. `supabase/functions/send-test-registration-webhook/index.ts`**
- Bleibt bei `MAKE_MAIN_WEBHOOK_URL` (falls das korrekt ist für Registrierungen)
- ODER ändern auf `MAKE_REGISTRATION_WEBHOOK_URL` falls du ein separates Secret dafür hast

### Fehlende Secrets

Basierend auf den aktuell konfigurierten Secrets fehlen möglicherweise:
- `MAKE_WAITLIST_WEBHOOK_URL`
- `MAKE_GUEST_TICKET_WEBHOOK_URL`  
- `MAKE_REACTIVATION_WEBHOOK_URL`
- `MAKE_MAIN_WEBHOOK_URL` (für Registrierungen)
- `MAKE_COURSE_CANCELLATION_WEBHOOK_URL`

Falls diese noch nicht konfiguriert sind, müssen sie in den Edge Function Secrets hinzugefügt werden.

### Zusammenfassung

6 Edge Functions werden aktualisiert, um die korrekten spezifischen Webhook-URLs zu verwenden. Danach funktionieren alle Test-Buttons mit den jeweiligen Make.com Szenarien.

