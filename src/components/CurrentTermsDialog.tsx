import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import type { CurrentTerms } from "@/hooks/useCurrentTerms"

interface CurrentTermsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  terms: CurrentTerms | null
  onAccept: () => Promise<boolean>
  /** Nur ansehen, ohne Zustimmen-Bereich (z. B. nach der Zustimmung) */
  readOnly?: boolean
}

const markdownComponents = {
  h1: ({ children }: any) => <h3 className="text-base font-bold text-foreground mt-4 mb-2">{children}</h3>,
  h2: ({ children }: any) => <h4 className="text-sm font-bold text-foreground mt-4 mb-1">{children}</h4>,
  h3: ({ children }: any) => <h5 className="text-sm font-semibold text-foreground mt-3 mb-1">{children}</h5>,
  p: ({ children }: any) => <p className="mb-2 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {children}
    </a>
  ),
}

export const CurrentTermsDialog = ({
  open,
  onOpenChange,
  terms,
  onAccept,
  readOnly = false,
}: CurrentTermsDialogProps) => {
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)

  // Checkbox ist bei jedem Oeffnen bewusst NICHT vorausgewaehlt
  useEffect(() => {
    if (open) setChecked(false)
  }, [open])

  if (!terms) return null

  const showAcceptSection = !readOnly && !terms.accepted_by_me

  const handleAccept = async () => {
    setSaving(true)
    const ok = await onAccept()
    setSaving(false)
    if (ok) {
      toast.success("Danke, deine Zustimmung ist gespeichert.")
      onOpenChange(false)
    } else {
      toast.error("Das hat nicht funktioniert. Bitte versuch es später erneut.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[85vh] max-h-[85vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Allgemeine Geschäftsbedingungen</DialogTitle>
          <DialogDescription>{terms.title || `Fassung ${terms.version}`}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {terms.body_md || ""}
            </ReactMarkdown>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Unsere{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Datenschutzerklärung
          </a>{" "}
          informiert dich über den Umgang mit deinen Daten.
        </p>

        {showAcceptSection ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="accept-current-terms"
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="accept-current-terms" className="text-sm leading-tight cursor-pointer">
                Ich habe die AGB gelesen und stimme ihnen zu.
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAccept} disabled={!checked || saving} className="flex-1">
                {saving ? "Wird gespeichert..." : "Zustimmen"}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Später
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
