

## Plan: Überarbeitung des Benachrichtigungssystems + Widget-Erweiterungen

### Übersicht

Diese Überarbeitung umfasst zwei Hauptbereiche:

1. **Benachrichtigungs-Logik überarbeiten**: Email und WhatsApp können nicht gleichzeitig ausgeschaltet werden
2. **Widgets erweitern**: Telefonnummer abfragen, AGB-Akzeptanz hinzufügen, WhatsApp-Benachrichtigungen ermöglichen

---

### Teil 1: Benachrichtigungs-Logik im Profil

**Neue Regel für Toggles:**

- Mindestens ein Kanal (Email ODER WhatsApp) muss aktiv sein
- Wenn WhatsApp aus → Email automatisch an
- Wenn Email aus → nur möglich wenn WhatsApp an
- Warnung erscheint wenn Nutzer versucht beide auszuschalten

**Datei: `src/components/UserProfile.tsx`**

Die Toggle-Handler werden angepasst:

```typescript
const handleEmailToggle = async (enabled: boolean) => {
  // Wenn Email ausgeschaltet werden soll, aber WhatsApp auch aus ist → verhindern
  if (!enabled && !notifyWhatsappEnabled) {
    toast({
      title: "Nicht möglich",
      description: "Mindestens ein Benachrichtigungskanal muss aktiv bleiben.",
      variant: "destructive"
    });
    return;
  }
  setNotifyEmailEnabled(enabled);
  await saveNotificationSettings(enabled, notifyWhatsappEnabled);
}

const handleWhatsappToggle = async (enabled: boolean) => {
  if (enabled && !phoneNumber) {
    setShowPhoneInput(true);
    return;
  }
  
  // Wenn WhatsApp ausgeschaltet werden soll UND Email auch aus ist → Email anschalten
  if (!enabled && !notifyEmailEnabled) {
    setNotifyEmailEnabled(true);
    setNotifyWhatsappEnabled(false);
    await saveNotificationSettings(true, false); // Email an, WhatsApp aus
    toast({
      title: "Email aktiviert",
      description: "Email wurde automatisch aktiviert, da mindestens ein Kanal aktiv sein muss."
    });
    return;
  }
  
  setNotifyWhatsappEnabled(enabled);
  await saveNotificationSettings(notifyEmailEnabled, enabled);
}
```

---

### Teil 2: Wellpass Widget erweitern

**Datei: `src/pages/EmbedWellpass.tsx`**

Neue Felder hinzufügen:

```tsx
// Neue States
const [phoneCountryCode, setPhoneCountryCode] = useState("+49");
const [phoneNumber, setPhoneNumber] = useState("");
const [termsAccepted, setTermsAccepted] = useState(false);

// Im Formular:
<div className="space-y-2">
  <Label>Telefon (für WhatsApp)</Label>
  <div className="flex gap-2">
    <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
      {/* Länderauswahl mit Flaggen */}
    </Select>
    <Input
      type="tel"
      placeholder="15730440756"
      value={phoneNumber}
      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
    />
  </div>
</div>

<div className="flex items-start gap-2">
  <Checkbox 
    checked={termsAccepted} 
    onCheckedChange={setTermsAccepted}
    required
  />
  <Label className="text-xs">
    Ich akzeptiere die <a href="/terms" target="_blank">AGB</a> und 
    <a href="/privacy" target="_blank">Datenschutzerklärung</a>
  </Label>
</div>

<Button disabled={!termsAccepted || isSubmitting}>
  Jetzt registrieren
</Button>
```

**Datei: `supabase/functions/register-wellpass/index.ts`**

Interface erweitern und Daten verarbeiten:

