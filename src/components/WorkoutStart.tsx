import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useNavigate, useLocation } from "react-router-dom"
import { Play, Pause, RotateCcw, ArrowLeft } from "lucide-react"
import { TimerBottomNavigation } from "@/components/TimerBottomNavigation"

interface LocationState {
  type: 'fortime' | 'amrap' | 'emom' | 'tabata'
  settings: {
    timeCap?: number
    minutes?: number
    interval?: number
    rounds?: number
    workSeconds?: number
    restSeconds?: number
  }
}

export const WorkoutStart: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { type, settings } = (location.state as LocationState) || {}
  const audioContextRef = useRef<AudioContext | null>(null)
  const [audioInitialized, setAudioInitialized] = useState(false)
  
  const [countdown, setCountdown] = useState(10)
  const [isCountingDown, setIsCountingDown] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [workoutTime, setWorkoutTime] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [roundTime, setRoundTime] = useState(0)
  const [isWorkPhase, setIsWorkPhase] = useState(true)
  const [isFinished, setIsFinished] = useState(false)

  // Initialize audio context after user interaction (iOS requirement)
  const initializeAudio = useCallback(() => {
    if (!audioInitialized) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        // Resume context if suspended (iOS Safari requirement)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume()
        }
        setAudioInitialized(true)
      } catch (error) {
        console.log("Audio context not supported")
      }
    }
  }, [audioInitialized])

  // Enhanced beep function with iOS compatibility
  const playBeep = useCallback((frequency: number = 800, duration: number = 0.2) => {
    // Initialize audio on first use
    if (!audioInitialized) {
      initializeAudio()
    }

    try {
      // Primary method: Web Audio API
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        const oscillator = audioContextRef.current.createOscillator()
        const gainNode = audioContextRef.current.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContextRef.current.destination)
        
        oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)
        
        oscillator.start(audioContextRef.current.currentTime)
        oscillator.stop(audioContextRef.current.currentTime + duration)
      } else {
        // Fallback: Try to create and use a new context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
            oscillator.type = 'sine'
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
            
            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + duration)
          })
        }
      }

      // Vibration as additional feedback for mobile devices
      if ('vibrator' in navigator || 'vibrate' in navigator) {
        navigator.vibrate?.(50)
      }
    } catch (error) {
      console.log("Audio playback failed:", error)
      // Final fallback: vibration only
      if ('vibrator' in navigator || 'vibrate' in navigator) {
        navigator.vibrate?.(100)
      }
    }
  }, [audioInitialized, initializeAudio])

  useEffect(() => {
    if (!type || !settings) {
      navigate('/workout-timer')
      return
    }
  }, [type, settings, navigate])

  // Enhanced countdown with consistent audio cues
  useEffect(() => {
    if (countdown > 0 && isCountingDown) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
        // Play beep for last 3 seconds with different tones
        if (countdown <= 3) {
          if (countdown === 1) {
            playBeep(1000, 0.5) // Higher pitch for final second
          } else {
            playBeep(800, 0.2) // Standard beep for 3-2 seconds
          }
        }
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && isCountingDown) {
      setIsCountingDown(false)
      setIsRunning(true)
      playBeep(600, 0.8) // Lower, longer beep for start
    }
  }, [countdown, isCountingDown, playBeep])

  // Enhanced workout timer with consistent audio cues
  useEffect(() => {
    if (isRunning && !isFinished) {
      const timer = setInterval(() => {
        setWorkoutTime(prev => {
          const newTime = prev + 1
          
          if (type === 'fortime' && settings.timeCap && newTime >= settings.timeCap * 60) {
            setIsFinished(true)
            setIsRunning(false)
            playBeep(400, 1.0) // Low pitch for completion
            return newTime
          }
          
          if (type === 'amrap' && settings.minutes && newTime >= settings.minutes * 60) {
            setIsFinished(true)
            setIsRunning(false)
            playBeep(400, 1.0) // Low pitch for completion
            return newTime
          }
          
          if (type === 'emom' && settings.interval && settings.rounds) {
            const { interval, rounds } = settings
            const newRound = Math.floor(newTime / interval) + 1
            const newRoundTime = newTime % interval
            
            if (newRound > rounds) {
              setIsFinished(true)
              setIsRunning(false)
              playBeep(400, 1.0) // Low pitch for completion
              return newTime
            }
            
            if (newRound !== currentRound) {
              setCurrentRound(newRound)
              playBeep(1200, 0.3) // High pitch for new round
            }

            // Warning beeps for last 3 seconds
            const remainingTime = interval - newRoundTime
            if (remainingTime <= 3 && remainingTime > 0) {
              if (remainingTime === 1) {
                playBeep(1400, 0.15) // Very high pitch for final second
              } else {
                playBeep(1000, 0.1) // Quick beep for countdown
              }
            }
            
            setRoundTime(newRoundTime)
          }
          
          if (type === 'tabata' && settings.rounds && settings.workSeconds && settings.restSeconds) {
            const { rounds, workSeconds, restSeconds } = settings
            const cycleTime = workSeconds + restSeconds
            const totalTime = rounds * cycleTime
            
            if (newTime >= totalTime) {
              setIsFinished(true)
              setIsRunning(false)
              playBeep(400, 1.0) // Low pitch for completion
              return newTime
            }
            
            const newRound = Math.floor(newTime / cycleTime) + 1
            const timeInRound = newTime % cycleTime
            const newIsWorkPhase = timeInRound < workSeconds
            
            if (newRound !== currentRound) {
              setCurrentRound(newRound)
              playBeep(1200, 0.3) // High pitch for new round
            }
            
            if (newIsWorkPhase !== isWorkPhase) {
              setIsWorkPhase(newIsWorkPhase)
              // Different tones for work/rest transitions
              if (newIsWorkPhase) {
                playBeep(1000, 0.4) // Work phase start
              } else {
                playBeep(600, 0.4) // Rest phase start
              }
            }

            // Warning beeps for last 3 seconds of each phase
            if (newIsWorkPhase && (workSeconds - timeInRound) <= 3 && (workSeconds - timeInRound) > 0) {
              if ((workSeconds - timeInRound) === 1) {
                playBeep(1400, 0.15) // Very high pitch for final second
              } else {
                playBeep(1000, 0.1) // Quick beep for countdown
              }
            } else if (!newIsWorkPhase && (restSeconds - (timeInRound - workSeconds)) <= 3 && (restSeconds - (timeInRound - workSeconds)) > 0) {
              if ((restSeconds - (timeInRound - workSeconds)) === 1) {
                playBeep(1400, 0.15) // Very high pitch for final second
              } else {
                playBeep(800, 0.1) // Quick beep for countdown
              }
            }
            
            setRoundTime(timeInRound)
          }
          
          return newTime
        })
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [isRunning, isFinished, type, settings, currentRound, isWorkPhase, playBeep])

  const handleStart = () => {
    // Initialize audio on user interaction (iOS requirement)
    initializeAudio()
    setCountdown(10)
    setIsCountingDown(true)
  }

  const handlePause = () => {
    setIsRunning(!isRunning)
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsCountingDown(false)
    setCountdown(10)
    setWorkoutTime(0)
    setCurrentRound(1)
    setRoundTime(0)
    setIsWorkPhase(true)
    setIsFinished(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!type || !settings) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {!isCountingDown && !isRunning && workoutTime === 0 && (
            <div className="text-center space-y-12">
              <h1 className="text-8xl font-bold">START</h1>
              
              <div className="flex justify-center">
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="w-40 h-40 rounded-full bg-[#B81243] hover:bg-[#B81243]/90 border-4 border-[#B81243]"
                >
                  <div className="w-20 h-20 bg-[#B81243] rounded-full flex items-center justify-center ml-2">
                    <div className="w-0 h-0 border-l-8 border-l-white border-t-6 border-t-transparent border-b-6 border-b-transparent ml-1"></div>
                  </div>
                </Button>
              </div>
              
              <p className="text-xl text-muted-foreground">Klicke hier um zu starten</p>
            </div>
          )}

          {isCountingDown && (
            <div className="text-center space-y-8">
              <div className={`text-9xl font-bold transition-all duration-300 ${
                countdown <= 3 ? 'animate-bounce text-[#B81243] scale-110' : 'animate-pulse'
              }`}>
                {countdown}
              </div>
              <div className="text-2xl text-muted-foreground">
                Bereit machen...
              </div>
              {countdown <= 3 && (
                <div className="text-lg text-[#B81243] font-medium animate-pulse">
                  🔊 Hör auf die Beeps
                </div>
              )}
            </div>
          )}

           {(isRunning || (!isRunning && !isFinished && workoutTime > 0)) && (
            <div className="text-center space-y-12">
              <div>
                {type !== 'tabata' && <h1 className="text-8xl font-bold">{formatTime(workoutTime)}</h1>}
                {type === 'emom' && (
                  <div className="mt-6">
                    <p className="text-2xl">Runde {currentRound} von {settings.rounds}</p>
                    <p className="text-xl text-muted-foreground">
                      Rundenzeit: {formatTime(roundTime)}
                    </p>
                  </div>
                )}
                 {type === 'tabata' && (
                  <div className="text-center space-y-6">
                    <div className="text-6xl font-bold">
                      Runde {currentRound}/{settings.rounds}
                    </div>
                    <div className={`text-5xl font-bold px-6 py-3 rounded-2xl border-2 transition-all duration-300 ${
                      isWorkPhase 
                        ? 'text-white bg-[#B81243] border-[#B81243] animate-pulse' 
                        : 'text-[#B81243] bg-background border-[#B81243]'
                    }`}>
                      {isWorkPhase ? 'WORK' : 'REST'}
                    </div>
                    <div className="text-8xl font-mono font-bold">
                      {isWorkPhase 
                        ? formatTime((settings.workSeconds || 20) - (roundTime % (settings.workSeconds || 20)))
                        : formatTime((settings.restSeconds || 10) - ((roundTime - (settings.workSeconds || 20)) % (settings.restSeconds || 10)))
                      }
                    </div>
                    {/* Visual indicator for last 3 seconds */}
                    {((isWorkPhase && ((settings.workSeconds || 20) - (roundTime % (settings.workSeconds || 20))) <= 3) ||
                      (!isWorkPhase && ((settings.restSeconds || 10) - ((roundTime - (settings.workSeconds || 20)) % (settings.restSeconds || 10))) <= 3)) && (
                      <div className="text-2xl text-[#B81243] font-bold animate-bounce">
                        🔊 Final Countdown!
                      </div>
                    )}
                    <div className="text-xl text-muted-foreground">
                      Gesamt: {formatTime(workoutTime)}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center gap-6">
                <Button
                  onClick={handlePause}
                  size="lg"
                  variant="outline"
                  className="w-20 h-20 rounded-full border-2"
                >
                  {isRunning ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                </Button>
                
                <Button
                  onClick={handleReset}
                  size="lg"
                  variant="outline"
                  className="w-20 h-20 rounded-full border-2"
                >
                  <RotateCcw className="h-8 w-8" />
                </Button>
              </div>
            </div>
          )}

          {isFinished && (
            <div className="text-center space-y-12">
              <h1 className="text-6xl font-bold">FERTIG!</h1>
              <p className="text-3xl">Zeit: {formatTime(workoutTime)}</p>
              {type === 'emom' && (
                <p className="text-2xl">Runden: {currentRound - 1} von {settings.rounds}</p>
              )}
              {type === 'tabata' && (
                <p className="text-2xl">Runden: {currentRound - 1} von {settings.rounds}</p>
              )}
              
              <Button
                onClick={handleReset}
                size="lg"
                className="w-full h-16 text-xl"
              >
                Neuer Versuch
              </Button>
            </div>
          )}
        </div>
      </div>
      <TimerBottomNavigation />
    </div>
  )
}