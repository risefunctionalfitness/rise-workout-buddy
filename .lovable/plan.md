

## Two Changes

### 1. Warteliste-Abmeldung soll Stornierungsrate nicht beeinflussen

**Problem**: Wenn jemand sich von der Warteliste abmeldet, wird `status = 'cancelled'` gesetzt -- genau wie bei einer normalen Stornierung. Die SQL-Funktion `get_user_reliability_score` zaehlt alle `cancelled`-Eintraege, egal ob der User vorher `registered` oder `waitlist` war.

**Loesung**: Neuen Status `waitlist_cancelled` einfuehren, der bei Warteliste-Abmeldungen verwendet wird. Die Reliability-Score-Funktion ignoriert diesen Status automatisch, da sie nur `registered` und `cancelled` zaehlt.

**Aenderungen**:
- **DB-Migration**: `get_user_reliability_score` braucht keine Aenderung (zaehlt nur `registered`/`cancelled`)
- **`CourseBooking.tsx`** (`handleCancellation`): Wenn `targetCourse.is_waitlisted`, dann Status auf `'waitlist_cancelled'` statt `'cancelled'` setzen. Kein Fairness-Check-Dialog fuer Warteliste-Abmeldungen.
- **`DayCourseDialog.tsx`** (`handleCancellation`): Gleiche Logik -- wenn `selectedCourse.is_waitlisted`, Status `'waitlist_cancelled'` verwenden und Fairness-Dialog ueberspringen.
- **`UpcomingClassReservation.tsx`** (`handleCancel`): Gleiche Logik -- Warteliste-Status pruefen.
- **`initiateCancellation`** in allen 3 Komponenten: Fairness-Check-Dialog ueberspringen wenn User auf Warteliste steht.
- **DB-Migration**: Waitlist-Processing-Trigger/Funktion muss `waitlist_cancelled` nicht als aktiven Wartelistenplatz zaehlen (ist bereits der Fall, da nur `waitlist`/`waitlisted` als aktiv gelten).

### 2. Gleichnamige Kurse am selben Tag: Warnung statt Blockierung

**Problem**: `can_user_register_for_course` blockiert die Anmeldung wenn ein gleichnamiger Kurs am selben Tag bereits gebucht ist (`RETURN FALSE`).

**Loesung**: Die Duplikat-Pruefung aus der DB-Funktion entfernen und stattdessen im Frontend einen Bestaetigungs-Dialog anzeigen.

**Aenderungen**:
- **DB-Migration**: `can_user_register_for_course` aktualisieren -- den Block mit `existing_same_title` entfernen (Zeilen 40-52 der aktuellen Funktion).
- **`CourseBooking.tsx`** (`handleRegistration`): Vor dem RPC-Call pruefen ob ein gleichnamiger Kurs am selben Tag existiert. Falls ja, einen Bestaetigungs-Dialog anzeigen ("Du bist bereits fuer einen anderen Kurs an diesem Tag angemeldet. Trotzdem anmelden?"). Bei Bestaetigung normal fortfahren.
- **`DayCourseDialog.tsx`** (`handleRegistration`): Gleiche Logik.
- **`CourseInvitationsPanel.tsx`**: Gleiches Pattern -- Warnung statt Blockierung.

### Technische Details

**Neuer Confirmation-State** in CourseBooking und DayCourseDialog:
- `duplicateWarningOpen` (boolean) + `pendingRegistrationId` (string)
- AlertDialog mit Warnung und "Trotzdem anmelden" / "Abbrechen" Buttons
- Bei Bestaetigung wird `handleRegistration` mit einem `skipDuplicateCheck`-Flag erneut aufgerufen

**DB-Migration** (eine Migration fuer beide Aenderungen):
1. `can_user_register_for_course` ohne den `existing_same_title`-Block neu erstellen

