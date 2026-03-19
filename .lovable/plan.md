

## Umbuchung (Rebook) Feature

### Konzept
Wenn ein Nutzer sich von einem Kurs abmelden will, erscheint im FairnessCheckDialog ein dritter Button: **"Umbuchen"**. Dieser storniert den aktuellen Kurs mit dem Status `'rebooked'` (beeinflusst die Stornierungsrate nicht) und oeffnet direkt die Tagesansicht (DayCourseDialog), damit der Nutzer sich fuer einen anderen Kurs am selben Tag anmelden kann.

### Aenderungen

**1. DB-Migration: Neuen Status `'rebooked'` hinzufuegen**
- CHECK-Constraint um `'rebooked'` erweitern
- `handle_membership_limits` Trigger: Credits/Limits bei `'rebooked'` zurueckgeben (wie bei `cancelled`)
- `process_waitlists_on_cancellation` Trigger: Wartelisten-Nachrueecker bei `'rebooked'` ausloesen
- `get_user_reliability_score`: Zaehlt nur `'cancelled'` -- `'rebooked'` wird automatisch ignoriert

**2. `FairnessCheckDialog.tsx`: Umbuchen-Button hinzufuegen**
- Neuer Callback-Prop `onRebook` (optional)
- Dritter Button "Umbuchen" zwischen "Angemeldet bleiben" und "Trotzdem abmelden"
- Nur sichtbar wenn