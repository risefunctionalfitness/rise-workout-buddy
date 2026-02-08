

# Persönliche Highlights - Finaler Implementierungsplan

## Zusammenfassung

Die Monatschallenge-Kachel wird durch eine "Persönliche Highlights"-Kachel ersetzt, die exakt dem bestehenden Dashboard-Design folgt. Beim Teilen kann der User entweder ein eigenes Hintergrundbild hochladen oder aus 3 Preset-Optionen wählen.

---

## Teil 1: Dashboard-Kachel Design

### Aktuelles Pattern (alle Kacheln folgen diesem Design)

```text
┌────────────────────────────────────────────┐
│                                   [ICON]   │  ← absolute top-3/4 right-3/4
│                                            │
│          Zentrierter Text                  │
│                                            │
└────────────────────────────────────────────┘
```

CSS-Klassen: `rounded-2xl p-4 h-24 bg-gray-100 dark:bg-gray-800`

### Neue Highlights-Kachel

```text
┌────────────────────────────────────────────┐
│                                      [✨]  │  ← Sparkles Icon (primary color)
│                                            │
│        Persönliche Highlights              │
│                                            │
└────────────────────────────────────────────┘
```

- Icon: `Sparkles` von lucide-react (oben rechts wie bei News/Credits)
- Text: "Persönliche Highlights" zentriert
- Optional: Badge-Indikator für neue Achievements (wie bei News)

---

## Teil 2: 3-Seitiges Carousel beim Klick

Öffnet als Vollbild-Dialog mit horizontalem Swipe:

### Seite 1: Teilbare Achievements

```text
┌────────────────────────────────────────────┐
│  ←   🏆 Achievements            (1/3)   →  │
├────────────────────────────────────────────┤
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         [RISE LOGO]                 │   │
│  │            🔥 12                    │   │
│  │        WOCHEN STREAK                │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                            │
│           ● ○ ○  (weitere Cards)           │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          📤 Teilen                   │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### Seite 2: Teilbare Statistiken

```text
┌────────────────────────────────────────────┐
│  ←   📊 Statistiken             (2/3)   →  │
├────────────────────────────────────────────┤
│                                            │
│  [Kompakte Statistik-Vorschau als Bild]    │
│                                            │
│  [📤 Teilen]                               │
│                                            │
│  ── Detaillierte Statistik ──              │
│                                            │
│  [Wochentags-Verteilung]                   │
│  [Coach-Präferenzen]                       │
│  [3-Monats-Trend]                          │
│                                            │
└────────────────────────────────────────────┘
```

### Seite 3: Meilensteine & Challenges

```text
┌────────────────────────────────────────────┐
│  ←   🎯 Meilensteine           (3/3)    →  │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🏅 MONATSCHALLENGE                  │  │
│  │  [Challenge-Titel]                   │  │
│  │  ○────●───○  8/12 Checkpoints        │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🎯 NÄCHSTE ZIELE                    │  │
│  │  ○────●───○  250 Trainings (147)     │  │
│  │  ○──●─────○  26 Wochen Streak (12)   │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🏆 ERREICHTE BADGES                 │  │
│  │  [🔥 8W] [💯 100] [📈 +45%]         │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

---

## Teil 3: Share-Dialog mit Hintergrund-Auswahl

### Ablauf

1. User klickt [📤 Teilen] bei einem Achievement/Statistik
2. Share-Dialog öffnet sich mit Hintergrund-Optionen

### Dialog-Layout

