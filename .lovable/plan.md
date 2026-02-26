

# Performance-Fix: Kurse laden extrem langsam

## Problem

Zwei Komponenten verwenden ein "N+1 Query"-Muster: Fuer jeden einzelnen Kurs wird eine separate Datenbank-Abfrage gestartet, um die Teilnehmerzahl zu ermitteln. Bei 50 Kursen sind das 50+ einzelne Netzwerk-Requests statt einem einzigen.

**Betroffene Dateien:**
- `src/components/CourseParticipants.tsx` (Admin-Listenansicht)
- `src/components/AdminCoursesCalendarView.tsx` (Admin-Kalenderansicht)

**Bereits korrekt:** `src/components/CoursesCalendarView.tsx` (User-Kalender) und `src/components/DayCourseDialog.tsx` nutzen bereits JOINs.

## Loesung

Das `Promise.all` mit einzelnen Queries pro Kurs wird ersetzt durch einen JOIN in der Hauptabfrage — genau wie es `CoursesCalendarView.tsx` bereits macht.

### Aenderung 1: `src/components/CourseParticipants.tsx`

Statt:
```text
1. Alle Kurse laden (1 Query)
2. Alle Gast-Registrierungen laden (1 Query)  
3. Pro Kurs: course_registrations laden (N Queries) ← PROBLEM
```

Wird zu:
```text
1. Alle Kurse MIT course_registrations laden via JOIN (1 Query)
2. Alle Gast-Registrierungen laden (1 Query)
3. Im Code zaehlen — kein weiterer DB-Request
```

### Aenderung 2: `src/components/AdminCoursesCalendarView.tsx`

Gleiche Optimierung: `course_registrations(status)` als JOIN in die Hauptabfrage einbauen, `Promise.all`-Loop entfernen, Zaehlung im Code durchfuehren.

## Ergebnis

- **Vorher:** ~50+ Datenbank-Requests pro Seitenladung
- **Nachher:** 2-3 Datenbank-Requests pro Seitenladung
- Deutlich schnellere Ladezeit fuer beide Ansichten

