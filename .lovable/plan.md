

## Fixes

### 1. Milestone-Anzeige schmaler machen
Die Breite des Meilenstein-Charts (`chartWidth`) wird von `width * 0.7` auf `width * 0.55` reduziert -- sowohl im Canvas-Share-Bild (`shareImageGenerator.ts`) als auch in der UI-Vorschau (`MiniChart.tsx`). Die vertikale Position bleibt unveraendert.

### 2. Beitrags-Vorschau mittig zentrieren
Im ShareDialog wird das Preview-Bild korrekt horizontal zentriert, indem der Container `w-full` und das Bild `w-auto max-h-full` erhaelt, sodass es bei beiden Formaten (Story und Beitrag) immer mittig sitzt.

### Technische Details

**`src/lib/shareImageGenerator.ts`** (Zeile 394):
- `chartWidth` von `width * 0.7` auf `width * 0.55` aendern

**`src/components/highlights/MiniChart.tsx`** (Zeile 76):
- Connecting-Line-Breite anpassen: `Math.max(8, 36 / milestones.length)` statt `Math.max(12, 48 / milestones.length)` fuer kompaktere Darstellung
- Dot-Groesse von `w-4 h-4` auf `w-3.5 h-3.5` reduzieren

**`src/components/highlights/ShareDialog.tsx`** (Zeile 148-161):
- Preview-Container: `className="relative rounded-lg overflow-hidden bg-muted flex items-center justify-center w-full"`
- Preview-Image: `className="max-h-full w-auto object-contain"`