```typescript
interface WellpassRequest {
  firstName: string;
  lastName: string;
  email: string;
  accessCode: string;
  phoneCountryCode?: string;  // NEU
  phoneNumber?: string;       // NEU
}

// In user_metadata:
user_metadata: {
  // ... bestehende Felder ...
  phone_country_code: phoneCountryCode || '+49',
  phone_number: phoneNumber || '',
  notify_whatsapp_enabled: !!phoneNumber
}

// Im Webhook-Payload:
const webhookData = {
  event_type: 'registration',
  notification_method: phoneNumber ? 'both' : 'email',
  phone: phoneNumber ? formatPhoneNumber(phoneCountryCode, phoneNumber) : null,
  // ... bestehende Felder ...
}
```

---

### Teil 3: Kursplan Widget (Drop-In/Probetraining) erweitern

**Datei: `src/pages/EmbedKursplan.tsx`**

Neue Felder im Buchungs-Dialog:

```tsx
// Neue States
const [guestPhone, setGuestPhone] = useState("");
const [phoneCountryCode, setPhoneCountryCode] = useState("+49");
const [termsAccepted, setTermsAccepted] = useState(false);

// Im Buchungsformular (Dialog):
<div className="space-y-2">
  <Label>Telefon (für WhatsApp-Bestätigung)</Label>
  <div className="flex gap-2">
    <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
      {/* Länderauswahl */}
    </Select>
    <Input
      type="tel"
      placeholder="15730440756"
      value={guestPhone}
      onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
    />
  </div>
</div>

<div className="flex items-start gap-2">
  <Checkbox checked={termsAccepted} onCheckedChange={setTermsAccepted} />
  <Label className="text-xs">
    Ich akzeptiere die <a href="/terms" target="_blank">AGB</a> und 
    <a href="/privacy" target="_blank">Datenschutzerklärung</a>
  </Label>
</div>
```

**Datei: `supabase/functions/book-guest-training/index.ts`**

Telefonnummer verarbeiten und im Webhook senden:

```typescript
interface BookingRequest {
  courseId: string;
  guestName: string;
  guestEmail: string;
  bookingType: 'drop_in' | 'probetraining';
  phoneCountryCode?: string;  // NEU
  phoneNumber?: string;       // NEU
}

// Im Webhook-Payload:
const webhookPayload = {
  event_type: 'guest_ticket',
  notification_method: phoneNumber ? 'both' : 'email',
  phone: phoneNumber ? formatPhoneNumber(phoneCountryCode, phoneNumber) : null,
  // ... bestehende Felder ...
}
```

---

### Teil 4: Datenbank-Änderungen

**Neue Spalten für `guest_registrations`:**

```sql
ALTER TABLE guest_registrations 
ADD COLUMN phone_country_code text DEFAULT '+49',
ADD COLUMN phone_number text;
```

**Neue Spalten für `wellpass_registrations`:**

```sql
ALTER TABLE wellpass_registrations 
ADD COLUMN phone_country_code text DEFAULT '+49',
ADD COLUMN phone_number text,
ADD COLUMN terms_accepted_at timestamp with time zone;
```

---

### Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/components/UserProfile.tsx` | Toggle-Logik: mindestens ein Kanal aktiv |
| `src/pages/EmbedWellpass.tsx` | Telefon + AGB-Checkbox hinzufügen |
| `src/pages/EmbedKursplan.tsx` | Telefon + AGB-Checkbox im Buchungs-Dialog |
| `supabase/functions/register-wellpass/index.ts` | Telefon verarbeiten, im Webhook senden |
| `supabase/functions/book-guest-training/index.ts` | Telefon verarbeiten, im Webhook senden |
| DB Migration | Telefon-Spalten für beide Widget-Tabellen |
| `src/components/CountryFlags.tsx` | Import in Widgets für Länderauswahl |

### Webhook-Format für Make.com

Alle Webhooks enthalten künftig:

```json
{
  "event_type": "registration" | "guest_ticket",
  "notification_method": "email" | "whatsapp" | "both",
  "phone": "4915730440756",  // Formatiert ohne + und Leerzeichen
  "email": "...",
  "name": "..."
}
```

Make.com kann dann basierend auf `notification_method` entscheiden, ob Email, WhatsApp oder beides gesendet wird.

