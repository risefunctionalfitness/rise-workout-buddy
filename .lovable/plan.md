

## Zwei Anpassungen an den Persoenlichen Highlights

### 1. Tatsaechliche Trainingstage anzeigen (statt sequentiell)

**Problem:** Aktuell wird nur die Anzahl der Trainings diese Woche gezaehlt (`thisWeekTrainings = 3`), und dann werden einfach die ersten 3 Tage (Mo, Di, Mi) markiert. Stattdessen muessen die tatsaechlichen Wochentage markiert werden.

**Loesung:**

- **`UserStats` Interface erweitern** (`src/hooks/useUserAchievements.ts`): Neues Feld `thisWeekTrainingDays: number[]` hinzufuegen (Array mit Wochentag-Indizes 0-6 fuer Mo-So).
- **Berechnung anpassen** (`src/hooks/useUserAchievements.ts`): Beim Zaehlen der Wochentrainings auch den Wochentag jedes Trainings speichern (0=Mo, 1=Di, ..., 6=So).
- **MiniChart aktualisieren** (`src/components/highlights/MiniChart.tsx`): `WeeklyMiniChart` nutzt `stats.thisWeekTrainingDays` statt `i < completed`, um die richtigen Tage zu markieren.
- **Share-Image aktualisieren** (`src/lib/shareImageGenerator.ts`): `drawWeeklyChart` erhaelt das Array der tatsaechlichen Tage statt nur die Anzahl, und markiert die korrekten Kreise.

### 2. Separater Download-Button im Share-Dialog

**Problem:** Aktuell gibt es nur einen kombinierten "Teilen / Speichern"-Button, der zuerst die Web Share API versucht und nur als Fallback herunterlaed.

**Loesung:**

- **Zweiten Button hinzufuegen** (`src/components/highlights/ShareDialog.tsx`): Neben dem bestehenden Teilen-Button kommt ein separater "Herunterladen"-Button mit Download-Icon, der das Bild direkt als Datei speichert.

### Technische Details

**Neues Feld in UserStats:**
```text
thisWeekTrainingDays: number[]  // z.B. [1, 4] fuer Di und Fr
```

**Berechnung der Trainingstage:**
```text
Fuer jede Buchung/Training dieser Woche:
  -> Wochentag berechnen (0=Mo bis 6=So)
  -> In Set sammeln (Duplikate vermeiden)
  -> Als sortiertes Array speichern
```

**Share-Dialog Layout:**
```text
[Instagram-Icon  Auf Instagram teilen]   (voller breite)
[Download-Icon   Herunterladen      ]   (outline, volle Breite)
```

**Betroffene Dateien:**
- `src/hooks/useUserAchievements.ts` - Stats-Interface und Berechnung
- `src/components/highlights/MiniChart.tsx` - WeeklyMiniChart Anzeige
- `src/lib/shareImageGenerator.ts` - drawWeeklyChart Funktion
- `src/components/highlights/ShareDialog.tsx` - Download-Button
