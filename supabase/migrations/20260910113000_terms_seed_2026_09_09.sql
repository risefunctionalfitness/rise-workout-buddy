-- AGB-Fassung 2026-09-09 als Entwurf einspielen.
-- published_at bleibt NULL: erst ein bewusstes UPDATE macht sie sichtbar.
--   update public.terms_documents set published_at = now() where version = '2026-09-09';
--
-- Idempotent: erneutes Ausführen aktualisiert nur den Text, nie den
-- Veröffentlichungsstatus und nie bestehende Zustimmungen.
insert into public.terms_documents (version, title, summary_md, body_md, published_at)
values ('2026-09-09',
        'Allgemeine Geschäftsbedingungen',
        $sum$**Was sich geändert hat**

Die AGB gelten jetzt für alle — Mitglieder, 10er-Karte, Wellpass und Probetraining. Bisher war vieles nur im Mitgliedschaftsvertrag geregelt, den nicht jeder unterschreibt.

- **Haftung** folgt jetzt den gesetzlichen Vorgaben statt einem pauschalen Ausschluss.
- **Kursabsagen und Planänderungen** sind an sachliche Gründe geknüpft und werden über die App angekündigt.
- **10er-Karte und Wellpass** haben erstmals eigene Abschnitte (§ 9 und § 10).
- **Videoüberwachung**: welche Bereiche erfasst sind, 30 Tage Speicherdauer, Widerspruchsrecht (§ 7).
- **Fotos und Gesundheitsdaten** nur noch mit gesonderter, freiwilliger Einwilligung — nie als Bedingung fürs Training (§ 13).
- **Änderungen der AGB** brauchen künftig einen Anlass, sechs Wochen Vorlauf und ein Widerspruchsrecht. Schweigen gilt nicht als Zustimmung (§ 12).

Die Zustimmung ist freiwillig. Kurse kannst du weiterhin buchen, auch wenn du sie überspringst.$sum$,
        $agb$# Allgemeine Geschäftsbedingungen

RISE Functional Fitness

Fassung vom 9. September 2026 · gültig für alle Nutzerinnen und Nutzer

## § 1 Geltungsbereich und Vertragspartner

**1.1** Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Räume, Geräte, Kurse und der RISE App von RISE Functional Fitness, Inhaber Florian Göttinger, Birkenweg 9, 87459 Pfronten (nachfolgend „RISE").

**1.2** Sie gelten für alle Nutzerinnen und Nutzer, unabhängig von der Grundlage des Trainings:

- Mitglieder mit Mitgliedschaftsvertrag,

- Inhaberinnen und Inhaber einer 10er-Karte oder eines Einzeltickets (Drop-in),

- Nutzerinnen und Nutzer über EGYM Wellpass oder vergleichbare Partnerprogramme,

- Teilnehmende an Probetrainings und Veranstaltungen.

**1.3** Für Mitglieder gilt zusätzlich der individuell geschlossene Mitgliedschaftsvertrag. Weicht dieser von den AGB ab, **geht der Mitgliedschaftsvertrag vor**.

**1.4** Abweichende Bedingungen der Nutzerinnen und Nutzer werden nicht Vertragsbestandteil, auch wenn RISE ihnen nicht ausdrücklich widerspricht.

## § 2 Leistungen von RISE

**2.1** RISE stellt Trainingsflächen, Geräte und ein Kursangebot zur Verfügung. Der konkrete Umfang ergibt sich aus der jeweils gültigen Leistungs- und Preisübersicht sowie aus dem Kursplan in der RISE App.

**2.2** Öffnungs- und Kurszeiten werden in der RISE App bekannt gegeben.

**2.3** RISE kann den Betrieb an gesetzlichen Feiertagen, für notwendige Wartungs- und Instandsetzungsarbeiten sowie für höchstens 14 Tage Betriebsferien im Kalenderjahr schließen. Schließzeiten werden mindestens zwei Wochen im Voraus in der RISE App angekündigt, soweit sie nicht unvorhersehbar sind. Solche Schließzeiten begründen keinen Anspruch auf Minderung des Beitrags.

**2.4** Ist der Betrieb darüber hinaus länger als zwei Wochen zusammenhängend geschlossen, mindert sich der Monatsbeitrag von Mitgliedern für die Dauer der Schließung zeitanteilig. Die Gültigkeit von 10er-Karten verlängert sich um die Dauer der Schließung.

## § 3 Kurse und Kursbuchung

**3.1** Kursplätze werden ausschließlich über die RISE App vergeben, in der Reihenfolge der Buchung. Ein Anspruch auf einen Platz in einem bestimmten Kurs besteht nicht.

**3.2** Wie viele Kurse pro Woche gebucht werden können, richtet sich nach der Art der Mitgliedschaft und ergibt sich aus der Leistungs- und Preisübersicht. Ein nicht genutztes Wochenkontingent **verfällt am Ende der jeweiligen Woche** und wird nicht in die Folgewoche übertragen.

**3.3** Die für den jeweiligen Kurs geltenden Buchungs- und Stornofristen werden in der App beim Kurs angezeigt. Wird ein gebuchter Platz nicht fristgerecht storniert, gilt er als in Anspruch genommen; bei 10er-Karten wird eine Einheit abgebucht.

**3.4** RISE kann einzelne Kurstermine aus sachlichem Grund absagen, insbesondere bei Erkrankung oder Ausfall der Kursleitung, bei Unterschreiten einer Mindestteilnehmerzahl, bei technischen Störungen oder aus betrieblichen Gründen. Die Absage wird so früh wie möglich über die RISE App bekannt gegeben. Bereits abgebuchte Einheiten einer 10er-Karte werden in diesem Fall wieder gutgeschrieben.

**3.5** RISE kann Kursplan, Kurszeiten und Kursangebot ändern, soweit dies für die Nutzerinnen und Nutzer zumutbar ist und der Gesamtumfang des Angebots im Wesentlichen erhalten bleibt. Wird das Angebot dauerhaft und erheblich eingeschränkt, können Mitglieder den Mitgliedschaftsvertrag außerordentlich kündigen.

**3.6** Bei wiederholtem Fernbleiben ohne rechtzeitige Stornierung kann RISE die Buchungsmöglichkeit nach vorheriger Ankündigung vorübergehend einschränken, um die Plätze für andere Nutzerinnen und Nutzer freizuhalten.

## § 4 Zutritt und Open Gym

**4.1** Der Zutritt erfolgt über ein persönliches Zutrittsmedium (Zahlencode). Dieses ist persönlich und nicht übertragbar. Die Weitergabe an Dritte sowie das Mitnehmen nicht berechtigter Personen ist nicht gestattet.

**4.2** Bei schuldhaftem Verstoß gegen Ziffer 4.1 ist eine Vertragsstrafe in Höhe von 100 € zu zahlen. **Der Nachweis, dass kein oder ein wesentlich geringerer Schaden entstanden ist, bleibt vorbehalten.** Weitergehende Ansprüche und das Recht zur außerordentlichen Kündigung bleiben unberührt; eine gezahlte Vertragsstrafe wird auf einen weitergehenden Schadensersatz angerechnet.

**4.3** RISE kann Open-Gym-Zeiten und die Zahl gleichzeitig anwesender Personen aus Sicherheits- und Betriebsgründen begrenzen.

**4.4** Der Zutritt zum unbeaufsichtigten Open Gym ist erst ab Vollendung des 16. Lebensjahres und nur mit schriftlicher Zustimmung der Erziehungsberechtigten gestattet. Jüngere Personen dürfen ausschließlich an betreuten Kursen teilnehmen.

**4.5** Der Verlust des Zutrittscodes oder der Verdacht, dass Dritte ihn kennen, ist RISE unverzüglich mitzuteilen.

## § 5 Pflichten der Nutzerinnen und Nutzer

**5.1** Geräte und Einrichtungen dürfen nur bestimmungsgemäß und zweckmäßig genutzt werden. In den Trainingsräumen sind saubere Sportschuhe zu tragen, die nicht auf der Straße getragen wurden.

**5.2** Geräte und Ablageflächen sind nach der Nutzung zu reinigen und Gewichte an ihren Platz zurückzuräumen.

**5.3** Mängel an Geräten oder Einrichtungen sind unverzüglich zu melden. Das betroffene Gerät ist bis zur Klärung nicht weiter zu benutzen.

**5.4** Den Anweisungen des Personals ist Folge zu leisten.

**5.5** Das Training unter Einfluss von Alkohol oder berauschenden Mitteln ist nicht gestattet. Der Konsum, Besitz oder Handel mit Dopingmitteln auf dem Gelände führt zum sofortigen Ausschluss.

**5.6** Jede Person trainiert eigenverantwortlich und schätzt ihre gesundheitliche Belastbarkeit selbst ein. RISE empfiehlt, vor Aufnahme des Trainings und bei gesundheitlichen Beschwerden ärztlichen Rat einzuholen. Bestehende gesundheitliche Einschränkungen sollten der Kursleitung mitgeteilt werden, damit Übungen angepasst werden können; eine Pflicht dazu besteht nicht.

## § 6 Haftung

**6.1** RISE haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer fahrlässigen oder vorsätzlichen Pflichtverletzung von RISE, seiner gesetzlichen Vertreter oder Erfüllungsgehilfen beruhen, sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen.

**6.2** Bei leicht fahrlässiger Verletzung einer Pflicht, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung regelmäßig vertraut werden darf, ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.

**6.3** Für mitgebrachte Gegenstände haftet RISE nur nach Maßgabe der Ziffern 6.1 und 6.2. Wertsachen sollten nicht mitgebracht oder in den bereitgestellten Schließfächern verwahrt werden.

**6.4** Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.

## § 7 Videoüberwachung

**7.1** Der Trainings- und der Eingangsbereich werden videoüberwacht. **Umkleiden, Duschen und Sanitärräume werden nicht erfasst.**

**7.2** Zweck ist der Schutz der Nutzerinnen und Nutzer sowie der Schutz des Eigentums vor Diebstahl und Beschädigung, insbesondere während der personallosen Open-Gym-Zeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.

**7.3** Die Aufnahmen werden **nach 30 Tagen automatisch gelöscht**, sofern kein konkreter Anlass zur weiteren Aufbewahrung besteht --- etwa die Aufklärung eines gemeldeten Vorfalls. Die Speicherdauer trägt dem Umstand Rechnung, dass das Studio über weite Teile des Tages ohne Personal betrieben wird und Beschädigungen oder Entwendungen den Betroffenen häufig erst mit mehreren Tagen Verzögerung auffallen.

**7.4** Zugriff auf die Aufnahmen hat ausschließlich der Inhaber, Florian Göttinger. Eine Auswertung erfolgt nur anlassbezogen.

**7.5** Der Verarbeitung kann nach Art. 21 DSGVO widersprochen werden. Am Eingang wird zusätzlich durch Hinweisschild nach Art. 13 DSGVO informiert.

## § 8 RISE App

**8.1** Die RISE App wird kostenlos zur Verfügung gestellt. Die Buchung von Kursplätzen erfolgt ausschließlich über die App.

**8.2** Zugangsdaten sind geheim zu halten und nicht an Dritte weiterzugeben.

**8.3** RISE bemüht sich um eine hohe Verfügbarkeit, schuldet sie aber nicht. Wartungsarbeiten und Störungen können die Nutzung vorübergehend einschränken. Bei längerem Ausfall organisiert RISE die Kursvergabe auf anderem Weg und informiert darüber im Studio.

## § 9 10er-Karten und Einzeltickets

**9.1** Eine 10er-Karte berechtigt zur Teilnahme an zehn Kursen. Es besteht keine Laufzeitbindung; eine Kündigung ist nicht erforderlich.

**9.2** Die 10er-Karte ist **12 Monate ab Kauf** gültig. Danach verfallen nicht genutzte Einheiten. Bei nachgewiesener längerer Verhinderung durch Krankheit, Schwangerschaft oder vergleichbare Gründe verlängert sich die Gültigkeit auf Antrag um die Dauer der Verhinderung.

**9.3** Karten und Einzeltickets sind persönlich und nicht übertragbar.

**9.4** Eine Erstattung nicht genutzter Einheiten erfolgt nicht, außer wenn RISE den Betrieb einstellt oder die Nutzung aus einem von RISE zu vertretenden Grund dauerhaft nicht mehr möglich ist.

## § 10 Nutzung über EGYM Wellpass

**10.1** Die Nutzung über EGYM Wellpass erfolgt auf Grundlage des Vertrags zwischen der Nutzerin oder dem Nutzer und EGYM Wellpass. Ein Beitrag an RISE ist nicht zu zahlen.

**10.2** Der Zutritt setzt einen gültigen Check-in über EGYM Wellpass voraus.

**10.3** Es besteht keine Mindestnutzungsdauer und keine Bindung gegenüber RISE. Die Beendigung richtet sich ausschließlich nach dem Vertrag mit EGYM Wellpass.

**10.4** Für Kursbuchung, Zutritt, Hausordnung und Haftung gelten dieselben Regeln wie für alle anderen Nutzerinnen und Nutzer.

**10.5** Ändern sich die Konditionen der Partnerschaft oder endet sie, endet auch die Nutzungsmöglichkeit über EGYM Wellpass. RISE informiert darüber rechtzeitig in der App.

## § 11 Hausrecht

**11.1** Bei erheblichen oder wiederholten Verstößen gegen diese AGB kann RISE nach vorheriger Abmahnung den Zutritt verweigern und bestehende Verträge aus wichtigem Grund kündigen.

**11.2** Bei schwerwiegenden Verstößen --- insbesondere Gewalt, Bedrohung, Diebstahl, Doping oder Weitergabe des Zutrittscodes im größeren Umfang --- ist eine Abmahnung entbehrlich.

## § 12 Änderungen dieser AGB

**12.1** RISE kann diese AGB ändern, soweit dies erforderlich ist, um sie an eine geänderte Gesetzeslage oder Rechtsprechung anzupassen, Regelungslücken zu schließen oder Änderungen des Angebots abzubilden, und soweit die Änderung die Nutzerinnen und Nutzer nicht unangemessen benachteiligt. Das vertragliche Verhältnis von Leistung und Gegenleistung wird durch eine Änderung nach dieser Ziffer nicht berührt.

**12.2** Änderungen werden mindestens sechs Wochen vor ihrem Wirksamwerden in Textform mitgeteilt, zusammen mit einem Hinweis auf das Widerspruchsrecht und die Frist.

**12.3** Der Änderung kann innerhalb von sechs Wochen nach Zugang der Mitteilung in Textform widersprochen werden. Wird widersprochen, gilt für bestehende Verträge die bisherige Fassung fort; RISE kann den Vertrag in diesem Fall zum nächsten zulässigen Termin ordentlich kündigen.

**12.4 Schweigen gilt nicht als Zustimmung.** Eine Änderung, die über Ziffer 12.1 hinausgeht --- insbesondere eine Änderung von Beitrag, Laufzeit oder Kündigungsfrist ---, wird nur mit ausdrücklicher Zustimmung wirksam.

## § 13 Datenschutz

**13.1** Wie RISE personenbezogene Daten verarbeitet, steht in der Datenschutzerklärung. Sie ist jederzeit in der RISE App und auf rise-ff.de abrufbar.

**13.2** Die Datenschutzerklärung ist eine Information, keine Vertragsbedingung. Sie muss **nicht akzeptiert** werden.

**13.3** Für die Veröffentlichung von Fotos und Videos sowie für die Verarbeitung von Gesundheits- und Trainingsdaten holt RISE gesonderte Einwilligungen ein. Diese sind freiwillig, jederzeit widerrufbar und keine Voraussetzung für das Training oder für die Kursbuchung.

## § 14 Schlussbestimmungen

**14.1** Es gilt deutsches Recht.

**14.2** Erklärungen gegenüber RISE bedürfen der Textform; eine E-Mail an florian@rise-ff.de genügt.

**14.3** RISE ist nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.

**14.4** Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.

RISE Functional Fitness · Inhaber Florian Göttinger · Birkenweg 9 · 87459 Pfronten · florian@rise-ff.de · Fassung vom 9. September 2026$agb$,
        null)
on conflict (version) do update
  set title      = excluded.title,
      summary_md = excluded.summary_md,
      body_md    = excluded.body_md;
