
# Share-Bild Design - Anpassungen an Referenzbild

## Zusammenfassung

Das aktuelle Design ist bereits sehr nah am Referenzbild. Es werden folgende Anpassungen vorgenommen:

---

## Änderungen im Detail

### 1. Flammen-Icon: Rein weiße Silhouette

**Aktuell:**
- Weiße äußere Flamme mit rotem inneren Detail

**Neu (wie Referenzbild):**
- Komplett weiße Flammen-Silhouette ohne innere Farbe
- Doppel-Flammen-Design (wie im Bild) mit zwei Flammen-Spitzen

```text
     /\
    /  \  /\
   /    \/  \
  |          |
   \        /
    \      /
     \    /
      \  /
       \/
```

### 2. Chart-Labels in Rot

**Aktuell:**
```javascript
ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; // Semi-transparentes Weiß
```

**Neu:**
```javascript
ctx.fillStyle = "#dc2626"; // Rot wie Label
```

### 3. Erweiterte dekorative Hintergrund-Elemente

Das Referenzbild zeigt deutlich mehr und größere Dekorationselemente:
- Große Dumbbell-Silhouetten (rechts oben, links unten)
- Konzentrische Kreise/Ringe
- Geschwungene Linien
- Alle in sehr niedriger Opazität (~5-10%)

**Neue Positionen:**
```text
┌────────────────────────────────────────────┐
│                    ╱ ⦿╲                   │  ← Großer Dumbbell oben rechts
│   ◠────◡                                  │  ← Geschwungene Linie
│                                            │
│                                            │
│  ○                                         │  ← Kreise/Ringe links
│   ◎                                        │
│                                            │
│                                            │
│                                            │
│                      ╲⦿╱                  │  ← Dumbbell unten
│  ◠────◡                                   │
└────────────────────────────────────────────┘
```

### 4. Sparkle in Weiß/Grau

**Aktuell:**
- Sparkle in Rot (#dc2626)

**Neu (wie Referenzbild):**
- Sparkle in hellem Grau/Weiß (rgba(255,255,255,0.5))

---

## Technische Änderungen

### Datei: `src/lib/shareImageGenerator.ts`

#### 1. `drawMainIcon()` - Flamme ohne inneren Teil

```text
// Nur die weiße äußere Flamme zeichnen
// Den inneren roten Teil entfernen
// Zwei Flammenspitzen wie im Referenzbild
```

#### 2. `drawStreakChart()` - Labels in Rot

```text
// Ändern von:
ctx.fillStyle = "rgba(255, 255, 255, 0.7)";

// Zu:
ctx.fillStyle = "#dc2626"; // Rot
```

#### 3. `drawDecorativeElements()` - Mehr Elemente

Erweiterte dekorative Elemente mit:
- Größere Dumbbells an strategischen Positionen
- Mehr Kreise/Ringe
- Konzentrische Kreismuster
- Mehr geschwungene Linien

#### 4. `drawSparkle()` - Farbe ändern

```text
// Von rot zu weiß/grau
ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
```

---

## Vorher/Nachher

| Element | Vorher | Nachher |
|---------|--------|---------|
| Flammen-Icon | Weiß + Roter Kern | Rein weiß, Doppel-Flamme |
| Chart Labels | Weiß (70% opacity) | Rot (#dc2626) |
| Hintergrund-Deko | 3 kleine Dumbbells | 5+ größere Elemente |
| Sparkle | Rot | Weiß/Grau |

---

## Implementierung

Die Änderungen erfolgen in einer einzigen Datei:

**`src/lib/shareImageGenerator.ts`**:

1. Flammen-Icon anpassen (rein weiß, Doppelspitzen-Design)
2. Chart-Label-Farbe auf rot ändern
3. Dekorative Elemente erweitern und vergrößern
4. Sparkle-Farbe auf weiß/grau ändern

Die Hintergrund-Auswahl (Dark, Gradient, Gym, Custom Upload) bleibt vollständig erhalten.
