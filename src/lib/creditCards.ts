/**
 * Kartentypen der 10er Karte.
 *
 * 'prevention' = Präventionskurs 10er Karte, 8 Wochen ab dem ersten Training.
 * 'ten_weeks'  = alter Name derselben Karte (10 Wochen). Wird weiterhin
 *                erkannt, damit bestehende Karten normal weiterlaufen.
 * 'year'       = 1 Jahr ab dem ersten Training.
 */
export type CardType = 'year' | 'prevention' | 'ten_weeks'

export const PREVENTION_CARD_NAME = 'Präventionskurs 10er Karte'
export const PREVENTION_CARD_WEEKS = 8

export const isPreventionCard = (cardType?: string | null): boolean =>
  cardType === 'prevention' || cardType === 'ten_weeks'

/** Kurzform für Badges und Listen */
export const cardTypeLabel = (cardType?: string | null): string =>
  isPreventionCard(cardType) ? 'Präventionskurs' : '1 Jahr'

/** Ausführlich, mit Laufzeit */
export const cardTypeLabelLong = (cardType?: string | null): string => {
  if (!isPreventionCard(cardType)) return '1 Jahr'
  // Bestehende Karten aus der Zeit vor der Umstellung laufen noch 10 Wochen
  return cardType === 'ten_weeks'
    ? 'Präventionskurs (10 Wochen)'
    : `Präventionskurs (${PREVENTION_CARD_WEEKS} Wochen)`
}
