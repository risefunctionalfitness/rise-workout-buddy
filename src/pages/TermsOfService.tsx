import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

const TermsOfService = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Allgemeine Geschäftsbedingungen</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <h2 className="text-xl font-bold mb-4">Allgemeine Geschäftsbedingungen (AGB)</h2>
          <p className="text-lg font-semibold text-primary mb-6">RISE Functional Fitness</p>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">1. Geltungsbereich</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für sämtliche Vertragsverhältnisse zwischen RISE Functional Fitness, Inhaber: Florian Göttinger, Birkenweg 9, 87459 Pfronten (nachfolgend „Studio") und seinen Mitgliedern (nachfolgend „Mitglied").
            </p>
            <p className="text-sm text-muted-foreground mb-2">Die AGB gelten insbesondere für:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>die Nutzung des Fitnessstudios,</li>
              <li>die Teilnahme an Trainings, Kursen und Veranstaltungen,</li>
              <li>die Nutzung der vom Studio bereitgestellten Studio-App und digitalen Angebote.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Abweichende Bedingungen des Mitglieds finden keine Anwendung.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">2. Vertragsgegenstand</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Das Studio bietet funktionelles Fitnesstraining, betreutes und unbetreutes Training, Kurse sowie digitale Leistungen über eine Studio-App an.
            </p>
            <p className="text-sm text-muted-foreground mb-2">Der konkrete Leistungsumfang ergibt sich aus:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>dem gewählten Mitgliedschaftsmodell,</li>
              <li>der jeweils gültigen Leistungsbeschreibung,</li>
              <li>dem aktuellen Kurs- und Trainingsangebot.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Ein Anspruch auf bestimmte Trainer, Trainingszeiten, Kurse oder Inhalte besteht nicht.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">3. Studio-App & digitale Leistungen</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Die Nutzung der vom Studio bereitgestellten Studio-App ist Bestandteil der Mitgliedschaft.
            </p>
            <p className="text-sm text-muted-foreground mb-2">Über die Studio-App können insbesondere folgende Funktionen bereitgestellt werden:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Trainingspläne und Trainingsdokumentation</li>
              <li>Trainingshistorie (z. B. Übungen, Gewichte, Wiederholungen)</li>
              <li>Trainingszeiten und Trainingshäufigkeit</li>
              <li>Leistungs- und Trainingsdaten</li>
              <li>studiointerne Informationen und Mitteilungen</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Die App dient der Trainingsunterstützung und Motivation und ersetzt keine medizinische oder therapeutische Beratung.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Das Studio übernimmt keine Gewähr für eine jederzeitige, unterbrechungsfreie oder fehlerfreie technische Verfügbarkeit der App.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">4. Kommunikation per E-Mail</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Das Mitglied erklärt sich damit einverstanden, dass das Studio im Rahmen der Mitgliedschaft E-Mails an die vom Mitglied angegebene E-Mail-Adresse versendet.
            </p>
            <p className="text-sm text-muted-foreground mb-2">Dies umfasst insbesondere:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>organisatorische und betriebliche Informationen,</li>
              <li>vertragsrelevante Mitteilungen,</li>
              <li>Informationen zur Nutzung der Studio-App,</li>
              <li>trainings- und mitgliedschaftsbezogene Hinweise.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Ein Widerruf ist jederzeit mit Wirkung für die Zukunft möglich. Gesetzlich oder vertraglich notwendige Mitteilungen bleiben hiervon unberührt.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">5. Mitwirkungspflichten des Mitglieds</h3>
            <p className="text-sm text-muted-foreground mb-2">Das Mitglied verpflichtet sich:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>korrekte und vollständige Angaben zu seinen persönlichen Daten zu machen,</li>
              <li>Änderungen (z. B. Kontaktdaten, gesundheitliche Einschränkungen) unverzüglich mitzuteilen,</li>
              <li>die Studio-App sachgemäß zu nutzen,</li>
              <li>den Anweisungen des Trainer- und Studiopersonals Folge zu leisten.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Das Training erfolgt grundsätzlich eigenverantwortlich.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">6. Gesundheit & Eigenverantwortung</h3>
            <p className="text-sm text-muted-foreground mb-2">Die Teilnahme am Training erfolgt auf eigene Gefahr.</p>
            <p className="text-sm text-muted-foreground mb-2">Das Studio empfiehlt vor Trainingsbeginn eine ärztliche Abklärung, insbesondere bei:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>bekannten Vorerkrankungen,</li>
              <li>Schwangerschaft,</li>
              <li>längerer sportlicher Inaktivität.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Das Mitglied bestätigt, gesundheitlich in der Lage zu sein, am Training teilzunehmen.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">7. Haftung</h3>
            <p className="text-sm text-muted-foreground mb-2">Das Studio haftet ausschließlich bei Vorsatz oder grober Fahrlässigkeit.</p>
            <p className="text-sm text-muted-foreground mb-2">Eine Haftung ist insbesondere ausgeschlossen für:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Verletzungen bei eigenverantwortlichem Training,</li>
              <li>gesundheitliche Schäden aufgrund falscher Eigeneinschätzung,</li>
              <li>ausbleibende Trainings- oder Leistungserfolge,</li>
              <li>technische Störungen der Studio-App oder externer Systeme,</li>
              <li>Verlust oder Beschädigung persönlicher Gegenstände.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Die Haftung ist – soweit gesetzlich zulässig – auf den gezahlten Mitgliedsbeitrag begrenzt.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">8. Zahlungsbedingungen</h3>
            <p className="text-sm text-muted-foreground mb-2">Die Höhe der Mitgliedsbeiträge ergibt sich aus dem gewählten Tarif.</p>
            <p className="text-sm text-muted-foreground mb-2">Die Beiträge sind gemäß Vereinbarung monatlich oder für die vereinbarte Laufzeit im Voraus zu zahlen.</p>
            <p className="text-sm text-muted-foreground mb-2">Bei Zahlungsverzug ist das Studio berechtigt:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>den Zugang zum Studio und zur Studio-App zu sperren,</li>
              <li>Mahngebühren zu erheben,</li>
              <li>den Vertrag außerordentlich zu kündigen.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">9. Vertragslaufzeit & Kündigung</h3>
            <p className="text-sm text-muted-foreground mb-2">Die Vertragslaufzeit ergibt sich aus dem gewählten Mitgliedschaftsmodell.</p>
            <p className="text-sm text-muted-foreground">Ordentliche Kündigungen sind unter Einhaltung der vereinbarten Fristen möglich. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">10. Datenschutz</h3>
            <p className="text-sm text-muted-foreground mb-2">Das Studio verarbeitet personenbezogene Daten im Einklang mit der Datenschutz-Grundverordnung (DSGVO).</p>
            <p className="text-sm text-muted-foreground mb-2">Die Verarbeitung umfasst insbesondere:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Mitgliedschafts- und Vertragsdaten,</li>
              <li>Trainings- und Leistungsdaten,</li>
              <li>Nutzungsdaten der Studio-App,</li>
              <li>Kommunikationsdaten (z. B. E-Mail).</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Weitere Informationen ergeben sich aus der jeweils gültigen Datenschutzerklärung des Studios.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">11. Hausordnung</h3>
            <p className="text-sm text-muted-foreground mb-2">Die jeweils aktuelle Hausordnung ist Bestandteil dieser AGB.</p>
            <p className="text-sm text-muted-foreground">Den Anweisungen des Trainer- und Studiopersonals ist Folge zu leisten. Bei schwerwiegenden oder wiederholten Verstößen kann das Studio Hausverbot erteilen oder den Vertrag außerordentlich kündigen.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">12. Änderungen des Angebots</h3>
            <p className="text-sm text-muted-foreground mb-2">Das Studio behält sich vor, sein Angebot weiterzuentwickeln oder anzupassen (z. B. Kurspläne, Trainer, App-Funktionen), sofern der wesentliche Vertragszweck erhalten bleibt.</p>
            <p className="text-sm text-muted-foreground">Hieraus ergeben sich keine Minderungs- oder Schadensersatzansprüche.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">13. Schlussbestimmungen</h3>
            <p className="text-sm text-muted-foreground mb-2">Es gilt deutsches Recht. Gerichtsstand ist – soweit gesetzlich zulässig – der Sitz des Studios.</p>
            <p className="text-sm text-muted-foreground">Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Regelungen unberührt (Salvatorische Klausel).</p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService
