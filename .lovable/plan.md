

# Streak-Anzeige in Achievements korrigieren

## Probleme

1. **Falsches Icon**: Aktuell wird ein separates PNG-Asset (`streak-flame-icon.png`) geladen. Stattdessen soll das gleiche Lucide `Flame`-Icon verwendet werden, das auch im Header/StreakDisplay angezeigt wird.

2. **Falsche Textanordnung**: Aktuell wird "WOCHEN STREAK" als Label und darunter nur die Zahl "8" angezeigt. Gewuenscht ist:
   - Zeile 1: **Streak** (rot)
   - Zeile 2: **8 Wochen** (gross, weiss)

## Aenderungen

### 1. `src/components/highlights/AchievementsSlide.tsx`

**Label und Value tauschen fuer Streak-Karten:**
- Zeile 188-189: `value` aendern von `stats.currentStreak.toString()` zu `stats.currentStreak + " Wochen"`
- `label` aendern von `"WOCHEN STREAK"` zu `"Streak"`

**Card-Preview Layout anpassen (Zeile 84-92):**
- Reihenfolge umkehren: Zuerst Label (kleiner, rot/grau), dann Value (gross, bold)
- Fuer Streak-Typ: Label in Rot anzeigen

### 2. `src/lib/shareImageGenerator.ts`

**Custom Flame-Icon entfernen:**
- Die `loadStreakFlameIcon`-Funktion und die zugehoerige Variable entfernen (Zeilen 249-268)
- In `drawMainContent` den Streak-Sonderfall fuer das Custom-Icon entfernen (Zeilen 288-297)
- Stattdessen fuer alle Typen einheitlich `drawMainIcon` verwenden

**Streak-Text bereits korrekt:** Die `drawMainContent`-Funktion rendert bei Streak schon "Streak" + "X Wochen" - das bleibt so.

### 3. `src/assets/streak-flame-icon.png`

Diese Datei wird nicht mehr referenziert und kann entfernt werden (optional, keine funktionale Auswirkung).

## Ergebnis

- **Card-Preview**: Flame-Icon (Lucide) oben, "Streak" in der Mitte, "8 Wochen" gross darunter
- **Share-Image**: Gezeichnetes Flame-Icon (Canvas), "Streak" rot, "8 Wochen" weiss gross

