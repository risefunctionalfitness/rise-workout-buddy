
Ziel
- Bei News-Benachrichtigungen sollen pro Empfänger im Make.com-Iterator die Felder `phone` und `notification_method` verfügbar sein, damit Make je Person korrekt zwischen E‑Mail / WhatsApp / beidem unterscheiden kann.

Aktuelle Ursache (warum es “leer” wirkt)
- Die produktive Edge Function `send-news-email` sendet News in Batches und liefert Empfänger als Array unter `emails: [...]` (pro Empfänger inkl. `phone` + `notification_method`).
- Die Test-Edge-Function `send-test-news-webhook` (und die Beispiel-Payload im Admin Webhook Tester) sendet aktuell eine flache Struktur ohne `emails[]` Batch-Struktur.
- Dadurch “lernt” Make.com beim Einrichten (Datenstruktur des Custom Webhooks / Iterator) ein anderes Schema. Wenn danach echte News-Batches kommen, erscheinen Felder auf Top-Level ggf. leer/fehlend, und im Iterator fehlen Felder, weil der Iterator auf ein anderes Objekt/Schema konfiguriert wurde.

Was ich ändern werde (ohne eure “separate Secrets” Struktur zu verändern)
1) Test-Webhook für News an Produktions-Payload angleichen
- Datei: `supabase/functions/send-test-news-webhook/index.ts`
- Änderung: Statt flacher Payload wird exakt die Batch-Struktur wie in `send-news-email` gesendet:
  - Top-Level: `event_type`, `batch_number`, `total_batches`, `total_recipients`, `timestamp`, `news: {...}`, `emails: [...]`
  - In `emails[]` (Iterator-Items): `email`, `first_name`, `last_name`, `membership_type`, `subject`, `body`, `notification_method`, `phone`
- Optional (hilft beim Debuggen in Make): 2 Beispiel-Empfänger im Array:
  - einer mit `notification_method: "both"` + `phone` gesetzt
  - einer mit `notification_method: "email"` + `phone: null`

2) Admin-Webhook-Tester (UI) Beispiel-Payload für “News Benachrichtigung” korrigieren
- Datei: `src/components/AdminWebhookTester.tsx`
- Änderung: `samplePayload` für `news_email` auf die gleiche Batch-Struktur umstellen (wie oben), damit du beim Copy/Paste in Make immer die echte Struktur siehst.

3) UI-Hinweistext im Webhook Tester präzisieren (damit Make richtig gebaut wird)
- Datei: `src/components/AdminWebhookTester.tsx`
- Anpassung der erklärenden “Filter in Make.com” Box:
  - Klarstellen: Bei News gilt pro Empfänger:
    - `emails[].notification_method`
    - `emails[].phone`
  - (Aktuell suggeriert der Text, dass `notification_method` immer top-level ist – bei News ist es pro Empfänger im Array.)

4) (Optional, aber empfehlenswert) Admin-News Empfänger-Vorschau um Kanal/Telefon erweitern
- Datei: `src/components/NewsManager.tsx`
- Problem: Die “Empfänger Liste” zeigt aktuell nur Namen/Membership/Status. Admins können nicht prüfen, ob WhatsApp/E-Mail pro Person korrekt erkannt wird.
- Änderung:
  - In `loadPreviewRecipients()` zusätzlich Felder laden: `notify_email_enabled`, `notify_whatsapp_enabled`, `phone_country_code`, `phone_number`
  - Im Dialog “Detaillierte Empfänger-Liste” pro Empfänger anzeigen:
    - berechnetes `notification_method` (email/whatsapp/both)
    - formatierte `phone` (oder “—” wenn nicht vorhanden)
  - Zusätzlich eine kleine Zusammenfassung: “X Email-only / Y WhatsApp-only / Z Both”.

Wie du es danach in Make.com korrekt testest (damit wirklich alles “pro Empfänger” auftaucht)
1) In Make.com beim News-Webhook einmal neu “Data structure redetermine” / “Run once” ausführen (oder den Custom Webhook neu anlegen), nachdem wir den Test-Webhook aktualisiert haben.
2) Den Test aus der App ausführen: `/admin → Webhooks → News Benachrichtigung → Test senden`
3) Den Iterator in Make auf `emails[]` setzen (nicht auf ein “Value”-Mapping, das Felder wegfiltert).
4) In den nachfolgenden Routen/Filtern je Bundle verwenden:
   - `notification_method` (aus dem Iterator-Item)
   - `phone` (aus dem Iterator-Item)
   - `email` (aus dem Iterator-Item)

Abnahmekriterien (Definition of Done)
- Make.com zeigt im Iterator bei News pro Bundle sichtbar:
  - `notification_method`
  - `phone` (gesetzt für WhatsApp/both, sonst null/leer)
- “Test senden” für News liefert genau die gleiche Struktur wie reale News-Sendungen.
- (Optional) In der Admin-Empfänger-Vorschau im NewsManager sieht man pro Empfänger den erkannten Kanal + Telefonnummer.

Risiken / Hinweise
- Wenn ein Mitglied WhatsApp nicht aktiviert hat oder keine Telefonnummer gespeichert ist, ist `notification_method` korrekt `email` und `phone` bleibt leer/null. Das ist erwartetes Verhalten.
- Falls in Make der Iterator aktuell auf ein transformiertes “Value” zeigt (z.B. manuell gemappte Felder), muss dort `phone` + `notification_method` explizit ergänzt oder direkt auf `emails[]` umgestellt werden.

Umsetzungsschritte (Reihenfolge)
1) `send-test-news-webhook` Payload auf Batch-Struktur umbauen
2) `AdminWebhookTester` News `samplePayload` + Hinweistext anpassen
3) (Optional) `NewsManager` Empfänger-Vorschau um Kanal/Telefon erweitern
4) Edge Function `send-test-news-webhook` deployen
5) End-to-end Test: Make “Run once” + Test senden + prüfen, dass Iterator-Felder pro Bundle vorhanden sind
