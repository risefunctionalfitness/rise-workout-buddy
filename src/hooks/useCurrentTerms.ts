import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

export interface CurrentTerms {
  version: string
  title: string | null
  body_md: string | null
  summary_md: string | null
  accepted_by_me: boolean
}

const DEFER_KEY = "terms_defer_count"

export const getDeferCount = () => {
  const raw = localStorage.getItem(DEFER_KEY)
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

export const incrementDeferCount = () => {
  const next = getDeferCount() + 1
  localStorage.setItem(DEFER_KEY, String(next))
  return next
}

/**
 * Laedt die aktuell veroeffentlichte AGB-Fassung (View `current_terms`).
 * Ist nichts veroeffentlicht, bleibt `terms` null und es wird nichts angezeigt.
 */
export const useCurrentTerms = () => {
  const [terms, setTerms] = useState<CurrentTerms | null>(null)
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("current_terms")
        .select("version, title, body_md, summary_md, accepted_by_me")
        .maybeSingle()

      if (error) throw error

      if (!data || !data.version) {
        setTerms(null)
        setAcceptedAt(null)
        return
      }

      const current: CurrentTerms = {
        version: data.version,
        title: data.title,
        body_md: data.body_md,
        summary_md: data.summary_md,
        accepted_by_me: data.accepted_by_me === true,
      }
      setTerms(current)

      if (current.accepted_by_me) {
        const { data: acc } = await supabase
          .from("terms_acceptances")
          .select("accepted_at")
          .eq("version", current.version)
          .order("accepted_at", { ascending: true })
          .limit(1)
          .maybeSingle()
        setAcceptedAt(acc?.accepted_at ?? null)
      } else {
        setAcceptedAt(null)
      }
    } catch (err) {
      console.error("Error loading current terms:", err)
      setTerms(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const accept = useCallback(async () => {
    if (!terms) return false
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return false

    const { error } = await supabase.from("terms_acceptances").insert({
      user_id: userId,
      version: terms.version,
      source: "app",
    })

    // 23505 = unique violation -> war bereits zugestimmt, kein Fehler
    if (error && error.code !== "23505") {
      console.error("Error accepting terms:", error)
      return false
    }

    await load()
    return true
  }, [terms, load])

  return { terms, acceptedAt, loading, accept, reload: load }
}

/** Schreibt eine Zustimmung fuer die aktuell veroeffentlichte Fassung (Registrierung). */
export const recordTermsAcceptance = async (userId: string) => {
  try {
    const { data } = await supabase
      .from("current_terms")
      .select("version")
      .maybeSingle()

    if (!data?.version) return

    const { error } = await supabase.from("terms_acceptances").insert({
      user_id: userId,
      version: data.version,
      source: "app",
    })

    if (error && error.code !== "23505") {
      console.error("Error recording terms acceptance:", error)
    }
  } catch (err) {
    console.error("Error recording terms acceptance:", err)
  }
}
