

## Ursache gefunden: Edge Function `process-waitlists` ignoriert Gäste

### Smoking Gun

Die Edge Function `supabase/functions/process-waitlists/index.ts` läuft alle 5 Minuten als Cron-Job (`*/5 * * * *`) und prüft, ob in einem Kurs Plätze frei sind, um Waitlist-User hochzubefördern. Zeile 83–85:

```ts
const registeredCount = registrations?.filter(r => r.status === 'registered').length || 0;
const availableSpots = course.max_participants - registeredCount;
```

**Sie zählt ausschließlich Mitglieder (`course_registrations`), Gäste (`guest_registrations`) werden komplett ignoriert.** Folge: ein Kurs mit 12 Members + 4 Gästen (=16/16) sieht für die Funktion wie 12/16 aus → 4 freie Plätze → 4 Waitlist-User werden auf `registered` gesetzt → **20/16**.

### Warum die Mathematik exakt passt

Beispiel **Functional Fitness 04.04.2026** (max 16, am Ende 20):
- Bis 01.04. 18:38 sind 12 Members + 4 Gäste = 16/16 ✅ Kurs voll
- 01.04. 20:48 bis 02.04. 11:55: 8 weitere Members buchen
- `register_for_course` setzt sie korrekt auf `waitlist` (zählt Gäste mit)
- Jeder 5-Minuten-Tick von `process-waitlists` sieht "12 members → 4 freie Plätze" und befördert 4 Waitlist-User
- Beim nächsten Tick: "13 members → 3 freie Plätze" → noch einer hoch
- Etc., bis alle 8 Waitlist-User auf `registered` stehen → **16 + 4 = 20**

Das gleiche Muster passt zu allen 5 Functional-Fitness-Kursen mit Gästen, die überbucht waren.

### Warum es bei reinen Member-Kursen (Mobility 21.01., FF 21.11. usw.) trotzdem passiert ist

Bei diesen Kursen gibt es eine **andere, kleinere Ursache** (vermutlich knappes Doppel-Promotion-Race in `process_waitlists_on_cancellation` durch parallele Stornierungen). Diese Fälle sind selten (16/15 oder 17/16 statt 20/16) und durch denselben Capacity-Trigger trotzdem mitabgefangen.

### Fix-Plan

**1. `process-waitlists` Edge Function reparieren** – die kritische Zeile fixen:

```ts
// Vorher: nur members
const registeredCount = registrations?.filter(r => r.status === 'registered').length || 0;

// Nachher: members + guests
const { count: guestCount } = await supabase
  .from('guest_registrations')
  .select('*', { count: 'exact', head: true })
  .eq('course_id', course.id)
  .eq('status', 'registered');
const totalRegistered = registeredCount + (guestCount || 0);
const availableSpots = course.max_participants - totalRegistered;
```

Damit hört der Bug sofort auf – ab dem nächsten Cron-Tick werden keine fälschlichen Promotions mehr durchgeführt.

**2. BEFORE-Trigger `assert_course_capacity` als Sicherheitsnetz** auf `course_registrations` und `guest_registrations`. Wirft Exception, wenn die Operation den Kurs überbuchen würde. Damit ist Überbuchung **technisch unmöglich**, egal über welchen Pfad – auch falls in Zukunft jemand wieder versehentlich Gäste vergisst zu zählen, oder eine andere Edge Function ähnlichen Bug hat.

**3. `register_for_course` und `book-guest-training` fangen die Capacity-Exception ab.** `register_for_course` gibt `status='waitlist'` zurück (Verhalten unverändert), `book-guest-training` gibt 400 mit "Kurs ist voll" zurück.

**4. Audit-Log-Tabelle `registration_audit_log`** mit Trigger – protokolliert OLD/NEW + `current_user` bei jedem INSERT/UPDATE auf beide Tabellen. Damit sehen wir bei künftigen Anomalien innerhalb von Sekunden, wer was wann geändert hat.

**5. Waitlist-Logik bleibt unverändert.** `process_waitlists_on_cancellation` (DB-Trigger) und `process-waitlists` (Cron) machen weiterhin Promotions – nur jetzt mit korrekter Capacity-Berechnung. Niemand wird automatisch auf Waitlist verschoben oder anders behandelt.

**6. Bestehende überbuchte Kurse:** ich liefere dir die Liste, du entscheidest manuell im Admin-UI, wer entfernt wird.

### Geänderte/neue Dateien

- `supabase/functions/process-waitlists/index.ts` – Capacity-Berechnung inkl. Gäste (eigentlicher Fix)
- `supabase/functions/book-guest-training/index.ts` – Capacity-Exception abfangen
- Neue Migration: BEFORE-Trigger `assert_course_capacity` auf beiden Tabellen
- Neue Migration: `register_for_course` mit EXCEPTION-Handling für Capacity-Fehler
- Neue Migration: Tabelle `registration_audit_log` + AFTER-Trigger
- Liste der aktuell überbuchten Kurse als Output für deine manuelle Bereinigung

### Ergebnis

- Der Hauptbug (Gäste werden vom Cron-Job vergessen) ist sofort behoben
- Capacity-Trigger garantiert auf DB-Ebene, dass künftig kein Pfad mehr überbucht
- Audit-Log macht künftige Anomalien sofort diagnostizierbar
- Waitlist-Verhalten für Member identisch zu heute, niemand wird automatisch verschoben

