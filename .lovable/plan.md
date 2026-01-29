
## Plan: Kopier-Button für Anmeldedaten nach Mitglieder-Erstellung

### Übersicht

Nach erfolgreicher Erstellung eines neuen Mitglieds wird ein Button angezeigt, mit dem die Zugangsdaten direkt in die Zwischenablage kopiert werden können - ideal zum Teilen via WhatsApp.

### Änderung

**Datei: `src/pages/Admin.tsx`**

Im Erfolgsfall nach `handleCreateMember` (Zeile 318-335) wird der Toast erweitert:

```tsx
toast({
  title: "Mitglied erstellt",
  description: (
    <div className="flex flex-col gap-2">
      <span>{newMemberFirstName} kann sich jetzt anmelden!</span>
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={() => {
          const text = `Hallo ${newMemberFirstName},\n\nDeine Rise-Zugangsdaten:\nE-Mail: ${newMemberEmail}\nPasswort: ${newMemberCode}\n\nApp: https://rise-ff.lovable.app`;
          navigator.clipboard.writeText(text);
          toast({ title: "Kopiert!" });
        }}
      >
        <Copy className="h-4 w-4 mr-2" />
        Zugangsdaten kopieren
      </Button>
    </div>
  ),
});
```

### Kopierter Text (WhatsApp-optimiert)

```
Hallo [Vorname],

Deine Rise-Zugangsdaten:
E-Mail: [email]
Passwort: [access_code]

App: https://rise-ff.lovable.app
```

### Zusätzlich benötigt

- Import von `Copy` Icon aus lucide-react (Zeile 11)

### Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/Admin.tsx` | Toast mit Kopier-Button erweitern, Copy-Icon importieren |
