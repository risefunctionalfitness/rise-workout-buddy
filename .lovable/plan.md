

# Reliability Score Badge sichtbar machen und korrekt platzieren

## Problem

Magnus Goettinger hat die Rolle `trainer` in der Datenbank. Der Code blendet das Reliability Score Badge mit `!isTrainer` aus -- Trainer sehen es daher nie. Da Trainer aber auch als Mitglieder Kurse buchen und stornieren, sollte das System fuer sie genauso gelten wie fuer regulaere Mitglieder. Nur Admins sollten ausgenommen sein.

## Aenderungen

### 1. Sichtbarkeit: `!isTrainer` entfernen

In allen drei Komponenten (`CourseBooking.tsx`, `DayCourseDialog.tsx`, `UpcomingClassReservation.tsx`) wird die Bedingung von `reliabilityScore && !isAdmin && !isTrainer` zu `reliabilityScore && !isAdmin` geaendert. Das betrifft:

- Badge-Anzeige im Header der Kursliste
- Badge-Anzeige im Kursdetail-Dialog  
- Fairness Check Dialog Ausloesung bei Stornierung

Insgesamt ca. 6-8 Stellen in diesen drei Dateien.

### 2. Badge-Platzierung in der Kursliste/Kalender

Aktuell steht das Badge unter der "Kurse"-Ueberschrift. Laut Screenshot soll es **oben rechts im Header neben dem Streak-Display** stehen. Dafuer wird das Badge aus `CourseBooking.tsx` entfernt und stattdessen in `TrainingPathHeader.tsx` eingefuegt -- neben dem StreakDisplay, vor dem Admin-Grid-Button.

### 3. Badge-Platzierung im Kursdetail-Dialog

Aktuell steht es im DialogHeader neben dem Titel. Gemaess Anforderung soll es **zwischen dem Einladungsbutton (CourseInvitationButton) und dem X (Close)** positioniert werden. In allen drei Dialog-Komponenten wird:

- Das Badge aus dem DialogHeader entfernt
- Stattdessen neben den CourseInvitationButton in der Teilnehmer-Zeile gesetzt

### 4. SQL-Funktion: Trainer einbeziehen

Die SQL-Funktion `get_user_reliability_score` gibt aktuell fuer Trainer `score=0, level=1` zurueck (Zeile 28-30 der Migration). Diese Privilegierungs-Logik wird nur fuer Admins beibehalten, nicht mehr fuer Trainer. So erhalten Trainer ihren tatsaechlichen Score.

---

## Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/components/CourseBooking.tsx` | `!isTrainer` entfernen (3x), Badge aus Header in Detail-Dialog umplatzieren |
| `src/components/DayCourseDialog.tsx` | `!isTrainer` entfernen, Badge neben Einladungsbutton |
| `src/components/UpcomingClassReservation.tsx` | `!isTrainer` entfernen, Badge neben Einladungsbutton |
| `src/components/TrainingPathHeader.tsx` | ReliabilityScoreBadge im globalen Header einfuegen |
| SQL Migration (neue) | `get_user_reliability_score` Trainer-Ausnahme entfernen |

