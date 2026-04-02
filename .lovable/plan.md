

## Fix: Password Reset Webhook per Secret statt DB-Tabelle

### Problem
Die `reset-password` Edge Function holt die Webhook-URL aus der `webhook_settings`-Tabelle. Alle anderen Webhooks im Projekt nutzen aber `Deno.env.get('MAKE_..._WEBHOOK_URL')` -- also Supabase Edge Function Secrets.

### Loesung
In `supabase/functions/reset-password/index.ts` die DB-Abfrage durch `Deno.env.get('MAKE_PASSWORD_RESET_WEBHOOK_URL')` ersetzen.

### Aenderung
**`supabase/functions/reset-password/index.ts`** (Zeilen 91-107):
- Entferne die `webhook_settings`-Abfrage
- Ersetze durch: `const webhookUrl = Deno.env.get('MAKE_PASSWORD_RESET_WEBHOOK_URL')`
- Gleiche Fehlerbehandlung wie bei den anderen Functions (`console.warn` wenn nicht konfiguriert)

### Nach dem Deployment
Du musst das Secret `MAKE_PASSWORD_RESET_WEBHOOK_URL` mit der Make.com URL in den Supabase Edge Function Secrets hinterlegen.

