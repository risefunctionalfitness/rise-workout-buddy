## Ziel

WhatsApp-Funktionalität app-weit temporär deaktivieren, aber so, dass sie mit einem einzigen Schalter wieder aktiviert werden kann, sobald das Business-Cloud-Problem gefixt ist.

## Ansatz: zentraler Feature-Flag

Neue Datei `src/config/features.ts` (und Spiegel `supabase/functions/_shared/features.ts`):

```ts
export const WHATSAPP_ENABLED = false;
```

Wenn das Problem gefixt ist → einfach auf `true` setzen, fertig.

## Frontend-Änderungen

**Widgets (Telefon-Eingabe entfernen, wenn Flag aus):**
- `src/pages/EmbedKursplan.tsx` (Zeilen 328–355 und 622–650): Telefon-Block in `{WHATSAPP_ENABLED && (...)}` einwickeln. Beim Submit `phoneNumber: null` senden, wenn Flag aus.
- `src/pages/EmbedWellpass.tsx` (Zeilen 187–215): gleich.

**App-UI (Eingabe/Toggle ausblenden, wenn Flag aus):**
- `src/components/PhoneNumberDialog.tsx`: Dialog rendert `null`, wenn Flag aus (kein Onboarding-Prompt mehr).
- `src/components/UserProfile.tsx`: WhatsApp-Toggle + Telefon-Felder ausblenden, wenn Flag aus. Bestehende gespeicherte Nummern bleiben in der DB unverändert.
- `src/components/FirstLoginDialog.tsx` / Onboarding-Flow: Phone-Prompt-Schritt überspringen, wenn Flag aus.

Hinweis: Wir löschen keine bestehenden Nummern in der DB – nur UI verstecken und keine neuen Sends auslösen.

## Backend-Änderungen (Edge Functions)

In allen Webhook-sendenden Functions: `notification_method` darf nie `whatsapp` oder `both` enthalten, `phone` immer `null`, solange Flag aus. Effektiv wird `wantsWhatsApp` hart auf `false` gezwungen.

Betroffen:
- `supabase/functions/notify-no-show/index.ts`
- `supabase/functions/notify-waitlist-promotion/index.ts`
- `supabase/functions/notify-course-invitation/index.ts`
- `supabase/functions/process-waitlists/index.ts`
- `supabase/functions/dispatch-waitlist-webhooks/index.ts`
- `supabase/functions/check-course-attendance/index.ts`
- `supabase/functions/book-guest-training/index.ts` (Gast-Buchung Webhook)
- `supabase/functions/register-wellpass/index.ts`
- `supabase/functions/send-news-email/index.ts`
- `supabase/functions/create-member/index.ts`

Zentraler Helper `supabase/functions/_shared/features.ts` mit `WHATSAPP_ENABLED = false` + Helper `resolveNotificationMethod(profile)` der nur noch `'email'` oder `'none'` zurückgibt, wenn Flag aus. Jede Function importiert diesen Helper statt eigener Logik.

Wenn ein User **nur** WhatsApp aktiviert hatte (Email aus, WhatsApp an) → fallback auf `email`, damit er nicht komplett ohne Benachrichtigung dasteht (sonst würden viele User aktuell gar nichts mehr bekommen).

## Admin-Hinweis (optional, klein)

In `AdminWebhookTester.tsx` einen kleinen Hinweis „WhatsApp aktuell deaktiviert" anzeigen, wenn Flag aus, damit Admin nicht verwirrt ist.

## Re-Aktivierung später

Sobald Business Cloud wieder läuft:
1. `WHATSAPP_ENABLED = true` in `src/config/features.ts` **und** `supabase/functions/_shared/features.ts`
2. Edge Functions werden automatisch deployed.

Keine DB-Migration, keine Datenverluste, alle bestehenden Telefonnummern & Präferenzen bleiben erhalten.

## Dateien

**Neu:**
- `src/config/features.ts`
- `supabase/functions/_shared/features.ts`

**Geändert:**
- `src/pages/EmbedKursplan.tsx`, `src/pages/EmbedWellpass.tsx`
- `src/components/PhoneNumberDialog.tsx`, `src/components/UserProfile.tsx`, `src/components/FirstLoginDialog.tsx`
- `src/components/AdminWebhookTester.tsx` (Hinweis)
- 10 Edge Functions (siehe Liste oben)
