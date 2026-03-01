

# Reliability Score System - Implementierungsplan

## Bewertung deines Konzepts

Dein Plan ist durchdacht und adressiert die Kernprobleme aus den Daten (36,4% durchschnittliche Stornierungsrate, 64% der Stornierungen innerhalb von 24h vor Kursbeginn). Besonders stark:

- **Fairness Check Dialog**: Die "Nudge"-Strategie mit Score-Vorschau ist psychologisch effektiv
- **Abgestufte Konsequenzen**: 4 Level statt harter Sperren ist fair
- **Transparenz**: Nutzer sehen ihren Status und verstehen das System

**Ein Hinweis**: Das Buchungsfenster-Limit (z.B. nur 3 Tage vorher) bestraft zwar Vielstornierer, schraenkt aber auch die Planbarkeit ein. Laut den Daten stornieren Spontanbucher (gleicher Tag) am wenigsten (24,3%), waehrend Fruehbucher (7+ Tage) am meisten stornieren (44,3%). Das System ist also konsistent mit den Daten.

---

## Implementierungsschritte

### 1. Datenbank: Reliability Score Funktion erstellen

Eine PostgreSQL-Funktion `get_user_reliability_score(p_user_id uuid)` die in Echtzeit berechnet:
- Gesamtanzahl Buchungen (status IN ('registered', 'cancelled')) seit den letzten 90 Tagen
- Anzahl Stornierungen (status = 'cancelled')
- Score = (Stornierungen / Gesamt) * 100
- Gibt zurueck: `score` (numeric), `level` (1-4), `booking_window_days` (14/7/5/3), `total_bookings`, `cancellations`

Keine neue Tabelle noetig -- der Score wird live aus `course_registrations` berechnet.

### 2. Hook: `useReliabilityScore`

Ein React Hook der:
- Den Score via `supabase.rpc('get_user_reliability_score')` laedt
- Level, Farbe und Buchungsfenster ableitet
- Den projizierten Score nach einer Stornierung berechnet
- Caching mit React Query

### 3. Buchungsfenster-Einschraenkung

In `CourseBooking.tsx` und `DayCourseDialog.tsx`:
- Kurse ausserhalb des Buchungsfensters des Users werden ausgegraut / nicht buchbar angezeigt
- Hinweis: "Verfuegbar ab [Datum]" fuer zu fruehe Kurse
- Admins und Trainer sind vom System ausgenommen

### 4. Header Badge (Speedometer Icon)

In `CourseBooking.tsx` (Kurslistenansicht):
- Gauge/Speedometer Icon oben rechts mit Level-Farbe (gruen/gelb/orange/rot)
- Klick oeffnet Info-Dialog mit Tabelle aller 4 Level und deren Buchungsfenster
- Aktuelles Level des Users wird hervorgehoben

### 5. Score-Anzeige in Kursdetails

Im Kursdetail-Dialog (sowohl `CourseBooking` als auch `DayCourseDialog`):
- Horizontale Farbskala (Gradient gruen nach rot)
- Marker an der aktuellen Score-Position
- Text darunter: "Status: Level [X] | Buchungsfenster: [X] Tage"

### 6. Fairness Check Dialog

Neue Komponente `FairnessCheckDialog.tsx`:
- Wird bei Klick auf "Abmelden" geoeffnet (statt direkte Stornierung)
- Zeigt aktuellen Score und projizierten Score nach Stornierung
- Visualisiert die Aenderung auf der Farbskala
- "Angemeldet bleiben" (primaer) vs "Trotzdem abmelden" (sekundaer)
- Wird in alle 3 Stornierungsstellen integriert: `CourseBooking`, `DayCourseDialog`, `UpcomingClassReservation`

---

## Betroffene Dateien

| Datei | Aenderung |
|---|---|
| **Neue Dateien** | |
| `src/hooks/useReliabilityScore.ts` | Hook fuer Score-Berechnung |
| `src/components/FairnessCheckDialog.tsx` | Stornierungsbestaetigung |
| `src/components/ReliabilityScoreBadge.tsx` | Header-Badge + Info-Modal |
| `src/components/ReliabilityScoreScale.tsx` | Horizontale Farbskala |
| **Bestehende Dateien** | |
| `src/components/CourseBooking.tsx` | Badge einbinden, Score-Scale in Details, Buchungsfenster-Filter, Fairness Check |
| `src/components/DayCourseDialog.tsx` | Score-Scale in Details, Fairness Check |
| `src/components/UpcomingClassReservation.tsx` | Fairness Check bei Stornierung |
| DB Migration | `get_user_reliability_score` Funktion |

---

## Technische Details

### Score-Berechnung (SQL Funktion)

```text
Zeitraum: Letzte 90 Tage (rollierend)
Formel:  score = (cancelled / total) * 100
Level:   1 (0-15%), 2 (16-25%), 3 (26-35%), 4 (36%+)
Window:  14, 7, 5, 3 Tage
Min. Buchungen: Unter 5 Buchungen = automatisch Level 1
```

### Buchungsfenster-Logik

```text
Wenn Kurs-Datum > heute + booking_window_days:
  -> Button deaktiviert
  -> Text: "Ab [Datum] buchbar"
Ausnahme: Admins + Trainer = immer Level 1
```

### Farben

```text
Level 1: #22c55e (Gruen)
Level 2: #eab308 (Gelb)  
Level 3: #f97316 (Orange)
Level 4: #ef4444 (Rot)
```

