import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { useCurrentTerms } from "@/hooks/useCurrentTerms"

/**
 * Zeigt die aktuell veroeffentlichte AGB-Fassung aus der Datenbank.
 * Frueher stand der Text hier fest im Code — dann zeigten Dialog und Seite
 * unterschiedliche Fassungen, sobald eine neue veroeffentlicht wurde.
 */
const markdownComponents = {
  h1: ({ children }: any) => <h2 className="text-xl font-bold text-foreground mt-6 mb-3">{children}</h2>,
  h2: ({ children }: any) => <h3 className="text-base font-semibold text-foreground mt-6 mb-2">{children}</h3>,
  h3: ({ children }: any) => <h4 className="text-sm font-semibold text-foreground mt-4 mb-1">{children}</h4>,
  p: ({ children }: any) => <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="text-sm text-muted-foreground list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="text-sm text-muted-foreground list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {children}
    </a>
  ),
}

const TermsOfService = () => {
  const navigate = useNavigate()
  const { terms, loading } = useCurrentTerms()

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
        {loading ? (
          <p className="text-sm text-muted-foreground">Wird geladen...</p>
        ) : terms?.body_md ? (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {terms.body_md}
            </ReactMarkdown>
            <p className="text-xs text-muted-foreground mt-8 pt-4 border-t">
              Fassung {terms.version}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Die AGB sind derzeit nicht abrufbar. Bitte wende dich an{" "}
            <a href="mailto:florian@rise-ff.de" className="text-primary hover:underline">
              florian@rise-ff.de
            </a>
            .
          </p>
        )}
      </div>
    </div>
  )
}

export default TermsOfService
