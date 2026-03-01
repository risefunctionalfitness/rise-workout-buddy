

# Fairness Score UI-Fixes

## Probleme

1. **Badge im Header**: Soll entfernt werden aus `TrainingPathHeader.tsx`
2. **Badge zeigt "L4" Text**: Soll nur das Icon in der Farbe zeigen, groesser
3. **Skala-Marker falsch positioniert**: Die Skala geht von 0% bis 50%+, aber der Marker nutzt `score.score` direkt als CSS-Prozent. Bei 43% Score landet der Marker bei 43% der Barbreite -- aber 43% auf einer 0-50-Skala muesste bei ~86% der Barbreite liegen
4. **Score mit Dezimalstellen**: 43.478... statt gerundet
5. **Design zu klein/unuebersichtlich**: Alles soll groesser, cleaner, moderner

## Aenderungen

### 1. TrainingPathHeader.tsx
- `ReliabilityScoreBadge` und `useReliabilityScore` Import + Nutzung entfernen
- Nur Avatar, Logo, Streak, Admin-Button bleiben

### 2. ReliabilityScoreBadge.tsx
- "L{score.level}" Text entfernen -- nur Gauge-Icon
- Icon groesser machen (h-7 w-7 statt h-5 w-5)
- Modal-Design komplett ueberarbeiten:
  - Score gross und zentral als Zahl anzeigen (ganzzahlig gerundet)
  - Gradient-Skala groesser (h-4 statt h-3)
  - Level-Tabelle mit mehr Abstand, groesserer Schrift
  - Aktives Level staerker hervorgehoben (farbiger Rahmen statt nur bg-muted)
  - Mehr whitespace, groessere Texte

### 3. ReliabilityScoreScale.tsx
- **Marker-Position fixen**: `markerPosition = (score.score / 50) * 100` statt direkt `score.score`. Die Skala repraesentiert 0-50%+, also muss der Score auf diese Spanne gemappt werden
- Skala groesser (h-4), Marker groesser (w-5 h-5)
- Labels groesser (text-xs statt text-[10px])

### 4. useReliabilityScore.ts
- Score auf ganze Zahl runden: `Math.round(score)` statt Dezimalwert
- `getProjectedScore` ebenfalls ganzzahlig runden

## Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/components/TrainingPathHeader.tsx` | Badge + Hook entfernen |
| `src/components/ReliabilityScoreBadge.tsx` | Level-Text weg, Icon groesser, Modal-Design modern |
| `src/components/ReliabilityScoreScale.tsx` | Marker-Position fixen (Score/50*100), alles groesser |
| `src/hooks/useReliabilityScore.ts` | Score ganzzahlig runden |

