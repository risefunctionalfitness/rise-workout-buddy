import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

const PrivacyPolicy = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Datenschutzerklärung</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <h2 className="text-xl font-bold mb-4">Datenschutzerklärung</h2>
          <p className="text-lg font-semibold text-primary mb-6">RISE Functional Fitness</p>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">1. Allgemeine Hinweise</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Der Schutz Ihrer personenbezogenen Daten ist uns ein wichtiges Anliegen. Wir verarbeiten Ihre Daten ausschließlich im Einklang mit den geltenden datenschutzrechtlichen Vorschriften, insbesondere der Datenschutz-Grundverordnung (DSGVO).
            </p>
            <p className="text-sm text-muted-foreground">
              Mit dieser Datenschutzerklärung informieren wir Sie darüber, welche personenbezogenen Daten wir im Rahmen Ihrer Mitgliedschaft, Ihres Besuchs im Studio sowie bei der Nutzung der Studio-App verarbeiten und welche Rechte Ihnen zustehen.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">2. Verantwortlicher</h3>
            <p className="text-sm text-muted-foreground mb-2">Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:</p>
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <p className="font-medium">RISE Functional Fitness</p>
              <p>Einzelunternehmen, Inhaber: Florian Göttinger</p>
              <p>Birkenweg 9</p>
              <p>87459 Pfronten</p>
              <p className="mt-2">E-Mail: florian@rise-ff.de</p>
              <p>Telefon: 015730440756</p>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">3. Begriffsbestimmungen</h3>
            <p className="text-sm text-muted-foreground">
              Es gelten die Begriffsbestimmungen der DSGVO, insbesondere zu „personenbezogenen Daten", „Verarbeitung", „Verantwortlicher" und „Auftragsverarbeiter".
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">4. Erhebung und Verarbeitung personenbezogener Daten</h3>
            
            <h4 className="text-sm font-semibold mt-4 mb-2">4.1 Mitgliedschaft & Vertragsabwicklung</h4>
            <p className="text-sm text-muted-foreground mb-2">Im Rahmen der Mitgliedschaft verarbeiten wir insbesondere:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Vor- und Nachname</li>
              <li>Adresse</li>
              <li>Geburtsdatum</li>
              <li>Kontaktdaten (Telefon, E-Mail)</li>
              <li>Vertrags- und Zahlungsdaten</li>
              <li>Mitgliedsnummer</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>

            <h4 className="text-sm font-semibold mt-4 mb-2">4.2 Nutzung der Studio-App</h4>
            <p className="text-sm text-muted-foreground mb-2">Die Studio-App ist Bestandteil der Mitgliedschaft. Über die App werden verarbeitet:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Trainingspläne</li>
              <li>Trainingshistorie (z. B. Übungen, Gewichte, Wiederholungen)</li>
              <li>Trainingszeiten und -häufigkeit</li>
              <li>körperbezogene Leistungsdaten (z. B. Gewicht, Leistungswerte), sofern vom Mitglied eingegeben</li>
              <li>App-Nutzungsdaten</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Die Verarbeitung erfolgt:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>zur Vertragserfüllung gemäß Art. 6 Abs. 1 lit. b DSGVO</li>
              <li>bei freiwillig angegebenen körperbezogenen Daten zusätzlich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Die App stellt keine medizinische oder therapeutische Beratung dar.</p>

            <h4 className="text-sm font-semibold mt-4 mb-2">4.3 E-Mail-Kommunikation</h4>
            <p className="text-sm text-muted-foreground mb-2">Wir verarbeiten die E-Mail-Adresse des Mitglieds zur Kommunikation im Rahmen der Mitgliedschaft. Dies umfasst insbesondere:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>organisatorische Informationen,</li>
              <li>vertragsrelevante Mitteilungen,</li>
              <li>Informationen zur Studio-App,</li>
              <li>trainings- und mitgliedschaftsbezogene Hinweise.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>

            <h4 className="text-sm font-semibold mt-4 mb-2">4.4 Foto- und Videoaufnahmen zu Werbezwecken</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Im Rahmen des Studioalltags, von Trainings, Kursen oder Veranstaltungen können durch das Studio Foto- und Videoaufnahmen angefertigt werden, auf denen Mitglieder erkennbar sein können.
            </p>
            <p className="text-sm text-muted-foreground mb-2">Diese Aufnahmen können zu folgenden Zwecken verarbeitet und verwendet werden:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Öffentlichkeitsarbeit und Werbung des Studios</li>
              <li>Darstellung des Studios auf der Website</li>
              <li>Veröffentlichung in sozialen Medien</li>
              <li>Nutzung in Print- und Online-Marketingmaterialien</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Die Verarbeitung von Foto- und Videoaufnahmen erfolgt ausschließlich auf Grundlage einer freiwilligen Einwilligung des Mitglieds gemäß Art. 6 Abs. 1 lit. a DSGVO.
            </p>
            <p className="text-sm text-muted-foreground mt-2">Die Einwilligung kann:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>gesondert (z. B. schriftlich oder digital),</li>
              <li>jederzeit,</li>
              <li>mit Wirkung für die Zukunft</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">widerrufen werden. Ein Widerruf berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">5. Hosting & technische Dienstleister</h3>
            <p className="text-sm text-muted-foreground mb-2">Zur Bereitstellung der Studio-App und interner Prozesse setzen wir Auftragsverarbeiter gemäß Art. 28 DSGVO ein, insbesondere:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Lovable (App-Hosting),</li>
              <li>Supabase (Datenbank & Backend),</li>
              <li>Make.com (Automatisierungen).</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Die Datenverarbeitung erfolgt auf Servern innerhalb der EU oder auf Grundlage geeigneter Garantien gemäß Art. 44 ff. DSGVO.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">6. Speicherdauer</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Wir speichern personenbezogene Daten nur so lange, wie dies für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
            </p>
            <p className="text-sm text-muted-foreground">Trainings- und App-Daten werden in der Regel für die Dauer der Mitgliedschaft gespeichert.</p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">7. Weitergabe von Daten</h3>
            <p className="text-sm text-muted-foreground mb-2">Eine Weitergabe an Dritte erfolgt nur, wenn:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>dies zur Vertragserfüllung erforderlich ist,</li>
              <li>eine gesetzliche Verpflichtung besteht,</li>
              <li>eine Einwilligung vorliegt.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">8. Datensicherheit</h3>
            <p className="text-sm text-muted-foreground">
              Wir setzen geeignete technische und organisatorische Maßnahmen ein, um personenbezogene Daten vor Verlust, Missbrauch oder unbefugtem Zugriff zu schützen.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">9. Rechte der betroffenen Personen</h3>
            <p className="text-sm text-muted-foreground mb-2">Sie haben insbesondere folgende Rechte:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Auskunft (Art. 15 DSGVO)</li>
              <li>Berichtigung (Art. 16 DSGVO)</li>
              <li>Löschung (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch (Art. 21 DSGVO)</li>
              <li>Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Sofern die Verarbeitung personenbezogener Daten auf einer Einwilligung beruht (z. B. bei Foto- oder Videoaufnahmen), kann diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen werden.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">10. Beschwerderecht</h3>
            <p className="text-sm text-muted-foreground">
              Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">11. Änderungen</h3>
            <p className="text-sm text-muted-foreground">
              Wir behalten uns vor, diese Datenschutzerklärung bei rechtlichen oder organisatorischen Änderungen anzupassen. Die aktuelle Version stellen wir im Studio und online zur Verfügung.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
