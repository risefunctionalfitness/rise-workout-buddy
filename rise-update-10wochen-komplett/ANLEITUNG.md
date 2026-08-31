# Update: 10-Wochen-Karten ohne Storno-Sperre (+ alles davor)

Dieses Paket ersetzt `rise-update-10wochen-flo.zip` – es enthält **alles**:
Storno-Schonfrist, Tagesansicht, Anmeldeschluss, die Flo-Regel und das Neue von
jetzt. Wenn du noch nichts davon hochgeladen hast: nur dieses Paket nehmen.

## Hochladen

Auf der Startseite des App-Repos „Add file → Upload files", die Ordner **`src`**
und **`supabase`** zusammen reinziehen, Commit-Nachricht eintragen und
committen. Die Datenbank-Änderungen sind schon live; die Migrationsdateien
liegen zur Dokumentation dabei.

---

## Neu: 10-Wochen-Karten sind von der Storno-Rate ausgenommen

Wer eine 10-Wochen-Karte hat, kann jetzt **immer 14 Tage im Voraus buchen** –
also das volle Fenster, unabhängig davon, wie oft er storniert hat. Die Grenze
bleibt die Gültigkeit der Karte: Kurse nach dem Ablaufdatum sind weiterhin
nicht buchbar.

Das gilt für **alle** 10-Wochen-Karten, auch die 6 bestehenden – anders als bei
der Flo-Regel gibt es hier keine Übergangsfrist, weil es eine Erleichterung ist
und keine Einschränkung.

Zwei Nebeneffekte, die dazugehören:

* Diese Mitglieder sehen ihren Fairness-Score als Level 1 / 14 Tage.
* Beim Abmelden erscheint die Fairness-Warnung nicht mehr – sie wäre
  gegenstandslos, wenn die Quote für sie ohnehin nichts bewirkt.

Für alle anderen (auch für Jahres-10er-Karten) ändert sich nichts, die
Storno-Rate wirkt dort weiter wie bisher.

---

## Zu deiner Frage: Credits beim händischen Eintragen

**Da musst du nichts ändern – es funktioniert schon so, wie du es willst.**

Ich habe es in der Datenbank durchgespielt:

* 10er Karte, über das **+** in einen Kurs eingetragen: 3 Credits → **2 Credits**.
* Basic Member, genauso eingetragen: Wochenzähler 0 → **1**.

Der Abzug hängt nämlich nicht daran, *wer* die Anmeldung auslöst, sondern an der
Anmeldung selbst – die Datenbank bucht den Credit ab, sobald eine Anmeldung
entsteht, egal ob das Mitglied sich selbst anmeldet oder du es einträgst. Trägst
du jemanden wieder aus, kommt der Credit zurück.

Was beim händischen Eintragen **nicht** geprüft wird: Anmeldeschluss,
Wochenlimit von Basic Members, Credit-Guthaben und die neue Flo-Regel. Du kannst
also jemanden auch dann noch eintragen, wenn er sich selbst nicht mehr anmelden
könnte – der Credit wird aber trotzdem korrekt abgezogen. Das ist so gewollt,
damit du Ausnahmen machen kannst; sag Bescheid, wenn du dort eine Warnung
angezeigt haben möchtest.

---

## Geprüft

* TypeScript-Prüfung und Build laufen fehlerfrei.
* Alle 6 bestehenden 10-Wochen-Karten liefern jetzt Level 1 / 14 Tage; die
  Jahres-Karten behalten ihre echten Werte (dort stehen aktuell Level 3 und 4).
* Grenzfall getestet: Ein Kurs einen Tag **vor** dem Ablaufdatum ist buchbar,
  einen Tag **danach** nicht.
* Credit-Abzug beim händischen Eintragen wie oben nachgemessen.
