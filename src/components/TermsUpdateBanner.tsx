import { useState } from "react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CurrentTermsDialog } from "@/components/CurrentTermsDialog"
import { useCurrentTerms, getDeferCount, incrementDeferCount } from "@/hooks/useCurrentTerms"

const SESSION_KEY = "terms_banner_dismissed"

/**
 * Schmaler Hinweis auf eine neue AGB-Fassung. Blockiert nichts.
 * Nach dem dritten "Später" erscheint der Banner nicht mehr — der Hinweis
 * bleibt dann nur im Profil erreichbar.
 */
export const TermsUpdateBanner = () => {
  const { terms, accept } = useCurrentTerms()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  )

  if (!terms || terms.accepted_by_me) return null
  if (dismissed || getDeferCount() >= 3) return null

  const later = () => {
    incrementDeferCount()
    sessionStorage.setItem(SESSION_KEY, "1")
    setDismissed(true)
  }

  return (
    <>
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
        <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Neue AGB</p>
          <p className="text-xs text-muted-foreground">
            Seit dem 9. September gelten neue AGB. Kurz durchlesen und bestätigen.
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
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o && !terms.accepted_by_me) later()
        }}
        terms={terms}
        onAccept={accept}
      />
    </>
  )
}
