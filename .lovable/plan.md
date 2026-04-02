

## Passwort-Zuruecksetzen auf der Login-Seite

### Konzept

Ein "Passwort vergessen?"-Link auf der Login-Seite. Bei Klick oeffnet sich ein Dialog, in dem der Nutzer seine E-Mail eingibt. Eine neue Edge Function generiert ein zufaelliges 6-stelliges Passwort, setzt es via `auth.admin.updateUserById` und sendet es zusammen mit der E-Mail an einen Make.com-Webhook (aus `webhook_settings` mit Typ `password_reset`).

### Aenderungen

**1. Neue Edge Function: `supabase/functions/reset-password/index.ts`**
- Empfaengt `{ email }` im Body (kein Auth-Header noetig -- oeffentlich aufrufbar)
- Sucht den User in `auth.users` via `supabaseAdmin.auth.admin.listUsers()` anhand der E-Mail
- Wenn nicht gefunden: generische Erfolgsmeldung (kein Hinweis ob E-Mail existiert)
- Generiert 6-stelliges Zufallspasswort
- Setzt Passwort via `supabaseAdmin.auth.admin.updateUserById()`
- Aktualisiert `profiles.access_code` mit dem neuen Code
- Laedt Webhook-URL aus `webhook_settings` (Typ `password_reset`)
- Sendet Payload an Make.com: `{ event_type: "password_reset", email, new_password, first_name, last_name }`

**2. `src/pages/Auth.tsx` -- Dialog + Button**
- State: `resetDialogOpen`, `resetEmail`, `resetLoading`
- "Passwort vergessen?" Link unter dem Login-Button
- Dialog mit E-Mail-Eingabe und "Neues Passwort anfordern" Button
- Ruft `supabase.functions.invoke('reset-password', { body: { email } })` auf
- Zeigt Erfolgsmeldung unabhaengig davon ob E-Mail existiert (Sicherheit)

**3. Admin Webhook-Konfiguration**
- In der bestehenden Webhook-Settings Verwaltung muss ein neuer Typ `password_reset` angelegt werden, damit der Admin die Make.com-URL dafuer konfigurieren kann

### Dateien
- Neue Edge Function: `supabase/functions/reset-password/index.ts`
- `src/pages/Auth.tsx` (Dialog + Link hinzufuegen)