```text
┌────────────────────────────────────────────┐
│              Bild erstellen              X │
├────────────────────────────────────────────┤
│                                            │
│  ┌─────────────────────────────────────┐   │
│  │  [Live-Vorschau des fertigen Bilds] │   │
│  │                                     │   │
│  │     Hintergrund + Achievement       │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  Hintergrund wählen:                       │
│                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ Dark │ │Gradi-│ │ Gym  │ │Upload│      │
│  │      │ │ ent  │ │      │ │  📤  │      │
│  │  ●   │ │  ○   │ │  ○   │ │  ○   │      │
│  └──────┘ └──────┘ └──────┘ └──────┘      │
│                                            │
│  Format:  [Story 9:16]  [Square 1:1]       │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          📤 Teilen / Speichern       │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### Hintergrund-Optionen

| Option | Beschreibung |
|--------|--------------|
| Dark | Dunkler Rise-Theme Hintergrund (#1a1a1a) |
| Gradient | Rot-Schwarz Gradient (Rise-Branding) |
| Gym | Dezentes Gym-Foto (wird mitgeliefert) |
| Upload | User lädt eigenes Bild hoch |

### Upload-Funktion

Bei Klick auf "Upload":
1. File-Input öffnet sich (wie bei Avatar-Upload)
2. User wählt Bild aus Galerie
3. Bild wird als temporärer Hintergrund geladen (nur im Browser, kein Server-Upload)
4. Live-Vorschau aktualisiert sich sofort

```text
// Technisch: Kein Supabase Storage nötig
// Bild wird nur lokal im Browser verarbeitet
const reader = new FileReader();
reader.onload = () => setCustomBackground(reader.result);
reader.readAsDataURL(file);
```

---

## Technische Implementation

### Datenbank-Migration

Neue Tabelle: `user_achievements`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| user_id | uuid | Referenz zum User |
| achievement_type | text | streak_12, training_100, etc. |
| achievement_value | integer | Konkreter Wert |
| achieved_at | timestamp | Wann erreicht |
| seen_at | timestamp | NULL = Pop-up zeigen |
| shared_at | timestamp | Tracking für Analytics |

### Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/components/DashboardHighlightsCard.tsx` | Ersetzt DashboardChallengeCard |
| `src/components/HighlightsDialog.tsx` | Vollbild-Dialog mit 3 Tabs |
| `src/components/highlights/AchievementsSlide.tsx` | Seite 1: Achievements |
| `src/components/highlights/StatsSlide.tsx` | Seite 2: Statistiken |
| `src/components/highlights/MilestonesSlide.tsx` | Seite 3: Meilensteine |
| `src/components/highlights/ShareDialog.tsx` | Share-Dialog mit Hintergrund-Wahl |
| `src/components/highlights/BackgroundSelector.tsx` | Hintergrund-Auswahl UI |
| `src/hooks/useUserAchievements.ts` | Achievement-Logik |
| `src/lib/shareImageGenerator.ts` | Canvas-basierte Bild-Generierung |

### Zu ändernde Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/DashboardTileGrid.tsx` | ChallengeCard → HighlightsCard |
| `src/pages/Dashboard.tsx` | Neue Highlights-Dialog Logik |

### Canvas Bild-Generierung

```text
Ablauf:
1. Canvas erstellen (1080x1920 für Story, 1080x1080 für Square)
2. Hintergrund zeichnen (Preset oder Custom-Bild)
3. Optionaler Dark Overlay für Lesbarkeit
4. Rise Logo (weiß) oben
5. Achievement-Content in der Mitte
6. @risefunctionalfitness unten
7. Als PNG exportieren für Web Share API
```

---

## Share-Technologie

### Web Share API (Android + iOS)

```text
canvas.toBlob((blob) => {
  const file = new File([blob], 'rise-highlight.png', { type: 'image/png' })
  
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      files: [file],
      title: 'Mein Training bei RISE'
    })
  } else {
    // Fallback: Download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rise-highlight.png'
    a.click()
  }
})
```

---

## Implementierungsreihenfolge

### Phase 1: Grundstruktur
1. Datenbank-Migration für `user_achievements`
2. `useUserAchievements` Hook mit Achievement-Erkennung
3. Statistik-Queries aus MemberStatsDialog adaptieren

### Phase 2: Dashboard-Kachel
1. `DashboardHighlightsCard` erstellen (Sparkles Icon, gleiche Styles)
2. In `DashboardTileGrid` integrieren (ersetzt Challenge)
3. `HighlightsDialog` mit 3-Slide Carousel

### Phase 3: Carousel-Inhalte
1. AchievementsSlide mit horizontalem Card-Carousel
2. StatsSlide mit Statistik-Visualisierungen
3. MilestonesSlide mit Monatschallenge + Fortschrittsbalken

### Phase 4: Share-Feature
1. ShareDialog mit Hintergrund-Auswahl (3 Presets + Upload)
2. BackgroundSelector mit Live-Vorschau
3. Canvas-basierte Bildgenerierung
4. Web Share API + Download Fallback

### Phase 5: Pop-ups (optional)
1. Achievement-Pop-up bei neuen Meilensteinen
2. Integration im Dashboard

---

## Vorteile dieser Lösung

**User Experience:**
- Vertrautes Kachel-Design (konsistent mit News, Credits)
- Eigenes Foto als Hintergrund = persönlicher = mehr Shares
- 3 Preset-Optionen für schnelles Teilen
- Live-Vorschau vor dem Teilen

**Technisch:**
- Kein Server-Upload für Custom-Bilder nötig (alles lokal im Browser)
- Web Share API funktioniert auf Android + iOS
- Fallback für Desktop (Download)

