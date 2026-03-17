
# Buchungsmuster: Absolute Zahlen durch relative Kursauslastung ersetzen

## Aenderung

Die Buchungsmuster-Karte im Admin-Bereich zeigt aktuell absolute Registrierungszahlen pro Wochentag/Uhrzeit (z.B. "Mo 17:00 → 42"). Stattdessen soll die **durchschnittliche Kursauslastung in Prozent** angezeigt werden (z.B. "Mo 17:00 → 82%").

## Berechnung

Fuer jede Wochentag-Uhrzeit-Kombination:
- Alle Kurse der letzten 30 Tage mit diesem Wochentag und dieser Startzeit ermitteln
- Pro Kurs: Anzahl registrierter Teilnehmer (inkl. Gaeste) / max_participants
- Durchschnitt ueber alle Kurse dieser Kombination bilden
- Ergebnis als Prozentwert anzeigen

## Technische Umsetzung

### Datei: `src/components/BookingPatternsCard.tsx`

1. **Interface anpassen**: `registrations` durch `avgUtilization` (number, 0-100) und `courseCount` ersetzen

2. **Datenladung umschreiben**: Statt nur `course_registrations` zu laden, werden `courses` mit `course_registrations` und `guest_registrations` geladen:
   - Query: `courses` mit `course_date`, `start_time`, `max_participants`, `course_registrations(status)`, `guest_registrations(status)`
   - Filter: `is_cancelled = false`, `course_date` im 30-Tage-Fenster
   - Gruppierung nach Wochentag + Startzeit
   - Pro Gruppe: Summe der registrierten Teilnehmer (Members + Gaeste) / Summe max_participants * 100

3. **Anzeige anpassen**:
   - Balkenbreite basiert auf `avgUtilization` (0-100%) statt auf absoluten Zahlen
   - Zahl rechts zeigt `82%` statt `42`
   - Footer zeigt "Hoechste Auslastung: Mo 17:00 (82%)" statt absolute Buchungen

4. **Sortierung**: Nach Auslastung absteigend (hoechste zuerst) statt nach Wochentag/Uhrzeit, damit die relevantesten Slots oben stehen
