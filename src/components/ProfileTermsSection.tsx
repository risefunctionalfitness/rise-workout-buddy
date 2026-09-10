import { useState } from "react"
import { FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CurrentTermsDialog } from "@/components/CurrentTermsDialog"
import { useCurrentTerms } from "@/hooks/useCurrentTerms"
import { format } from "date-fns"

/** Eintrag "AGB" im Profil: Fassung ansehen und eigenen Stand sehen. */
export const ProfileTermsSection = () => {
  const { terms, acceptedAt, accept } = useCurrentTerms()
  const [open, setOpen] = useState(false)

  if (!terms) return null

  return (
    <>
      <Card className="border-primary/20 mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            AGB
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {terms.title || `Fassung ${terms.version}`}
          </p>
          {terms.accepted_by_me ? (
            <p className="text-sm text-foreground">
              Zugestimmt
              {acceptedAt ? ` am ${format(new Date(acceptedAt), "dd.MM.yyyy")}` : ""} · Fassung{" "}
              {terms.version}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Noch nicht zugestimmt</p>
          )}
          <Button
            variant={terms.accepted_by_me ? "outline" : "default"}
            onClick={() => setOpen(true)}
            className="w-full"
          >
            {terms.accepted_by_me ? "AGB ansehen" : "AGB lesen und zustimmen"}
          </Button>
        </CardContent>
      </Card>

      <CurrentTermsDialog open={open} onOpenChange={setOpen} terms={terms} onAccept={accept} />
    </>
  )
}
