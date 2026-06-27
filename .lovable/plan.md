## 1. Check-ins der letzten 12 Monate (fehlende letzten Monate)

**Ursache:** `MonthlyRegistrationsChart.tsx` lädt `leaderboard_entries` per `select(...).range(0, 4999)` ohne `order`. PostgREST liefert ohne Sortierung implizit die ältesten Zeilen zuerst und ist serverseitig auf 1000 Rows gedeckelt — die jüngsten Monate (Mai/Juni 2026) fallen weg, daher die Nullwerte am rechten Rand. In der DB sind die Werte vorhanden (Juni 26: 633 Check-ins, Mai 26: 852).

**Fix:** Aggregation in die Datenbank verlagern, statt alle Einzelzeilen ins Frontend zu laden.

- Neue SQL-Funktion `public.get_monthly_checkins_chart(months_back int default 12)` als `SECURITY DEFINER`, die pro Monat × Mitgliedschaftstyp die Summe von `training_count` zurückgibt (joined mit `profiles.membership_type`, „Trainer" wird zu „Open Gym" gemappt). Rückgabe: `year, month, basic, premium, wellpass, ten_card, open_gym, total` — max. 12 Zeilen.
- `EXECUTE`-Recht für `authenticated` (Adminzugriff sowieso über bestehende RLS auf Frontend-Ebene).
- Komponente ruft nur noch `supabase.rpc('get_monthly_checkins_chart')` auf, baut die Monatsreihe daraus (mit Nullwerten für fehlende Monate) und entfernt die alten zwei großen `.select()`-Calls.

Damit verschwindet der Row-Limit-Bug komplett und der Chart ist auch schneller.

## 2. „Amando" mit 10er Karte

Es existiert kein Mitglied namens Amando. In der 08:30-Uhr-Stunde am 12.06.2026 war jedoch **Hannes Epting** angemeldet — sein **Nickname** ist „Amano" (mit einem D weniger), Mitgliedschaftstyp 10er Karte. Daher die Verwechslung.

- Profil: `Hannes Epting` (Nickname: Amano), `user_id: 9036e8f6-63ae-43b2-a3ac-28355c82572f`
- 10er-Karte: 0 von 10 Credits übrig, zuletzt aufgeladen am 29.04.2026.

In der Mitglieder- und 10er-Karten-Übersicht erscheint er unter „Hannes Epting" (nicht unter „Amano/Amando"), weil die Suche/Sortierung dort über `display_name` / `first_name` / `last_name` läuft. Kein Code-Change nötig — nur Info.

## Geänderte Dateien

- Neue Migration: SQL-Funktion `get_monthly_checkins_chart`.
- `src/components/MonthlyRegistrationsChart.tsx` — Daten-Loading auf RPC umstellen.
