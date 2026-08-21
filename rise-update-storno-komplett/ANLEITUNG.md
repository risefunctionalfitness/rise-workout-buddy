# Update: Storno-Rate, Tagesansicht und drei Nachbesserungen

Dieses Paket ersetzt das vorherige (`rise-update-storno-tagesansicht.zip`) –
es enthält **alles**, also auch die Dateien von vorhin. Wenn du das alte Paket
noch nicht hochgeladen hast: einfach dieses nehmen.

## Hochladen

Auf der Startseite des App-Repos „Add file → Upload files", die Ordner
**`src`** und **`supabase`** zusammen reinziehen, Commit-Nachricht eintragen
(z. B. „Storno-Rate fair machen + Tagesansicht") und committen.

Die Datenbank-Änderungen sind **schon live** – ich habe sie direkt in Supabase
angewendet. Die beiden Migrationsdateien liegen trotzdem mit im Paket, damit
euer Repo den Stand sauber dokumentiert. Sie sind so geschrieben, dass ein
erneutes Ausführen nichts kaputt macht.

---

## Teil 1: Versehentliche Abmeldung zählt nicht (wie besprochen)

Ich habe die **Schonfrist** genommen, nicht den Bestätigungs-Dialog: Der Dialog
würde jede Buchung für alle Mitglieder um einen Klick verlängern und hilft nur
gegen Vertipper. Die Schonfrist ist unsichtbar und deckt auch „falschen Kurs
erwischt, gleich gemerkt" ab.

Wer sich **innerhalb von 30 Sekunden** nach der Anmeldung wieder abmeldet, bei
dem zählt das weder als Storno noch als Buchung – die Quote bleibt exakt so,
als wäre nichts passiert. Gefiltert wird überall: Fairness-Score und
Buchungsfenster, Storno-Rate-Karte, Mitglieder-Statistik, Achievements,
Risk-Radar.

In der App ist das Fenster mit **25 Sekunden** angesetzt, in der Datenbank mit
30 – der Puffer verhindert, dass die App etwas verspricht, was die Datenbank
durch die Laufzeit der Anfrage schon nicht mehr einhält.

## Teil 2: Kurse bleiben den ganzen Tag stehen (wie besprochen)

Alle Kurse des laufenden Tages bleiben bis Mitternacht sichtbar – Kursliste,
Kalender und Tagesansicht. Beendete Kurse sind leicht ausgegraut, im Detail
steht „Kurs beendet" bzw. „Kurs beendet – du warst angemeldet", An- und
Abmelden ist dort nicht mehr möglich. Der Tageswechsel richtet sich nach der
lokalen Uhrzeit des Handys, nicht nach UTC. Die Trainer-Ansicht zeigt die
heutigen Kurse ebenfalls den ganzen Tag, damit die Anwesenheit noch
nachgetragen werden kann.

---

## Teil 3: Die drei Punkte von vorhin

### 1. Automatische Absagen zählen nicht mehr als Storno des Mitglieds

Wird ein Kurs wegen zu weniger Anmeldungen automatisch abgesagt, bekommen die
Anmeldungen jetzt einen **eigenen Status** (`course_cancelled`) statt einfach
„storniert". Damit fallen sie aus allen Storno-Auswertungen heraus – Credits
und Wochenlimit werden natürlich weiterhin zurückgegeben.

**Rückwirkend korrigiert:** Ich habe die Vergangenheit durchgesehen und
**47 Anmeldungen** umgestellt, **21 davon aus den letzten 90 Tagen** (nur die
zählen aktuell in die Quoten). Betroffen waren 39 Mitglieder.

> Kleine Korrektur zu vorhin: Ich hatte 116 bzw. 38 genannt. Bei genauerer
> Prüfung waren von den 116 nur 47 wirklich automatische Absagen – die
> restlichen 69 waren echte Abmeldungen von Mitgliedern, die *dazu geführt*
> haben, dass der Kurs unter 3 Teilnehmer rutschte. Die bleiben zu Recht
> stehen. Unterscheiden lassen sie sich am Zeitpunkt: der Cron-Job kann erst
> nach dem Anmeldeschluss zuschlagen. Ich habe jede einzelne Zeile gegen das
> Änderungsprotokoll geprüft – keine Fehltreffer in beide Richtungen.

**Netter Nebeneffekt:** Vorher konnte die automatische Absage jemanden von der
Warteliste in den gerade absterbenden Kurs nachrücken lassen. Das passiert
durch den eigenen Status nicht mehr.

### 2. Schlupfloch bei der Schonfrist geschlossen

Abmelden → sofort wieder anmelden → innerhalb von 30 Sekunden erneut abmelden:
So ließ sich ein echtes Storno verstecken. Jetzt merkt sich jede Anmeldung, ob
es dafür schon einmal ein echtes Storno gab – **danach greift die Schonfrist
für diesen Kurs nicht mehr**. Ein zweites echtes Versehen bleibt weiterhin
verschont, nur der Trick funktioniert nicht mehr.

Beim Prüfen ist mir noch ein zweiter Weg aufgefallen: Man hätte den
Anmeldezeitpunkt direkt über die Schnittstelle zurückdrehen können und wäre so
bei *jedem* Storno in der Schonfrist gelandet. Auch das ist jetzt zu – der
Zeitstempel lässt sich nur noch bei einer echten Neuanmeldung ändern, und die
beiden Markierungen setzt ausschließlich die Datenbank selbst.

### 3. Anmeldeschluss gilt jetzt auch für Einladungen

Eine Kurseinladung anzunehmen hat bisher den Anmeldeschluss übersprungen.
Jetzt:

* Ist die Frist durch, verschwindet der „Annehmen"-Button, die Einladung
  bekommt den Hinweis **„Anmeldeschluss vorbei"**, ablehnen geht weiterhin.
* Solche Einladungen zählen nicht mehr im roten Zähler am Einladungs-Symbol.
* Zusätzlich prüft es die **Datenbank** selbst – damit gilt die Frist für jeden
  Weg in den Kurs, nicht nur für den Button. Admins und Trainer dürfen
  weiterhin nachträglich eintragen, Event-Kurse bleiben wie bisher offen.

Dabei ist mir aufgefallen, dass die App bei abgelaufener Frist die falsche
Meldung zeigen konnte („Du hast dein wöchentliches Limit erreicht", obwohl nur
die Frist um war). Das ist mitkorrigiert, und App und Datenbank rechnen die
Frist jetzt beide in deutscher Zeit.

---

## Geprüft

* TypeScript-Prüfung und Build laufen fehlerfrei.
* Beide Migrationen syntaktisch geparst und in Supabase aktiv.
* Die Schonfrist habe ich direkt in der Datenbank durchgespielt (in einer
  Transaktion, die anschließend zurückgerollt wurde): normales Versehen wird
  verschont, echtes Storno zählt, beide Trick-Varianten und der
  Manipulationsversuch von außen prallen ab, ein zweites echtes Versehen wird
  weiterhin verschont.
* Anmeldeschluss gegen einen Stichprobensatz von 20 Mitgliedern getestet: alle
  können zukünftige Kurse normal buchen.
* Ein Review-Durchgang über den kompletten Änderungssatz; alle Funde sind
  eingearbeitet.

### Eine Sache, die ich dir sagen muss

Bei der rückwirkenden Korrektur habe ich das Feld „zuletzt geändert" der
Anmeldungen überschrieben – bei rund 3.360 alten, bereits stornierten
Anmeldungen steht dort jetzt der Zeitpunkt der Korrektur statt der
ursprüngliche Abmeldezeitpunkt. Für 439 Zeilen konnte ich den echten Wert aus
dem Änderungsprotokoll wiederherstellen, weiter zurück (vor Ende April) reicht
das Protokoll nicht.

Praktisch macht das nichts: Die App zeigt dieses Feld nirgends an und rechnet
auch nicht damit. Ärgerlich ist nur, dass die alten Abmeldezeitpunkte in der
Tabelle selbst nicht mehr stehen. Die Migrationsdatei ist jetzt so gebaut, dass
so etwas nicht noch einmal passiert.

---

## Noch offen (nichts davon eilt)

* **Umbuchen als Schlupfloch:** Ein Mitglied könnte seine Anmeldung technisch
  direkt auf „umgebucht" oder „Warteliste storniert" setzen – beide Status
  zählen nicht in die Storno-Rate. Das gab es vorher schon und erfordert, dass
  jemand bewusst an der App vorbei arbeitet. Sauber lösen ließe sich das, indem
  Abmeldungen nur noch über eine Server-Funktion laufen.
* **Event-Kurse und Anmeldeschluss:** Events sind bewusst ausgenommen, damit
  Externe wie bisher auch kurzfristig noch buchen können. Sag Bescheid, wenn du
  auch für Events eine Frist willst.
