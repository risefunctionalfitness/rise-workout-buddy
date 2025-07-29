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
    <div className="relative flex items-center">
      {/* Linker Kreis-Teil */}
      <div 
        className={`transition-all duration-500 ease-in-out ${
          isVisible ? 'transform -translate-x-24' : 'transform translate-x-0'
        }`}
      >
        <div className={`w-7 h-14 bg-background border-2 border-foreground/20 shadow-lg transition-all duration-500 ${
          isVisible ? 'rounded-l-full border-r-0' : 'rounded-full'
        }`}>
          <div className="w-full h-full flex items-center justify-center">
            <Key className="h-4 w-4 ml-1" />
          </div>
        </div>
      </div>

      {/* Mittleres Textfeld */}
      <div 
        className={`absolute left-7 bg-background border-2 border-l-0 border-r-0 border-foreground/20 shadow-lg h-14 flex items-center justify-center transition-all duration-500 overflow-hidden ${
          isVisible ? 'w-48 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div className="px-4 text-center whitespace-nowrap">
          <p className="text-xs text-muted-foreground">Code:</p>
          <p className="text-lg font-mono font-bold text-primary">{gymCode || "----"}</p>
        </div>
      </div>

      {/* Rechter Kreis-Teil */}
      <div 
        className={`transition-all duration-500 ease-in-out ${
          isVisible ? 'transform translate-x-48' : 'transform translate-x-0 -ml-7'
        }`}
      >
        <div className={`w-7 h-14 bg-background border-2 border-foreground/20 shadow-lg transition-all duration-500 ${
          isVisible ? 'rounded-r-full border-l-0' : 'rounded-full opacity-0'
        }`}>
          {/* Leer - nur für die rechte Rundung */}
        </div>
      </div>

      {/* Unsichtbarer Klick-Button über dem gesamten Bereich */}
      <button
        onClick={handleShowCode}
        className="absolute inset-0 w-14 h-14 rounded-full hover:bg-primary/10 transition-colors"
        aria-label="Zugangscode anzeigen"
      />

      {/* Fortschrittsbalken */}
      {isVisible && (
        <div className="absolute bottom-1 left-1 right-1 h-1 bg-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary w-full transition-all duration-5000 ease-linear"
            style={{
              animation: 'shrinkProgress 5s linear forwards'
            }}
          />
        </div>
      )}

      {/* CSS für die Animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shrinkProgress {
            from { width: 100%; }
            to { width: 0%; }
          }
        `
      }} />
    </div>
  )
}