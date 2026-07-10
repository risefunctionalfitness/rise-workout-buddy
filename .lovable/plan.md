## Problem

iOS-Kalender zeigt gebuchte Trainings 2 Stunden zu spät an (z. B. 10:30 statt 08:30 im Sommer, bzw. 1h im Winter). Ursache: In `src/lib/calendarUtils.ts` werden Datum/Uhrzeit als „naked" Local-Time-Strings (`DTSTART:20260612T083000`) in die ICS-Datei geschrieben — ohne `TZID` und ohne `VTIMEZONE`-Block. Nach RFC 5545 ist das zwar „floating time", iOS/Apple Calendar interpretiert solche Werte in vielen Fällen jedoch als **UTC** und rechnet sie in die Gerätezeitzone um → +2 h in Berliner Sommerzeit, +1 h im Winter.

Der Google-Calendar-Link (`generateGoogleCalendarUrl`) hat dasselbe Problem: Ohne `ctz`-Parameter interpretiert Google die Zeit je nach Google-Konto-Zeitzone, was ebenfalls Verschiebungen erzeugt.

## Fix

Beide Kalenderausgaben in `src/lib/calendarUtils.ts` explizit an die Zeitzone `Europe/Berlin` binden.

### 1. ICS-Datei (Apple/Outlook)
- `VTIMEZONE`-Block für `Europe/Berlin` mit Standard- (`STANDARD`, UTC+1) und Sommerzeit-Regel (`DAYLIGHT`, UTC+2) inkl. `RRULE` einfügen.
- `DTSTART` / `DTEND` mit `TZID=Europe/Berlin` versehen:
  ```
  DTSTART;TZID=Europe/Berlin:20260612T083000
  DTEND;TZID=Europe/Berlin:20260612T093000
  ```
- `DTSTAMP` bleibt in UTC (`...Z`), wie vom Standard gefordert.

### 2. Google Calendar URL
- Parameter `ctz=Europe/Berlin` an die URL anhängen, damit Google die Zeit als Berliner Ortszeit interpretiert.

### 3. Keine Änderungen an
- `AddToCalendarButton.tsx` (übergibt bereits korrekt `startDate`/`startTime`/`endTime` als lokale Berliner Zeit aus der DB).
- Buchungs-/Datenlogik.

## Betroffene Datei
- `src/lib/calendarUtils.ts`

## Verifikation
- ICS-Datei manuell öffnen und prüfen, dass `TZID=Europe/Berlin` und der `VTIMEZONE`-Block enthalten sind.
- Auf iOS testen: Kurs um 08:30 Berliner Zeit → erscheint auch im iOS-Kalender um 08:30 (Sommer- wie Winterzeit).
- Google-Calendar-Link öffnen und prüfen, dass die Startzeit unabhängig von der Konto-Zeitzone auf 08:30 Berliner Zeit fällt.
