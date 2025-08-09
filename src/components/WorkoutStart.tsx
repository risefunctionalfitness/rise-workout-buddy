import { useState, useEffect, useRef } from "react"
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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const [countdown, setCountdown] = useState(10)
  const [isCountingDown, setIsCountingDown] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [workoutTime, setWorkoutTime] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [roundTime, setRoundTime] = useState(0)
  const [isWorkPhase, setIsWorkPhase] = useState(true)
  const [isFinished, setIsFinished] = useState(false)

  // Create beep sound using Web Audio API
  const playBeep = (frequency: number = 800, duration: number = 200) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration / 1000)
  }

  useEffect(() => {
    if (!type || !settings) {
      navigate('/workout-timer')
      return
    }
  }, [type, settings, navigate])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isCountingDown && countdown > 0) {
      // Play beep sound for last 3 seconds
      if (countdown <= 3) {
        playBeep(1000, 300)
      }
      
      interval = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
    } else if (isCountingDown && countdown === 0) {
      // Play start sound
      playBeep(1200, 500)
      setIsCountingDown(false)
      setIsRunning(true)
    }

    return () => clearInterval(interval)
  }, [isCountingDown, countdown])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning) {
      interval = setInterval(() => {
        setWorkoutTime(prev => prev + 1)
        
        if (type === 'emom') {
          setRoundTime(prev => {
            const newRoundTime = prev + 1
            if (newRoundTime >= settings.interval!) {
              setCurrentRound(r => r + 1)
              return 0
            }
            return newRoundTime
          })
          
            if (currentRound > settings.rounds!) {
              setIsRunning(false)
              setIsFinished(true)
              playBeep(600, 1000) // End sound
            }
        } else if (type === 'tabata') {
          setRoundTime(prev => {
            const newRoundTime = prev + 1
            const currentInterval = isWorkPhase ? settings.workSeconds! : settings.restSeconds!
            
            if (newRoundTime >= currentInterval) {
              if (isWorkPhase) {
                // Work phase ends, start rest
                setIsWorkPhase(false)
                playBeep(800, 200) // Phase change sound
              } else {
                // Rest phase ends, start next work round
                setIsWorkPhase(true)
                setCurrentRound(r => r + 1)
                playBeep(1000, 200) // Phase change sound
              }
              return 0
            }
            return newRoundTime
          })
          
            if (currentRound > settings.rounds!) {
              setIsRunning(false)
              setIsFinished(true)
              playBeep(600, 1000) // End sound
            }
        } else if (type === 'fortime' && settings.timeCap && workoutTime >= settings.timeCap * 60) {
          setIsRunning(false)
          setIsFinished(true)
          playBeep(600, 1000) // End sound
        } else if (type === 'amrap' && settings.minutes && workoutTime >= settings.minutes * 60) {
          setIsRunning(false)
          setIsFinished(true)
          playBeep(600, 1000) // End sound
        }
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isRunning, type, settings, workoutTime, currentRound, roundTime])

  const handleStart = () => {
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
          onClick={() => navigate("/workout-timer")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6" style={{ marginTop: '-1cm' }}>
        <div className="max-w-md w-full" style={{ marginTop: '-1cm' }}>
          {!isCountingDown && !isRunning && workoutTime === 0 && (
            <div className="text-center space-y-12" style={{ marginTop: '-1cm' }}>
              <h1 className="text-8xl font-bold" style={{ marginTop: '-1cm' }}>START</h1>
              
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
            <div className="text-center space-y-8" style={{ marginTop: '-1cm' }}>
              <h1 className={`text-8xl font-bold ${countdown <= 3 ? 'text-primary animate-pulse' : ''}`} style={{ marginTop: '-1cm' }}>
                {countdown}
              </h1>
              <p className="text-xl text-muted-foreground">Bereit machen...</p>
            </div>
          )}

          {isRunning && (
            <div className="text-center space-y-12" style={{ marginTop: '-1cm' }}>
              <div>
                <h1 className="text-8xl font-bold" style={{ marginTop: '-1cm' }}>{formatTime(workoutTime)}</h1>
                {type === 'emom' && (
                  <div className="mt-6">
                    <p className="text-2xl">Runde {currentRound} von {settings.rounds}</p>
                    <p className="text-xl text-muted-foreground">
                      Rundenzeit: {formatTime(roundTime)}
                    </p>
                  </div>
                )}
                {type === 'tabata' && (
                  <div className="mt-6">
                    <p className="text-2xl">Runde {currentRound} von {settings.rounds}</p>
                    <p className={`text-3xl font-bold ${isWorkPhase ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isWorkPhase ? 'WORK' : 'REST'}
                    </p>
                    <p className="text-xl text-muted-foreground">
                      {formatTime((isWorkPhase ? settings.workSeconds! : settings.restSeconds!) - roundTime)}
                    </p>
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
                  <Pause className="h-8 w-8" />
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

          {!isRunning && workoutTime > 0 && (
            <div className="text-center space-y-12" style={{ marginTop: '-1cm' }}>
              <h1 className="text-6xl font-bold" style={{ marginTop: '-1cm' }}>FERTIG!</h1>
              <p className="text-3xl" style={{ marginTop: '-1cm' }}>Zeit: {formatTime(workoutTime)}</p>
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