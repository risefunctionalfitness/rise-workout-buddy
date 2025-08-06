import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"

interface CreditsCounterProps {
  user: User
}

export const CreditsCounter = ({ user }: CreditsCounterProps) => {
  const [credits, setCredits] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCredits()

    // Listen for credit updates
    const handleCreditUpdate = () => {
      loadCredits()
    }

    window.addEventListener('creditsUpdated', handleCreditUpdate)
    
    return () => {
      window.removeEventListener('creditsUpdated', handleCreditUpdate)
    }
  }, [user.id])

  const loadCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_credits')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading credits:', error)
        return
      }

      setCredits(data?.credits_remaining || 0)
    } catch (error) {
      console.error('Error loading credits:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="w-14 h-14 rounded-full bg-[#B81243] shadow-lg flex items-center justify-center animate-pulse">
        <div className="w-6 h-6 bg-white/20 rounded"></div>
      </div>
    )
  }

  return (
    <div className="w-14 h-14 rounded-full bg-[#B81243] shadow-lg flex items-center justify-center">
      <span className="text-white text-lg font-bold">{credits}</span>
    </div>
  )
}