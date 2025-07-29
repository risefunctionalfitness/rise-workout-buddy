import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Key } from "lucide-react"
import { Button } from "@/components/ui/button"

export const GymCodeDisplay = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [gymCode, setGymCode] = useState<string>("")

  useEffect(() => {
    loadActiveGymCode()
  }, [])

  const loadActiveGymCode = async () => {
    try {
      const { data, error } = await supabase
        .from('gym_access_codes')
        .select('code')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error('Error loading gym code:', error)
        return
      }

      setGymCode(data?.code || "")
    } catch (error) {
      console.error('Error loading gym code:', error)
    }
  }

  const handleShowCode = () => {
    if (!gymCode) {
      loadActiveGymCode()
    }
    
    setIsVisible(true)
    
    // Automatisch nach 5 Sekunden verstecken
    setTimeout(() => {
      setIsVisible(false)
    }, 5000)
  }

  return (
    <div className="relative">
      {/* Schlüssel Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleShowCode}
        className="rounded-full"
        aria-label="Zugangscode anzeigen"
      >
        <Key className="h-4 w-4" />
      </Button>

      {/* Slide-out Code Display */}
      <div 
        className={`absolute top-0 right-12 bg-background border rounded-lg p-4 shadow-lg z-50 min-w-[200px] transition-transform duration-300 ${
          isVisible ? 'translate-x-0' : 'translate-x-full opacity-0'
        }`}
      >
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Gym Zugangscode:</p>
          <p className="text-2xl font-mono font-bold text-primary">{gymCode || "----"}</p>
          <div className="w-full bg-border h-1 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full bg-primary transition-all duration-5000 ease-linear ${
                isVisible ? 'w-0' : 'w-full'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}