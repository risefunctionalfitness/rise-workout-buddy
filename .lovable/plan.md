
## Plan: Widget-Buchungen Übersicht im Admin Dashboard

### Übersicht
Eine neue Komponente zeigt alle Buchungen, die über die öffentlichen Widgets kommen:
- **Probetraining** (aus `guest_registrations` mit `booking_type = 'probetraining'`)
- **Drop-In** (aus `guest_registrations` mit `booking_type = 'drop_in'`)
- **Wellpass Mitgliedschaft** (aus `wellpass_registrations`)

### Datenquellen
| Typ | Tabelle | Felder |
|-----|---------|--------|
| Probetraining / Drop-In | `guest_registrations` | guest_name, guest_email, booking_type, course_id, created_at, status |
| Wellpass | `wellpass_registrations` | first_name, last_name, email, created_at, status |

### Neue Komponente: `AdminWidgetBookings.tsx`

**Features:**
1. **Live-Liste** der aktuellsten Widget-Buchungen (letzte 7 Tage)
2. **Farbcodierte Badges** für den Buchungstyp:
   - Probetraining: Grün (#22c55e)
   - Drop-In: Rot (#d6242b) 
   - Wellpass: Teal (#12a6b0)
3. **Kurs-Info** bei Probetraining/Drop-In (Kursname, Datum, Uhrzeit)
4. **Zeitstempel** wann gebucht wurde (relativ: "vor 2 Stunden")
5. **Kontaktdaten** (Name, E-Mail)
6. **Auto-Refresh** bei Änderungen (Realtime oder Polling)

**Verbesserungsvorschläge:**
- **Schnellaktionen**: Button zum Löschen/Stornieren einer Buchung
- **Filter**: Nach Typ filtern (nur Probetraining, nur Drop-In, nur Wellpass)
- **Benachrichtigungs-Badge**: Zeigt Anzahl neuer Buchungen seit letztem Besuch
- **Export**: CSV-Download der Buchungen
- **Statistik-Zusammenfassung**: "3 Probetrainings, 2 Drop-Ins, 1 Wellpass diese Woche"

### UI-Design

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🔔 Neue Widget-Buchungen                              [Filter ▼] │
├─────────────────────────────────────────────────────────────────┤
│ Zusammenfassung: 3 Probetraining • 2 Drop-In • 1 Wellpass       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Probetraining]  Max Mustermann                  vor 2 Std  │ │
│ │ max@example.com                                             │ │
│ │ 📅 CrossFit • 15.01.2026 • 18:00                     [🗑️]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Drop-In]  Anna Schmidt                          vor 5 Std  │ │
│ │ anna@example.com                                            │ │
│ │ 📅 HIIT • 16.01.2026 • 10:00                         [🗑️]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Wellpass]  Lisa Meyer                          vor 1 Tag   │ │
│ │ lisa@example.com                                            │ │
│ │ Neue Mitgliedschaft                                  [🗑️]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                    [Alle anzeigen →]                            │
└─────────────────────────────────────────────────────────────────┘
```

### Technische Umsetzung

**1. Neue Datei: `src/components/AdminWidgetBookings.tsx`**
- Lädt Daten aus `guest_registrations` und `wellpass_registrations`
- Joined `courses` für Kursdetails bei Guest-Buchungen
- Sortiert nach `created_at` DESC
- Zeigt max. 10 Einträge, mit "Alle anzeigen" Link

**2. Änderung: `src/pages/Admin.tsx`**
- Import der neuen Komponente
- Einfügen vor `<AdminStats />` im `case 'home':` Block:
```typescript
case 'home':
  return (
    <div className="space-y-6">
      <AdminWidgetBookings />  {/* NEU */}
      <AdminStats />
    </div>
  );
```

**3. Datenbank-Abfragen:**
```typescript
// Guest Registrations (Probetraining + Drop-In)
const { data: guestBookings } = await supabase
  .from('guest_registrations')
  .select(`
    id, guest_name, guest_email, booking_type, created_at, status,
    courses(id, title, course_date, start_time)
  `)
  .eq('status', 'registered')
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })

// Wellpass Registrations
const { data: wellpassBookings } = await supabase
  .from('wellpass_registrations')
  .select('id, first_name, last_name, email, created_at, status')
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })
```

### Zusätzliche Verbesserungen (Optional)

1. **Realtime-Updates**: Supabase Realtime Subscription für sofortige Aktualisierung
2. **Sound-Benachrichtigung**: Dezenter Ton bei neuer Buchung (optional aktivierbar)
3. **Detail-Dialog**: Klick auf Buchung öffnet Dialog mit allen Details + Aktionen
4. **Telefonnummer anzeigen**: Falls vorhanden aus `phone_country_code` + `phone_number`
5. **Status-Änderung**: Admins können Status direkt ändern (bestätigt/storniert)

### Zusammenfassung

| Datei | Änderung |
|-------|----------|
| `src/components/AdminWidgetBookings.tsx` | Neue Komponente erstellen |
| `src/pages/Admin.tsx` | Import + Einbindung vor AdminStats |

Die Komponente gibt Admins sofortige Übersicht über alle externen Buchungen und ermöglicht schnelles Handeln.
