

## Problem: Kurs-Ueberbuchung durch fehlende Kapazitaetspruefung

### Analyse

Die Daten zeigen das Problem konkret: Kurs am 20.03. hat 16 Mitglieder + 1 Gast = 17 Teilnehmer bei max. 16 Plaetzen. Die `register_for_course` RPC-Funktion zaehlt zwar beide (Mitglieder + Gaeste), aber es gibt **zwei Stellen im Code, die diese Funktion umgehen**:

1. **`AdminParticipantManager.tsx`** (Zeile 108-114): Admin fuegt Teilnehmer per direktem `.insert()` mit `status: 'registered'` hinzu -- keine Kapazitaetspruefung
2. **`CourseInvitationsPanel.tsx`** (Zeile 294-298): Einladungsannahme per direktem `.insert()` -- keine Kapazitaetspruefung

Beide Pfade schreiben `registered` unabhaengig davon, ob der Kurs voll ist.

### Loesung

Beide Stellen auf die `register_for_course` RPC umstellen, damit die atomare Kapazitaetspruefung (Mitglieder + Gaeste) immer greift.

### Aenderungen

**1. `src/components/AdminParticipantManager.tsx`**
- Direkten `.insert()` durch `.rpc('register_for_course')` ersetzen
- Admin kann weiterhin Teilnehmer hinzufuegen, aber der Status wird korrekt als `registered` oder `waitlist` gesetzt

**2. `src/components/CourseInvitationsPanel.tsx`**
- Direkten `.insert()` durch `.rpc('register_for_course')` ersetzen
- Einladungsannahme respektiert die Kurskapazitaet

Keine DB-Migration noetig -- die `register_for_course` Funktion ist bereits korrekt.

