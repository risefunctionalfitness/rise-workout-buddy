import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { LockOpen, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export const GymCodeDisplay = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [gymCode, setGymCode] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [showManualRefresh, setShowManualRefresh] = useState(false)

  useEffect(() => {
    loadActiveGymCode()
  }, [])

  const loadActiveGymCode = async (retryCount = 0, isManual = false) => {
    try {
      setIsLoading(true)
      setHasError(false)
      setShowManualRefresh(false)
      
      // Erweiterte Debug-Informationen
      const user = await supabase.auth.getUser()
      const session = await supabase.auth.getSession()
      const isAndroid = /Android/i.test(navigator.userAgent)
      const isCapacitor = !!(window as any).Capacitor
      
      const debugData = {
        attempt: retryCount + 1,
        isManual,
        userId: user.data.user?.id || 'NO_USER',
        sessionValid: !!session.data.session,
        userAgent: navigator.userAgent,
        isAndroid,
        isCapacitor,
        online: navigator.onLine,
        timestamp: new Date().toISOString()
      }
      
      console.log('🔍 Gym Code Debug Info:', debugData)
      setDebugInfo(`Attempt ${debugData.attempt}, User: ${debugData.userId.slice(0,8)}..., Android: ${debugData.isAndroid}`)
      
      // Prüfe verschiedene Cache-Strategien für Android
      let cachedCode = null
      if (isAndroid || isCapacitor) {
        cachedCode = localStorage.getItem('cached_gym_code') || 
                    sessionStorage.getItem('cached_gym_code')
      } else {
        cachedCode = localStorage.getItem('cached_gym_code')
      }
      
      const { data, error } = await supabase
        .from('gym_access_codes')
        .select('code')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('❌ Error loading gym code:', error)
        setHasError(true)
        
        // Verwende Cache bei Fehlern
        if (cachedCode) {
          console.log('📦 Using cached code due to error')
          setGymCode(cachedCode)
          return
        }
        
        // Exponential backoff für Retries
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
          console.log(`⏳ Retrying in ${delay}ms...`)
          setTimeout(() => loadActiveGymCode(retryCount + 1), delay)
          return
        }
        
        setShowManualRefresh(true)
        return
      }

      const code = data?.[0]?.code || ""
      console.log('✅ Gym code result:', {
        hasCode: !!code,
        codeLength: code.length,
        dataLength: data?.length || 0,
        firstItem: data?.[0] || null
      })
      
      if (code) {
        setGymCode(code)
        // Multi-Cache für Android-Geräte
        localStorage.setItem('cached_gym_code', code)
        if (isAndroid || isCapacitor) {
          sessionStorage.setItem('cached_gym_code', code)
        }
        setHasError(false)
      } else {
        // Kein aktiver Code in DB gefunden
        console.warn('⚠️ No active gym code found in database')
        if (cachedCode) {
          console.log('📦 Using cached code as fallback')
          setGymCode(cachedCode)
        } else {
          setShowManualRefresh(true)
        }
      }
    } catch (error) {
      console.error('💥 Exception loading gym code:', error)
      setHasError(true)
      
      // Fallback-Strategien
      const cachedCode = localStorage.getItem('cached_gym_code') || 
                        sessionStorage.getItem('cached_gym_code')
      if (cachedCode) {
        console.log('📦 Using cached gym code after exception')
        setGymCode(cachedCode)
      } else if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000
        setTimeout(() => loadActiveGymCode(retryCount + 1), delay)
      } else {
        setShowManualRefresh(true)
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

  const handleManualRefresh = () => {
    loadActiveGymCode(0, true)
  }

  const getDisplayText = () => {
    if (isLoading) return "Lädt..."
    if (hasError && !gymCode) return "Kein Code"
    if (!gymCode) return "Nicht verfügbar"
    return gymCode
  }

  return (
    <div className="relative">
      {/* Ausfahrendes Textfeld - nach links */}
      <div 
        className={`absolute top-0 right-14 bg-white border-2 border-[#B81243] rounded-l-lg shadow-lg h-14 flex items-center justify-center transition-all duration-500 overflow-hidden ${
          isVisible ? 'w-64 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div className="px-4 text-center whitespace-nowrap flex items-center gap-2">
          <LockOpen className="h-5 w-5 text-[#B81243]" />
          <div>
            <p className="text-xs text-[#B81243] font-medium">Tür-Code</p>
            <p className="text-lg font-mono font-bold text-black">{getDisplayText()}</p>
            {hasError && gymCode && (
              <p className="text-xs text-orange-600">Cache</p>
            )}
          </div>
          <LockOpen className="h-5 w-5 text-[#B81243]" />
        </div>
      </div>

      {/* Manual Refresh Button */}
      {showManualRefresh && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleManualRefresh}
          className="absolute top-0 right-16 rounded-full w-8 h-8 border border-orange-500 bg-orange-50 hover:bg-orange-100 z-10"
          aria-label="Code manuell laden"
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 text-orange-600 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      )}

      {/* Hauptbutton - rot mit dunklerem Hover */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleShowCode}
        className="rounded-full w-14 h-14 border-2 border-[#B81243] bg-[#B81243] hover:bg-[#901a36] text-white shadow-lg relative z-10"
        aria-label="Zugangscode anzeigen"
        disabled={isLoading}
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <LockOpen className="h-4 w-4" />
        )}
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