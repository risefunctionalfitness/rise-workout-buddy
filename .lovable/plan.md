

# Share-Image bereinigen und Balkendiagramm sichtbar machen

## Aenderungen

### 1. Dekorative Hintergrund-Elemente entfernen (`src/lib/shareImageGenerator.ts`)

- Den Aufruf `drawDecorativeElements(ctx, width, height)` in Zeile 36 entfernen
- Die komplette Funktion `drawDecorativeElements` (Zeilen 117-195) entfernen
- Die komplette Funktion `drawDumbbell` (Zeilen 197-221) entfernen

Das Ergebnis: Sauberer dunkler Hintergrund mit rotem Gradient von unten, ohne Dumbbells, Kreise oder geschwungene Linien.

### 2. Balkendiagramm in der Card-Preview anzeigen (`src/components/highlights/AchievementsSlide.tsx`)

Das Mini-Balkendiagramm (Zeilen 96-110) existiert bereits im Code, wird aber moeglicherweise durch Layout-Probleme nicht korrekt angezeigt. Es wird sichergestellt, dass es sichtbar bleibt und korrekt dargestellt wird.

Das Balkendiagramm auf dem Canvas (`drawStreakChart`, Zeilen 379-461) bleibt ebenfalls erhalten -- es zeichnet die aufsteigenden roten Balken mit Trendlinie und Pfeil nach oben rechts, genau wie im Referenzbild.

### Zusammenfassung

| Element | Aktion |
|---|---|
| Dumbbells, Kreise, Kurven im Share-Image | Entfernen |
| `drawDecorativeElements` + `drawDumbbell` Funktionen | Entfernen |
| Balkendiagramm (Canvas: `drawStreakChart`) | Beibehalten |
| Balkendiagramm (Card-Preview: Mini-Bars) | Beibehalten |
| Flamme (stroke-only, kein Fill) | Keine Aenderung |
| "Streak" / "X Wochen" Text | Keine Aenderung |

