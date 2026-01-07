import { useState, useRef } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface TermsAcceptanceDialogProps {
  open: boolean
  onAccept: () => void
}

export const TermsAcceptanceDialog = ({ open, onAccept }: TermsAcceptanceDialogProps) => {
  const [accepted, setAccepted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToEnd = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              Nutzungsbedingungen akzeptieren
            </DialogPrimitive.Title>
          </div>

          <p className="text-sm text-muted-foreground">
            Bitte lies und akzeptiere die AGB und Datenschutzerklärung um fortzufahren.
          </p>

          <div className="relative">
            <div 
              ref={scrollRef}
              className="h-[35vh] overflow-y-auto border rounded-lg p-3 text-xs text-muted-foreground space-y-4"
            >
              {/* AGB */}
              <div>
                <h2 className="text-sm font-bold text-foreground mb-2">Allgemeine Geschäftsbedingungen (AGB)</h2>
                <p className="font-semibold text-primary mb-3">RISE Functional Fitness</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">1. Geltungsbereich</h3>
                <p className="mb-2">Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für sämtliche Vertragsverhältnisse zwischen RISE Functional Fitness, Inhaber: Florian Göttinger, Birkenweg 9, 87459 Pfronten (nachfolgend „Studio") und seinen Mitgliedern (nachfolgend „Mitglied").</p>
                <p className="mb-1">Die AGB gelten insbesondere für:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>die Nutzung des Fitnessstudios,</li>
                  <li>die Teilnahme an Trainings, Kursen und Veranstaltungen,</li>
                  <li>die Nutzung der vom Studio bereitgestellten Studio-App und digitalen Angebote.</li>
                </ul>
                <p>Abweichende Bedingungen des Mitglieds finden keine Anwendung.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">2. Vertragsgegenstand</h3>
                <p className="mb-2">Das Studio bietet funktionelles Fitnesstraining, betreutes und unbetreutes Training, Kurse sowie digitale Leistungen über eine Studio-App an.</p>
                <p className="mb-1">Der konkrete Leistungsumfang ergibt sich aus:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>dem gewählten Mitgliedschaftsmodell,</li>
                  <li>der jeweils gültigen Leistungsbeschreibung,</li>
                  <li>dem aktuellen Kurs- und Trainingsangebot.</li>
                </ul>
                <p>Ein Anspruch auf bestimmte Trainer, Trainingszeiten, Kurse oder Inhalte besteht nicht.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">3. Studio-App & digitale Leistungen</h3>
                <p className="mb-2">Die Nutzung der vom Studio bereitgestellten Studio-App ist Bestandteil der Mitgliedschaft.</p>
                <p className="mb-1">Über die Studio-App können insbesondere folgende Funktionen bereitgestellt werden:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>Trainingspläne und Trainingsdokumentation</li>
                  <li>Trainingshistorie (z. B. Übungen, Gewichte, Wiederholungen)</li>
                  <li>Trainingszeiten und Trainingshäufigkeit</li>
                  <li>Leistungs- und Trainingsdaten</li>
                  <li>studiointerne Informationen und Mitteilungen</li>
                </ul>
                <p className="mb-2">Die App dient der Trainingsunterstützung und Motivation und ersetzt keine medizinische oder therapeutische Beratung.</p>
                <p>Das Studio übernimmt keine Gewähr für eine jederzeitige, unterbrechungsfreie oder fehlerfreie technische Verfügbarkeit der App.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">4. Kommunikation per E-Mail</h3>
                <p className="mb-2">Das Mitglied erklärt sich damit einverstanden, dass das Studio im Rahmen der Mitgliedschaft E-Mails an die vom Mitglied angegebene E-Mail-Adresse versendet.</p>
                <p className="mb-1">Dies umfasst insbesondere:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>organisatorische und betriebliche Informationen,</li>
                  <li>vertragsrelevante Mitteilungen,</li>
                  <li>Informationen zur Nutzung der Studio-App,</li>
                  <li>trainings- und mitgliedschaftsbezogene Hinweise.</li>
                </ul>
                <p>Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Ein Widerruf ist jederzeit mit Wirkung für die Zukunft möglich. Gesetzlich oder vertraglich notwendige Mitteilungen bleiben hiervon unberührt.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">5. Mitwirkungspflichten des Mitglieds</h3>
                <p className="mb-1">Das Mitglied verpflichtet sich:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>korrekte und vollständige Angaben zu seinen persönlichen Daten zu machen,</li>
                  <li>Änderungen (z. B. Kontaktdaten, gesundheitliche Einschränkungen) unverzüglich mitzuteilen,</li>
                  <li>die Studio-App sachgemäß zu nutzen,</li>
                  <li>den Anweisungen des Trainer- und Studiopersonals Folge zu leisten.</li>
                </ul>
                <p>Das Training erfolgt grundsätzlich eigenverantwortlich.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">6. Gesundheit & Eigenverantwortung</h3>
                <p className="mb-2">Die Teilnahme am Training erfolgt auf eigene Gefahr.</p>
                <p className="mb-1">Das Studio empfiehlt vor Trainingsbeginn eine ärztliche Abklärung, insbesondere bei:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>bekannten Vorerkrankungen,</li>
                  <li>Schwangerschaft,</li>
                  <li>längerer sportlicher Inaktivität.</li>
                </ul>
                <p>Das Mitglied bestätigt, gesundheitlich in der Lage zu sein, am Training teilzunehmen.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">7. Haftung</h3>
                <p className="mb-2">Das Studio haftet ausschließlich bei Vorsatz oder grober Fahrlässigkeit.</p>
                <p className="mb-1">Eine Haftung ist insbesondere ausgeschlossen für:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>Verletzungen bei eigenverantwortlichem Training,</li>
                  <li>gesundheitliche Schäden aufgrund falscher Eigeneinschätzung,</li>
                  <li>ausbleibende Trainings- oder Leistungserfolge,</li>
                  <li>technische Störungen der Studio-App oder externer Systeme,</li>
                  <li>Verlust oder Beschädigung persönlicher Gegenstände.</li>
                </ul>
                <p>Die Haftung ist – soweit gesetzlich zulässig – auf den gezahlten Mitgliedsbeitrag begrenzt.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">8. Zahlungsbedingungen</h3>
                <p className="mb-2">Die Höhe der Mitgliedsbeiträge ergibt sich aus dem gewählten Tarif.</p>
                <p className="mb-2">Die Beiträge sind gemäß Vereinbarung monatlich oder für die vereinbarte Laufzeit im Voraus zu zahlen.</p>
                <p className="mb-1">Bei Zahlungsverzug ist das Studio berechtigt:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>den Zugang zum Studio und zur Studio-App zu sperren,</li>
                  <li>Mahngebühren zu erheben,</li>
                  <li>den Vertrag außerordentlich zu kündigen.</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-3 mb-1">9. Vertragslaufzeit & Kündigung</h3>
                <p className="mb-2">Die Vertragslaufzeit ergibt sich aus dem gewählten Mitgliedschaftsmodell.</p>
                <p>Ordentliche Kündigungen sind unter Einhaltung der vereinbarten Fristen möglich. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">10. Datenschutz</h3>
                <p className="mb-2">Das Studio verarbeitet personenbezogene Daten im Einklang mit der Datenschutz-Grundverordnung (DSGVO).</p>
                <p className="mb-1">Die Verarbeitung umfasst insbesondere:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>Mitgliedschafts- und Vertragsdaten,</li>
                  <li>Trainings- und Leistungsdaten,</li>
                  <li>Nutzungsdaten der Studio-App,</li>
                  <li>Kommunikationsdaten (z. B. E-Mail).</li>
                </ul>
                <p>Weitere Informationen ergeben sich aus der jeweils gültigen Datenschutzerklärung des Studios.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">11. Hausordnung</h3>
                <p className="mb-2">Die jeweils aktuelle Hausordnung ist Bestandteil dieser AGB.</p>
                <p>Den Anweisungen des Trainer- und Studiopersonals ist Folge zu leisten. Bei schwerwiegenden oder wiederholten Verstößen kann das Studio Hausverbot erteilen oder den Vertrag außerordentlich kündigen.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">12. Änderungen des Angebots</h3>
                <p className="mb-2">Das Studio behält sich vor, sein Angebot weiterzuentwickeln oder anzupassen (z. B. Kurspläne, Trainer, App-Funktionen), sofern der wesentliche Vertragszweck erhalten bleibt.</p>
                <p>Hieraus ergeben sich keine Minderungs- oder Schadensersatzansprüche.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">13. Schlussbestimmungen</h3>
                <p className="mb-2">Es gilt deutsches Recht. Gerichtsstand ist – soweit gesetzlich zulässig – der Sitz des Studios.</p>
                <p>Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Regelungen unberührt (Salvatorische Klausel).</p>
              </div>

              <div className="border-t pt-4">
                <h2 className="text-sm font-bold text-foreground mb-2">Datenschutzerklärung</h2>
                <p className="font-semibold text-primary mb-3">RISE Functional Fitness</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">1. Allgemeine Hinweise</h3>
                <p className="mb-2">Der Schutz Ihrer personenbezogenen Daten ist uns ein wichtiges Anliegen. Wir verarbeiten Ihre Daten ausschließlich im Einklang mit den geltenden datenschutzrechtlichen Vorschriften, insbesondere der Datenschutz-Grundverordnung (DSGVO).</p>
                <p>Mit dieser Datenschutzerklärung informieren wir Sie darüber, welche personenbezogenen Daten wir im Rahmen Ihrer Mitgliedschaft, Ihres Besuchs im Studio sowie bei der Nutzung der Studio-App verarbeiten und welche Rechte Ihnen zustehen.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">2. Verantwortlicher</h3>
                <p className="mb-2">Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:</p>
                <div className="bg-muted/30 p-2 rounded mb-2">
                  <p className="font-medium text-foreground">RISE Functional Fitness</p>
                  <p>Einzelunternehmen, Inhaber: Florian Göttinger</p>
                  <p>Birkenweg 9, 87459 Pfronten</p>
                  <p>E-Mail: florian@rise-ff.de | Telefon: 015730440756</p>
                </div>

                <h3 className="font-semibold text-foreground mt-3 mb-1">3. Begriffsbestimmungen</h3>
                <p>Es gelten die Begriffsbestimmungen der DSGVO, insbesondere zu „personenbezogenen Daten", „Verarbeitung", „Verantwortlicher" und „Auftragsverarbeiter".</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">4. Erhebung und Verarbeitung personenbezogener Daten</h3>
                
                <p className="font-medium mt-2 mb-1">4.1 Mitgliedschaft & Vertragsabwicklung</p>
                <p className="mb-1">Im Rahmen der Mitgliedschaft verarbeiten wir insbesondere:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>Vor- und Nachname, Adresse, Geburtsdatum</li>
                  <li>Kontaktdaten (Telefon, E-Mail)</li>
                  <li>Vertrags- und Zahlungsdaten, Mitgliedsnummer</li>
                </ul>
                <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>

                <p className="font-medium mt-2 mb-1">4.2 Nutzung der Studio-App</p>
                <p className="mb-1">Die Studio-App ist Bestandteil der Mitgliedschaft. Über die App werden verarbeitet:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>Trainingspläne, Trainingshistorie (z. B. Übungen, Gewichte, Wiederholungen)</li>
                  <li>Trainingszeiten und -häufigkeit</li>
                  <li>körperbezogene Leistungsdaten (z. B. Gewicht, Leistungswerte), sofern vom Mitglied eingegeben</li>
                  <li>App-Nutzungsdaten</li>
                </ul>
                <p>Die App stellt keine medizinische oder therapeutische Beratung dar.</p>

                <p className="font-medium mt-2 mb-1">4.3 E-Mail-Kommunikation</p>
                <p className="mb-1">Wir verarbeiten die E-Mail-Adresse des Mitglieds zur Kommunikation im Rahmen der Mitgliedschaft. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>

                <p className="font-medium mt-2 mb-1">4.4 Foto- und Videoaufnahmen zu Werbezwecken</p>
                <p className="mb-2">Im Rahmen des Studioalltags, von Trainings, Kursen oder Veranstaltungen können durch das Studio Foto- und Videoaufnahmen angefertigt werden, auf denen Mitglieder erkennbar sein können. Die Verarbeitung erfolgt ausschließlich auf Grundlage einer freiwilligen Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">5. Hosting & technische Dienstleister</h3>
                <p className="mb-1">Zur Bereitstellung der Studio-App und interner Prozesse setzen wir Auftragsverarbeiter gemäß Art. 28 DSGVO ein, insbesondere:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>Lovable (App-Hosting)</li>
                  <li>Supabase (Datenbank & Backend)</li>
                  <li>Make.com (Automatisierungen)</li>
                </ul>
                <p>Die Datenverarbeitung erfolgt auf Servern innerhalb der EU oder auf Grundlage geeigneter Garantien gemäß Art. 44 ff. DSGVO.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">6. Speicherdauer</h3>
                <p>Wir speichern personenbezogene Daten nur so lange, wie dies für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen. Trainings- und App-Daten werden in der Regel für die Dauer der Mitgliedschaft gespeichert.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">7. Weitergabe von Daten</h3>
                <p className="mb-1">Eine Weitergabe an Dritte erfolgt nur, wenn:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>dies zur Vertragserfüllung erforderlich ist,</li>
                  <li>eine gesetzliche Verpflichtung besteht,</li>
                  <li>eine Einwilligung vorliegt.</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-3 mb-1">8. Datensicherheit</h3>
                <p>Wir setzen geeignete technische und organisatorische Maßnahmen ein, um personenbezogene Daten vor Verlust, Missbrauch oder unbefugtem Zugriff zu schützen.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">9. Rechte der betroffenen Personen</h3>
                <p className="mb-1">Sie haben insbesondere folgende Rechte:</p>
                <ul className="list-disc pl-4 mb-2 space-y-0.5">
                  <li>Auskunft (Art. 15 DSGVO)</li>
                  <li>Berichtigung (Art. 16 DSGVO)</li>
                  <li>Löschung (Art. 17 DSGVO)</li>
                  <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                  <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  <li>Widerspruch (Art. 21 DSGVO)</li>
                  <li>Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-3 mb-1">10. Beschwerderecht</h3>
                <p>Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren.</p>

                <h3 className="font-semibold text-foreground mt-3 mb-1">11. Änderungen</h3>
                <p>Wir behalten uns vor, diese Datenschutzerklärung bei rechtlichen oder organisatorischen Änderungen anzupassen. Die aktuelle Version stellen wir im Studio und online zur Verfügung.</p>
              </div>
            </div>

            <button
              onClick={scrollToEnd}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 bg-background/90 px-3 py-1 rounded-full border shadow-sm"
            >
              <ChevronDown className="h-3 w-3" />
              Zum Ende springen
            </button>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <Checkbox 
              id="accept-terms" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label 
              htmlFor="accept-terms" 
              className="text-sm cursor-pointer leading-tight"
            >
              Ich akzeptiere die <span className="font-medium">AGB</span> und die <span className="font-medium">Datenschutzerklärung</span>
            </label>
          </div>

          <Button 
            onClick={onAccept} 
            disabled={!accepted}
            className="w-full"
          >
            Weiter
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
