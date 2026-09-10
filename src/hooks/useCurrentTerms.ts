import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

export interface CurrentTerms {
  version: string
  title: string | null
  body_md: string | null
  summary_md: string | null
  accepted_by_me: boolean
}

/**
 * „Später" blendet den Hinweis nur für den laufenden Kalendertag aus.
 * Gespeichert wird das Datum, nicht ein Zähler — der Hinweis kommt am nächsten
 * Tag von selbst wieder und verschwindet dauerhaft erst mit der Zustimmung.
 */
const SNOOZE_KEY = "terms_snoozed_until"

const today = () => new Date().toISOString().slice(0, 10)

export const isSnoozedToday = () => {
  try {
    return localStorage.getItem(SNOOZE_KEY) === today()
  } catch {
    return false
  }
}

export const snoozeForToday = () => {
  try {
    localStorage.setItem(SNOOZE_KEY, today())
  } catch {
    /* privater Modus o. Ä. — dann bleibt der Hinweis eben stehen */
  }
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
        // Ausdrücklich nach der eigenen user_id filtern. Admins dürfen alle
        // Zustimmungen lesen und bekämen sonst eine fremde angezeigt.
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData.user?.id
        if (userId) {
          const { data: acc } = await supabase
            .from("terms_acceptances")
            .select("accepted_at")
            .eq("version", current.version)
            .eq("user_id", userId)
            .maybeSingle()
          setAcceptedAt(acc?.accepted_at ?? null)
        } else {
          setAcceptedAt(null)
        }
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

/**
 * Schreibt eine Zustimmung für die aktuell veröffentlichte Fassung.
 *
 * Nur dort aufrufen, wo dem Nutzer auch der Text aus `current_terms` gezeigt
 * wurde. Sonst entsteht ein Nachweis, der etwas anderes behauptet als das,
 * was auf dem Bildschirm stand.
 */
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
