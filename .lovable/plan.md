

# Fix: Kursanzahl zeigt Gäste nicht korrekt an

## Problem
Die Teilnehmeranzahl im Header "Teilnehmer (7/16)" verwendet `selectedCourse.registered_count`, das beim initialen Laden der Kursliste berechnet wird. Obwohl die Teilnehmerliste korrekt 8 Personen zeigt (7 Mitglieder + 1 Gast Julia Weidenauer), wird die Kopfzeile nicht aktualisiert.

Das gleiche Problem betrifft auch die Kalender-Badges auf der rechten Seite und den Admin-Bereich.

## Loesung

Zwei Ansaetze werden kombiniert:

1. **Dynamische Anzeige aus geladenen Teilnehmern**: Wenn der Kurs-Dialog geoeffnet ist und Teilnehmer geladen wurden, wird `participants.length` (gefiltert auf "registered") fuer die Anzeige verwendet statt `selectedCourse.registered_count`. So stimmt die Zahl immer mit der tatsaechlich angezeigten Liste ueberein.

2. **selectedCourse nach Laden der Teilnehmer aktualisieren**: Nach dem Laden der Teilnehmer wird `selectedCourse.registered_count` auf die korrekte Anzahl aktualisiert, damit alle Stellen konsistent sind.

## Technische Aenderungen

### Datei: `src/components/CourseBooking.tsx`
- Zeile 774: Statt `selectedCourse.registered_count` wird die Anzahl der geladenen `participants` mit Status "registered" verwendet
- In `loadParticipants`: Nach dem Laden wird `selectedCourse` mit dem korrekten Count aktualisiert (damit auch die Kursliste im Hintergrund stimmt)

### Datei: `src/components/DayCourseDialog.tsx`
- Gleiche Anpassung: Teilnehmer-Header verwendet `participants.filter(p => p.status === 'registered').length` statt `selectedCourse.registered_count`
- Nach Laden der Teilnehmer wird der Count aktualisiert

### Datei: `src/components/CourseParticipantsList.tsx`
- Pruefen ob dort auch ein statischer Count verwendet wird und ggf. auf die tatsaechliche Teilnehmerliste umstellen

