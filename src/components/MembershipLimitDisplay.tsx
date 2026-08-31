import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { CardType, cardTypeLabelLong } from "@/lib/creditCards"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CreditCard, AlertCircle } from "lucide-react"

interface MembershipLimitDisplayProps {
  userId: string
  membershipType: string
}

export const MembershipLimitDisplay = ({ userId, membershipType }: MembershipLimitDisplayProps) => {
  const [weeklyCount, setWeeklyCount] = useState<number>(0)
  const [credits, setCredits] = useState<number>(0)
  const [cardType, setCardType] = useState<CardType>('year')
  const [validityStart, setValidityStart] = useState<string | null>(null)
  const [validUntil, setValidUntil] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLimits = async () => {
      if (membershipType === 'Basic Member') {
        // Fetch weekly registration count
        const { data, error } = await supabase
          .rpc('get_weekly_registrations_count', { user_id_param: userId })
        
        if (!error && data !== null) {
          setWeeklyCount(data)
        }
      } else if (membershipType === '10er Karte') {
        // Fetch remaining credits incl. card type and validity window
        const { data, error } = await supabase
          .from('membership_credits')
          .select('credits_remaining, card_type, validity_start, valid_until')
          .eq('user_id', userId)
          .single()

        if (!error && data) {
          setCredits(data.credits_remaining)
          setCardType((data.card_type as CardType) || 'year')
          setValidityStart(data.validity_start)
          setValidUntil(data.valid_until)
        }
      }
      setLoading(false)
    }

    fetchLimits()
  }, [userId, membershipType])

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Lade Anmeldeinformationen...</div>
        </CardContent>
      </Card>
    )
  }

  if (membershipType === 'Basic Member') {
    const remaining = Math.max(0, 2 - weeklyCount)
    
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">Wöchentliche Anmeldungen</span>
                <Badge variant={remaining > 0 ? "default" : "destructive"}>
                  {weeklyCount}/2
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {remaining > 0 
                  ? `Du kannst dich noch ${remaining}x diese Woche anmelden`
                  : "Du hast dein wöchentliches Limit erreicht"
                }
              </p>
            </div>
          </div>
          {remaining === 0 && (
            <div className="mt-3 p-2 bg-destructive/10 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">
                Limit erreicht - neue Anmeldungen ab Montag möglich
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (membershipType === '10er Karte') {
    const isExpired = !!validUntil && new Date(validUntil) < new Date()
    const displayCredits = isExpired ? 0 : credits
    const cardLabel = cardTypeLabelLong(cardType)
    const remainingDays = validUntil
      ? Math.max(0, Math.ceil((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null

    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">Verfügbare Credits</span>
                <Badge variant={displayCredits > 0 ? "default" : "destructive"}>
                  {displayCredits} Credits
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isExpired
                  ? `Deine 10er Karte ist am ${new Date(validUntil!).toLocaleDateString('de-DE')} abgelaufen`
                  : displayCredits > 0
                    ? `Du kannst dich noch ${displayCredits}x für Kurse anmelden`
                    : "Keine Credits verfügbar - bitte wende dich an das Team"
                }
              </p>
              {!isExpired && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {validUntil
                    ? `Gültig bis ${new Date(validUntil).toLocaleDateString('de-DE')}${remainingDays !== null ? ` (noch ${remainingDays} Tage)` : ''}`
                    : `Gültigkeit (${cardLabel}) startet mit deiner ersten Buchung`}
                </p>
              )}
            </div>
          </div>
          {(displayCredits === 0 || isExpired) && (
            <div className="mt-3 p-2 bg-destructive/10 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">
                {isExpired
                  ? "10er Karte abgelaufen - neue Karte am Empfang erhältlich"
                  : "Keine Credits - Aufladen am Empfang möglich"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return null
}