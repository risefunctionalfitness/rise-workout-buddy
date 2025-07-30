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
      {/* Ausfahrendes Textfeld - nach links */}
      <div 
        className={`absolute top-0 right-14 bg-white border-2 border-[#B81243] rounded-l-lg shadow-lg h-14 flex items-center justify-center transition-all duration-500 overflow-hidden ${
          isVisible ? 'w-48 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div className="px-4 text-center whitespace-nowrap">
          <p className="text-xs text-[#B81243] font-medium">Tür-Code</p>
          <p className="text-lg font-mono font-bold text-black">{gymCode || "----"}</p>
        </div>
      </div>

      {/* Hauptbutton - rot mit dunklerem Hover */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleShowCode}
        className="rounded-full w-14 h-14 border-2 border-[#B81243] bg-[#B81243] hover:bg-[#901a36] text-white shadow-lg relative z-10"
        aria-label="Zugangscode anzeigen"
      >
        <Key className="h-4 w-4" />
      </Button>

      {/* Fortschrittsbalken im Button */}
      {isVisible && (
        <div className="absolute bottom-2 left-2 right-2 h-1 bg-border/50 rounded-full overflow-hidden z-20">
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