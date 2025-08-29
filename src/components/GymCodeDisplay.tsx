import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Key } from "lucide-react"
import { Button } from "@/components/ui/button"

export const GymCodeDisplay = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [gymCode, setGymCode] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    loadActiveGymCode()
  }, [])

  const loadActiveGymCode = async (retryCount = 0) => {
    try {
      setIsLoading(true)
      setHasError(false)
      
      console.log('Loading gym code, attempt:', retryCount + 1)
      
      const { data, error } = await supabase
        .from('gym_access_codes')
        .select('code')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error loading gym code:', error)
        setHasError(true)
        
        // Retry up to 2 times with increasing delay
        if (retryCount < 2) {
          setTimeout(() => loadActiveGymCode(retryCount + 1), (retryCount + 1) * 1000)
          return
        }
        return
      }

      const code = data?.[0]?.code || ""
      console.log('Gym code loaded:', code ? 'SUCCESS' : 'NO CODE FOUND')
      setGymCode(code)
      
      // Cache the code in localStorage as fallback
      if (code) {
        localStorage.setItem('cached_gym_code', code)
      }
    } catch (error) {
      console.error('Error loading gym code:', error)
      setHasError(true)
      
      // Try to use cached code as fallback
      const cachedCode = localStorage.getItem('cached_gym_code')
      if (cachedCode) {
        console.log('Using cached gym code')
        setGymCode(cachedCode)
      } else if (retryCount < 2) {
        setTimeout(() => loadActiveGymCode(retryCount + 1), (retryCount + 1) * 1000)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleShowCode = () => {
    if (!gymCode && !isLoading) {
      loadActiveGymCode()
    }
    
    setIsVisible(true)
    
    // Automatisch nach 5 Sekunden verstecken
    setTimeout(() => {
      setIsVisible(false)
    }, 5000)
  }

  const getDisplayText = () => {
    if (isLoading) return "Lädt..."
    if (hasError && !gymCode) return "Fehler"
    if (!gymCode) return "----"
    return gymCode
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
          <p className="text-lg font-mono font-bold text-black">{getDisplayText()}</p>
          {hasError && gymCode && (
            <p className="text-xs text-orange-600">Cache</p>
          )}
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