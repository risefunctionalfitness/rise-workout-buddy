import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useNavigate, useLocation } from "react-router-dom"
import { Play, Pause, RotateCcw } from "lucide-react"

interface LocationState {
  type: 'fortime' | 'amrap' | 'emom'
  settings: {
    timeCap?: number
    minutes?: number
    interval?: number
    rounds?: number
  }
}

export const WorkoutStart: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { type, settings } = (location.state as LocationState) || {}
  
  const [countdown, setCountdown] = useState(10)
  const [isCountingDown, setIsCountingDown] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [workoutTime, setWorkoutTime] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [roundTime, setRoundTime] = useState(0)

  useEffect(() => {
    if (!type || !settings) {
      navigate('/workout-timer')
      return
    }
  }, [type, settings, navigate])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isCountingDown && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
    } else if (isCountingDown && countdown === 0) {
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
          }
        } else if (type === 'fortime' && settings.timeCap && workoutTime >= settings.timeCap * 60) {
          setIsRunning(false)
        } else if (type === 'amrap' && settings.minutes && workoutTime >= settings.minutes * 60) {
          setIsRunning(false)
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
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!type || !settings) return null

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/workout-timer")}
            className="mb-4"
          >
            ← Zurück
          </Button>
        </div>

        {!isCountingDown && !isRunning && workoutTime === 0 && (
          <div className="text-center space-y-8">
            <h1 className="text-6xl font-bold">START</h1>
            
            <div className="flex justify-center">
              <Button
                onClick={handleStart}
                size="lg"
                className="w-32 h-32 rounded-full bg-primary hover:bg-primary/90"
              >
                <Play className="h-12 w-12 text-primary-foreground" />
              </Button>
            </div>
            
            <p className="text-muted-foreground">Klicke hier um zu starten</p>
          </div>
        )}

        {isCountingDown && (
          <div className="text-center space-y-8">
            <h1 className="text-8xl font-bold text-primary">{countdown}</h1>
            <p className="text-xl">Bereit machen...</p>
          </div>
        )}

        {isRunning && (
          <div className="text-center space-y-8">
            <div>
              <h1 className="text-6xl font-bold">{formatTime(workoutTime)}</h1>
              {type === 'emom' && (
                <div className="mt-4">
                  <p className="text-xl">Runde {currentRound} von {settings.rounds}</p>
                  <p className="text-lg text-muted-foreground">
                    Rundenzeit: {formatTime(roundTime)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-center gap-4">
              <Button
                onClick={handlePause}
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full"
              >
                <Pause className="h-6 w-6" />
              </Button>
              
              <Button
                onClick={handleReset}
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full"
              >
                <RotateCcw className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}

        {!isRunning && workoutTime > 0 && (
          <div className="text-center space-y-8">
            <h1 className="text-4xl font-bold">FERTIG!</h1>
            <p className="text-2xl">Zeit: {formatTime(workoutTime)}</p>
            {type === 'emom' && (
              <p className="text-xl">Runden: {currentRound - 1} von {settings.rounds}</p>
            )}
            
            <Button
              onClick={handleReset}
              size="lg"
              className="w-full"
            >
              Neuer Versuch
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}