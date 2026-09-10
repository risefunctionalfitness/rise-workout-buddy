import { useState } from "react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CurrentTermsDialog } from "@/components/CurrentTermsDialog"
import { useCurrentTerms, isSnoozedToday, snoozeForToday } from "@/hooks/useCurrentTerms"

/**
 * Hinweis auf eine neue AGB-Fassung, oben im Kursplan.
 *
 * Der Hinweis bleibt dauerhaft stehen, bis zugestimmt wurde. „Später" blendet
 * ihn nur für den laufenden Tag aus; am nächsten Tag ist er wieder da.
 * Er blockiert nichts — Kurse lassen sich jederzeit buchen.
 */
export const TermsUpdateBanner = () => {
  const { terms, accept, reload } = useCurrentTerms()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snoozed, setSnoozed] = useState(() => isSnoozedToday())

  if (!terms || terms.accepted_by_me) return null
  if (snoozed) return null

  const later = () => {
    snoozeForToday()
    setSnoozed(true)
  }

  return (
    <>
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
        <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Neue AGB</p>
          <p className="text-xs text-muted-foreground">
            Seit dem 9. September gelten neue AGB. Bitte kurz durchlesen und bestätigen.
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              Ansehen
            </Button>
            <Button size="sm" variant="ghost" onClick={later}>
              Später
            </Button>
          </div>
        </div>
      </div>

      <CurrentTermsDialog
        open={dialogOpen}
        // Das blosse Schliessen des Dialogs zaehlt NICHT als "Später" — sonst
        // verliert den Hinweis, wer nur in Ruhe lesen wollte.
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) reload()
        }}
        terms={terms}
        onAccept={accept}
      />
    </>
  )
}
