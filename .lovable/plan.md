

## Fix: Password Reset findet User nicht + fehlendes Logging

### Problem
1. **`listUsers()` ist paginiert**: Standardmaessig werden nur 50 User zurueckgegeben. Bei mehr als 50 Usern wird die E-Mail nicht gefunden, die Funktion gibt `success: true` zurueck ohne Webhook-Aufruf.
2. **Kein Logging**: Es gibt keine `console.log`-Ausgaben, die den Ablauf dokumentieren. Deshalb sehen wir in den Logs nichts.

### Loesung

**`supabase/functions/reset-password/index.ts`**:

1. **User-Suche per E-Mail statt `listUsers()`**: Statt alle User zu laden und clientseitig zu filtern, nutze die Supabase Admin API mit Seitenweise-Iteration oder besser: direkt `listUsers({ filter: email })` verwenden. Alternativ: Paginierung implementieren.

   Beste Loesung: Die Supabase Admin API unterstuetzt keinen direkten Email-Filter in `listUsers()`. Stattdessen den User ueber die `profiles`-Tabelle suchen (dort ist die E-Mail oder `user_id` gespeichert) und dann per `getUserById()` den Auth-User holen.

   Konkret:
   ```typescript
   // Statt listUsers():
   const { data: profileData } = await supabaseAdmin
     .from("profiles")
     .select("user_id")
     .eq("email", email.toLowerCase())
     .maybeSingle();
   
   if (!profileData) {
     // User nicht gefunden - generische Antwort
     return genericSuccess();
   }
   
   const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(profileData.user_id);
   ```

   Falls `profiles` kein `email`-Feld hat, alternative Loesung: **alle Seiten von `listUsers()` durchiterieren**:
   ```typescript
   let allUsers = [];
   let page = 1;
   const perPage = 1000;
   while (true) {
     const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
     allUsers.push(...data.users);
     if (data.users.length < perPage) break;
     page++;
   }
   ```

2. **Logging hinzufuegen**: An allen kritischen Stellen `console.log` einfuegen:
   - Email empfangen
   - User gefunden/nicht gefunden
   - Webhook URL vorhanden/nicht vorhanden
   - Webhook Response Status

3. **Webhook Response pruefen**: `fetch`-Response loggen, um zu sehen ob Make.com die Anfrage akzeptiert:
   ```typescript
   const res = await fetch(webhookUrl, { ... });
   console.log("Webhook response:", res.status, await res.text());
   ```

### Dateien
- `supabase/functions/reset-password/index.ts` (Paginierung + Logging + Response-Check)

