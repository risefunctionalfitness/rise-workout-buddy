# RISE App · Neue AGB anzeigen und freiwillig akzeptieren lassen

Briefing zum Einfügen in Lovable. Die Datenbank ist bereits vorbereitet
(Migration `20260910_terms_versioning.sql`), das Frontend fehlt noch.

---

## Ziel

Alle Nutzerinnen und Nutzer sehen die neue AGB-Fassung und können ihr
zustimmen. **Die Zustimmung ist freiwillig.** Wer sie überspringt, kann die
App uneingeschränkt weiter nutzen — insbesondere weiter Kurse buchen.

Das ist eine bewusste Entscheidung, keine Nachlässigkeit: Bei laufenden
Mitgliedschaften wäre eine erzwungene Zustimmung nicht freiwillig und damit
angreifbar. Bitte diese Regel nicht „aus Versehen“ verschärfen.

---

## Datenmodell (liegt schon)

| Tabelle | Zweck |
|---|---|
| `terms_documents` | Jede AGB-Fassung mit Text, Zusammenfassung und `published_at` |
| `terms_acceptances` | Wer wann welcher Fassung zugestimmt hat — Historie, wird nie überschrieben |
| `current_terms` (View) | Die aktuelle veröffentlichte Fassung plus `accepted_by_me` für den eingeloggten Nutzer |

`published_at IS NULL` heißt Entwurf: Die Fassung ist für Mitglieder
unsichtbar. Das ist der Aus-Schalter für den Rollout.

### Lesen

```ts
const { data: terms } = await supabase
  .from('current_terms')
  .select('version, title, body_md, summary_md, accepted_by_me')
  .maybeSingle();

// terms === null            -> keine veröffentlichte Fassung, nichts anzeigen
// terms.accepted_by_me      -> nichts anzeigen
// sonst                     -> Hinweis anzeigen
```

### Zustimmen

```ts
const { error } = await supabase
  .from('terms_acceptances')
  .insert({ user_id: user.id, version: terms.version, source: 'app' });
```

`user_id` muss die eigene ID sein, sonst greift die Row-Level-Security.
Ein zweiter Klick auf dieselbe Fassung läuft in den Unique-Constraint —
das ist kein Fehler, einfach abfangen und als „bereits zugestimmt“ behandeln.

---

## Oberfläche

### 1 · Hinweis nach dem Login

Ein **Banner** oben auf der Kursplan-Seite, keine Vollbild-Sperre:

> **Neue AGB seit 9. September 2026** — kurz durchlesen und bestätigen.
> [Ansehen] [Später]

- „Später“ blendet den Hinweis für diese Sitzung aus und zeigt ihn beim
  nächsten Start wieder. Nie dauerhaft blockieren.
- Nach dem dritten „Später“ nur noch ein dezenter Punkt im Profil-Menü —
  wer nicht will, soll nicht genervt werden.

### 2 · Der Dialog

Beim Klick auf „Ansehen“:

- **Titel:** Allgemeine Geschäftsbedingungen · Fassung vom 9. September 2026
- **Oben:** die Zusammenfassung aus `summary_md` — was sich geändert hat
- **Darunter:** der vollständige Text aus `body_md`, scrollbar, als Markdown
  gerendert
- **Unten:** eine Checkbox und zwei Buttons

```
☐  Ich habe die AGB gelesen und stimme ihnen zu.

     [ Zustimmen ]   [ Später ]
```

**Drei Dinge, die rechtlich zählen:**

1. Die Checkbox ist **nicht vorausgewählt**. Der Haken muss aktiv gesetzt
   werden, sonst ist es keine Zustimmung.
2. Der **Zustimmen-Button ist deaktiviert**, solange der Haken fehlt.
3. Der Text muss **vor** dem Zustimmen lesbar sein — nicht hinter einem Link,
   der erst danach kommt.

### 3 · Im Profil dauerhaft erreichbar

Unter „Profil“ oder „Einstellungen“ ein Eintrag **AGB**:

- aktuelle Fassung ansehen (immer, auch nach Zustimmung)
- darunter der eigene Stand: „Zugestimmt am 12.09.2026, Fassung 2026-09-09“
  oder „Noch nicht zugestimmt“ mit Button

### 4 · Neue Registrierungen

Beim Anlegen eines Accounts (inklusive Wellpass) wird die aktuelle Fassung
wie bisher angezeigt und akzeptiert — nur schreibt der Flow jetzt zusätzlich
nach `terms_acceptances`, damit die Fassung mitgespeichert wird.

---

## Was NICHT gebaut werden soll

- **Keine Sperre der Kursbuchung.** Weder direkt noch indirekt über einen
  Dialog, der sich nicht schließen lässt.
- **Kein „Akzeptieren“ der Datenschutzerklärung.** Die ist eine Information
  und wird nur verlinkt, nicht bestätigt.
- **Kein Überschreiben** alter Einträge in `terms_acceptances`.
- **Kein Löschen** von Fassungen aus `terms_documents` — das Archiv ist der
  Nachweis.

---

## Reihenfolge beim Ausrollen

1. Migration einspielen (erledigt, sobald freigegeben)
2. Neue Fassung als Entwurf einfügen — `published_at` bleibt NULL
3. Frontend bauen und mit einem Testaccount prüfen
4. `published_at` setzen → ab jetzt sehen es alle
5. Nach zwei Wochen Zustimmungsquote prüfen

Solange Schritt 4 nicht passiert ist, sieht kein Mitglied etwas. Falls im
Frontend noch etwas klemmt, `published_at` wieder auf NULL setzen — der
Hinweis verschwindet sofort, ohne Deployment.

```sql
-- live schalten
update public.terms_documents set published_at = now() where version = '2026-09-09';

-- wieder verstecken
update public.terms_documents set published_at = null where version = '2026-09-09';

-- Quote prüfen
select count(*) filter (where a.version = '2026-09-09') as zugestimmt,
       (select count(*) from public.profiles where user_id is not null) as gesamt
from public.terms_acceptances a;
```
