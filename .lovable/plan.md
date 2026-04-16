

## Problem: Check-ins der letzten 12 Monate aktualisiert nicht

### Ursache
Die Supabase-Abfrage in `MonthlyRegistrationsChart.tsx` hat ein **1000-Zeilen-Limit** (Supabase-Standard). Es gibt aktuell **1223 Eintraege** in `leaderboard_entries` fuer `year >= 2025`, wodurch 223 Eintraege abgeschnitten werden. Das fuehrt zu unvollstaendigen oder fehlenden Daten in der Grafik.

Dasselbe Problem betrifft auch die Profil-Abfrage (`.in('user_id', userIds)`) -- bei ueber 1000 User-IDs werden nicht alle Profile geladen.

### Loesung

**Datei: `src/components/MonthlyRegistrationsChart.tsx`**

1. Leaderboard-Abfrage mit explizitem Limit erhoehen oder die Daten serverseitig aggregieren. Einfachste Loesung: Die Abfrage auf die tatsaechlich benoetigten 12 Monate einschraenken (statt alle Daten ab `year - 1` zu laden), und ein `.range(0, 4999)` setzen um das Limit zu erhoehen.

2. Konkret:
   - Filter verfeinern: Statt nur `gte('year', 2025)` auch den Monat beruecksichtigen, damit nicht unnoetig alte Daten geladen werden
   - `.select(...).gte('year', ...).range(0, 4999)` oder besser zwei separate Abfragen pro Jahr/Monat-Kombination
   - Profil-Abfrage: Deduplizierte User-IDs verwenden und ebenfalls `.range(0, 4999)` setzen

### Technische Aenderung

```typescript
// Zeile 34-37: Range hinzufuegen
const { data: leaderboardData, error } = await supabase
  .from('leaderboard_entries')
  .select('user_id, year, month, training_count')
  .gte('year', now.getFullYear() - 1)
  .range(0, 4999)

// Zeile 42-46: Deduplizierte IDs + Range
const uniqueUserIds = [...new Set(leaderboardData?.map(e => e.user_id) || [])]
const { data: profiles } = await supabase
  .from('profiles')
  .select('user_id, membership_type')
  .in('user_id', uniqueUserIds)
  .range(0, 4999)
```

### Dateien
- `src/components/MonthlyRegistrationsChart.tsx` (Range-Limits + deduplizierte User-IDs)

