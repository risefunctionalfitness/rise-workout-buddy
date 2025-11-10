import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Minus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const SimpleRepsCounter = () => {
  const navigate = useNavigate()
  const [rounds, setRounds] = useState(0)
  const [isHoldingFinish, setIsHoldingFinish] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [showSummary, setShowSummary] = useState(false)

  const handleTap = () => {
    setRounds(prev => prev + 1)
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  const handleUndo = () => {
    setRounds(prev => Math.max(0, prev - 1))
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  const handleFinishStart = () => {
    setIsHoldingFinish(true)
    let progress = 0
    const interval = setInterval(() => {
      progress += 4
      setHoldProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setShowSummary(true)
        setIsHoldingFinish(false)
        setHoldProgress(0)
      }
    }, 25)
    
    ;(window as any).finishInterval = interval
  }

  const handleFinishEnd = () => {
    if ((window as any).finishInterval) {
      clearInterval((window as any).finishInterval)
    }
    setIsHoldingFinish(false)
    setHoldProgress(0)
  }

  const handleNewWorkout = () => {
    setShowSummary(false)
    setRounds(0)
  }

  if (showSummary) {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4 animate-fade-in">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-2">Workout abgeschlossen!</h2>
              <p className="text-muted-foreground">
                Glückwunsch zu deiner Leistung
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-6">
              <div className="text-6xl font-bold text-primary">{rounds}</div>
              <div className="text-lg text-muted-foreground mt-2">
                {rounds === 1 ? 'Runde' : 'Runden'}
              </div>
            </div>

            <Button 
              onClick={handleNewWorkout}
              className="w-full h-14 text-lg"
            >
              Neues Workout
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/rep-counter')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>

      <div className="text-center px-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Simple Counter</h1>
        <p className="text-sm text-muted-foreground">
          Tap zum Zählen
        </p>
      </div>

      <div className="flex-1 px-4 flex items-center justify-center">
        <Card 
          className="w-full border-2 cursor-pointer active:scale-95 transition-transform"
          style={{ minHeight: '60vh' }}
          onClick={handleTap}
        >
          <CardContent className="relative h-full p-0">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-8xl md:text-9xl font-bold text-primary">
                {rounds}
              </div>
              <div className="text-2xl text-muted-foreground mt-4">
                Runden
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 py-6 grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-16 border-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
          onClick={handleUndo}
          disabled={rounds === 0}
        >
          <Minus className="h-6 w-6" />
        </Button>
        
        <Button
          size="lg"
          className="col-span-2 h-16 bg-gradient-to-r from-primary to-primary/80 relative overflow-hidden"
          onMouseDown={handleFinishStart}
          onMouseUp={handleFinishEnd}
          onMouseLeave={handleFinishEnd}
          onTouchStart={handleFinishStart}
          onTouchEnd={handleFinishEnd}
        >
          <div 
            className="absolute inset-0 bg-primary-foreground/20 transition-all duration-100 origin-left"
            style={{ transform: `scaleX(${holdProgress / 100})` }}
          />
          <Check className="relative z-10 h-5 w-5 mr-2" />
          <span className="relative z-10 text-lg font-semibold">
            Finish
          </span>
        </Button>
      </div>
    </div>
  )
}

export default SimpleRepsCounter
