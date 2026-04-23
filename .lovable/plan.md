

## Plan: Kraftwerte-Seite modernisieren + erweiterte Standard-Lifts + Datum

### 1. Erweiterte Standard-Lifts (nur diese, keine anderen)

Bestand bleibt: Front Squat, Back Squat, Deadlift, Bench Press, Snatch, Clean, Jerk, Clean & Jerk.

Neu hinzu:
- **Olympic**: Power Snatch, Power Clean, Hang Snatch, Hang Clean, Push Jerk, Split Jerk, Squat Snatch, Squat Clean
- **Pressing**: Strict Press, Push Press
- **Squat**: Overhead Squat

Damit die `profiles`-Tabelle nicht mit 11 neuen Spalten aufgebläht wird, kommen die neuen Lifts in die in vorherigem Plan vereinbarte Tabelle `strength_history`. Die alten 8 bleiben weiter in `profiles` (kein Datenverlust, keine Migration der Werte nötig).

### 2. Modernisierte Kraftwerte-Seite (`StrengthValues.tsx`)

**Heute**: Liste aus 8 Inputs untereinander mit Label links, kleinem Input rechts. Eigene Übungen als Karten darunter. Alles sehr listig, kein Datum, keine Gruppierung, keine Visualisierung.

**Neu** – ein Screen, drei Sektionen, Mobile-first für 390px:

```text
┌──────────────────────────────────────┐
│  ← Kraftwerte                        │
├──────────────────────────────────────┤
│  [ Squat | Pull | Press | Olympic |  │  ← Segmented Tabs
│    Eigene ]                          │
├──────────────────────────────────────┤
│  Squat                               │
│  ┌────────────────────────────────┐  │
│  │ Back Squat                     │  │
│  │ 140 kg                          │  │  ← Aktueller Wert prominent
│  │ zuletzt 04.04.2026             │  │  ← Datum
│  │                          [✎]   │  │  ← Edit-Button
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Front Squat                    │  │
│  │ — kg   "noch nicht erfasst"    │  │  ← Empty State
│  │                          [+]   │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Overhead Squat                 │  │
│  │ — kg                           │  │
│  │                          [+]   │  │
│  └────────────────────────────────┘  │
│  ...                                 │
└──────────────────────────────────────┘

                                   ⊕   ← Floating + Button
```

**Gruppierung der Tabs**:
- **Squat**: Front Squat, Back Squat, Overhead Squat
- **Pull**: Deadlift
- **Press**: Bench Press, Strict Press, Push Press
- **Olympic**: Snatch, Power Snatch, Hang Snatch, Squat Snatch, Clean, Power Clean, Hang Clean, Squat Clean, Jerk, Push Jerk, Split Jerk, Clean & Jerk
- **Eigene**: alle Custom-Lifts aus `strength_history` mit `lift_type='custom'`

**Lift-Card Design**:
- `rounded-xl border border-primary/10 bg-card p-4`
- Übungsname oben (medium font)
- Wert groß und primary-color (`text-2xl font-bold text-primary`)
- Datum klein muted darunter
- Wenn kein Wert: gedämpft, "—  noch nicht erfasst", Plus-Icon-Button rechts
- Wenn Wert vorhanden: Edit-Pencil-Icon rechts, öffnet Dialog vorausgefüllt

### 3. Edit-/Add-Dialog (gemeinsam mit Prozentrechner)

Eine wiederverwendbare Komponente `AddStrengthValueDialog.tsx`:
- Modus `add` oder `edit`
- Felder: Übung (gesperrt im Edit-Modus, sonst Select / freier Name), Gewicht (kg), Datum (Shadcn-Datepicker, Default heute, max heute, deutsche Locale, `pointer-events-auto`)
- Bei Edit zusätzlich Button "Eintrag löschen" (mit Confirm)
- Speichern: für die 8 alten Standard-Lifts ZUSÄTZLICH `profiles.*_1rm` updaten (Synchronität), neue Standard-Lifts und Custom-Lifts nur in `strength_history`
- Nach Speichern Toast + Liste neu laden

### 4. Floating "+" Button

Auch auf der Kraftwerte-Seite unten rechts (`fixed bottom-6 right-4 h-14 w-14 rounded-full shadow-lg`). Öffnet denselben Dialog im `add`-Modus, vor-selektierter Tab-Kontext bestimmt nichts (User wählt Übung selbst).

Der bisherige "Übung hinzufügen"-Workflow (Inline-Karten unten) wird durch den Dialog abgelöst – sauberer, mit Datum, ohne Doppellogik.

### 5. Verlauf pro Übung (optional, klein)

Tap auf eine Lift-Card öffnet darunter einen Aufklapp-Bereich mit den letzten 5 Einträgen aus `strength_history` für diese Übung (Datum · Gewicht · kleiner Trend-Pfeil ↑/↓ vs. vorigem Wert). Verlauf zeigt nur, was tatsächlich erfasst wurde – keine künstliche History für die alten Profil-Werte.

### 6. Datenmodell – `strength_history` (wie zuvor abgesegnet)

```text
strength_history
├── id           uuid PK
├── user_id      uuid (Index)
├── lift_type    text  ('standard' | 'custom')
├── lift_name    text
├── weight_kg    numeric
├── achieved_on  date
├── created_at   timestamptz
└── updated_at   timestamptz
```

RLS: User CRUD eigene Zeilen; Admins lesen alles. Index `(user_id, lift_name, achieved_on DESC)`.

### 7. Lade-Strategie (Single Source of Truth)

`StrengthValues` und `PercentageCalculator` laden parallel:
1. `profiles` für die 8 alten 1RM-Felder
2. `strength_history` für ALLE Werte mit Datum

Pro `lift_name` wird der **aktuellste Wert** angezeigt (Vergleich über `achieved_on`). Bei Konflikt zwischen Profil-Wert (kein Datum) und History-Eintrag gewinnt der History-Eintrag, da datiert.

### 8. Geänderte / neue Dateien

- **Neue Migration**: Tabelle `strength_history` + RLS + `updated_at`-Trigger
- **Neue Konstante** `src/constants/standardLifts.ts`: alle Standard-Lifts mit Gruppe ('squat' | 'pull' | 'press' | 'olympic')
- **Neue Komponente** `src/components/AddStrengthValueDialog.tsx`: Add + Edit + Delete + Datepicker
- **Überarbeitet** `src/components/StrengthValues.tsx`: Tabs, Lift-Cards mit Datum, Floating-Button, Verlauf-Aufklapp, Dialog-Integration; alte Inline-Inputs/Custom-Karten ersetzt
- **Überarbeitet** `src/components/PercentageCalculator.tsx` (parallel zur vorigen Plan-Iteration): nutzt dieselben Datenquellen und denselben Dialog, Floating-Button öffnet identischen Add-Dialog

### Ergebnis

- Übersichtliche, moderne Kraftwerte-Seite mit Gruppierung statt langer Liste
- Genau die gewünschten neuen Standard-Lifts ergänzt, nichts darüber hinaus
- Datum sauber pro Wert gespeichert, Verlauf je Übung anzeigbar
- Ein Add/Edit-Dialog wird sowohl von der Kraftwerte-Seite als auch vom Prozentrechner genutzt – keine Duplikation
- Die 8 alten Profil-Spalten werden weiter synchron gepflegt, damit nichts in der App bricht

