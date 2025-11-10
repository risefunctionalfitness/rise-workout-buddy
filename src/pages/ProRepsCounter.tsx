import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, GripVertical, Plus, Play, Trash2, Minus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

interface Round {
  id: string
  targetReps: number
  completedReps: number
}

const ProRepsCounter = () => {
  const navigate = useNavigate()
  const [isSetupMode, setIsSetupMode] = useState(true)
  const [rounds, setRounds] = useState<Round[]>([
    { id: '1', targetReps: 10, completedReps: 0 }
  ])
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isHoldingFinish, setIsHoldingFinish] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [showSummary, setShowSummary] = useState(false)

  const addRound = () => {
    const newRound: Round = {
      id: String(rounds.length + 1),
      targetReps: 10,
      completedReps: 0
    }
    setRounds([...rounds, newRound])
  }

  const removeRound = (id: string) => {
    if (rounds.length > 1) {
      setRounds(rounds.filter(r => r.id !== id))
    }
  }

  const updateRoundTarget = (id: string, targetReps: number) => {
    setRounds(rounds.map(r => 
      r.id === id ? { ...r, targetReps: Math.max(1, targetReps) } : r
    ))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newRounds = [...rounds]
    const draggedRound = newRounds[draggedIndex]
    newRounds.splice(draggedIndex, 1)
    newRounds.splice(index, 0, draggedRound)
    
    setRounds(newRounds)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const startWorkout = () => {
    setIsSetupMode(false)
    setCurrentRoundIndex(0)
  }

  const handleTap = () => {
    const currentRound = rounds[currentRoundIndex]
    
    // Nicht weiter zählen, wenn bereits alle Runden komplett sind
    const allRoundsComplete = rounds.every(r => r.completedReps >= r.targetReps)
    if (allRoundsComplete) {
      return
    }

    const newCompletedReps = currentRound.completedReps + 1

    const updatedRounds = [...rounds]
    updatedRounds[currentRoundIndex] = {
      ...currentRound,
      completedReps: newCompletedReps
    }
    setRounds(updatedRounds)

    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    if (newCompletedReps >= currentRound.targetReps) {
      // Prüfen ob das die letzte Runde war
      if (currentRoundIndex === rounds.length - 1) {
        // Automatisch beenden nach 500ms
        setTimeout(() => {
          setShowSummary(true)
        }, 500)
      } else {
        // Zur nächsten Runde
        setTimeout(() => {
          setCurrentRoundIndex(currentRoundIndex + 1)
        }, 300)
      }
    }
  }

  const handleUndo = () => {
    const currentRound = rounds[currentRoundIndex]
    
    if (currentRound.completedReps > 0) {
      const updatedRounds = [...rounds]
      updatedRounds[currentRoundIndex] = {
        ...currentRound,
        completedReps: currentRound.completedReps - 1
      }
      setRounds(updatedRounds)
    } else if (currentRoundIndex > 0) {
      setCurrentRoundIndex(currentRoundIndex - 1)
    }

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
    setIsSetupMode(true)
    setCurrentRoundIndex(0)
    setRounds([{ id: '1', targetReps: 10, completedReps: 0 }])
  }

  const handleRepeatWorkout = () => {
    const resetRounds = rounds.map(round => ({
      ...round,
      completedReps: 0
    }))
    setRounds(resetRounds)
    setShowSummary(false)
    setCurrentRoundIndex(0)
  }

  const completedRounds = rounds.filter(r => 
    r.completedReps >= r.targetReps
  ).length

  const totalRepsCompleted = rounds.reduce((sum, round) => 
    sum + round.completedReps, 0
  )

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

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-4xl font-bold text-primary">{completedRounds}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {completedRounds === 1 ? 'Runde' : 'Runden'}
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-4xl font-bold text-primary">{totalRepsCompleted}</div>
                <div className="text-sm text-muted-foreground mt-1">Reps</div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {totalRepsCompleted} Wiederholungen insgesamt
            </p>

            <div className="space-y-3">
              <Button 
                onClick={handleNewWorkout}
                className="w-full h-14 text-lg"
              >
                Neues Workout
              </Button>
              <Button 
                onClick={handleRepeatWorkout}
                variant="outline"
                className="w-full h-14 text-lg"
              >
                Workout wiederholen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSetupMode) {
    return (
      <div className="min-h-screen bg-background pb-20">
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
          <h1 className="text-2xl font-bold text-foreground mb-1">Pro Counter</h1>
          <p className="text-sm text-muted-foreground">
            Erstelle dein Workout
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-4 space-y-4">
          {rounds.map((round, index) => (
            <div
              key={round.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`bg-muted/50 rounded-xl p-4 border-2 border-muted transition-all ${
                draggedIndex === index ? 'opacity-50 scale-95' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
                  {index + 1}
                </div>

                <Input
                  type="number"
                  min="1"
                  value={round.targetReps}
                  onChange={(e) => updateRoundTarget(round.id, parseInt(e.target.value) || 1)}
                  className="h-14 text-2xl font-bold text-center bg-background border-2 border-primary/20 focus:border-primary"
                />

                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Reps
                </span>

                {rounds.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRound(round.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addRound}
            className="w-full h-16 text-lg border-2 border-dashed border-primary/30 text-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Runde hinzufügen
          </Button>

          <Button
            onClick={startWorkout}
            className="w-full h-16 text-xl mt-6"
          >
            <Play className="h-6 w-6 mr-2" />
            Workout starten
          </Button>
        </div>
      </div>
    )
  }

  const currentRound = rounds[currentRoundIndex]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsSetupMode(true)
            setCurrentRoundIndex(0)
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>

      <div className="px-4 py-4">
        <div className="text-center mb-3">
          <h2 className="text-lg font-semibold">
            Runde {currentRoundIndex + 1} von {rounds.length}
          </h2>
        </div>
        <Progress 
          value={(currentRound.completedReps / currentRound.targetReps) * 100} 
          className="h-3" 
        />
      </div>

      <div className="flex-1 px-4 flex flex-col items-center justify-center pb-8">
        <Card 
          className="w-full border-2 cursor-pointer active:scale-95 transition-transform mb-6"
          style={{ minHeight: '40vh' }}
          onClick={handleTap}
        >
          <CardContent className="relative h-full p-0">
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-12">
              <div className="text-7xl md:text-8xl font-bold text-primary">
                {currentRound.completedReps}
                <span className="text-4xl text-muted-foreground">
                  /{currentRound.targetReps}
                </span>
              </div>
              <div className="text-xl text-muted-foreground mt-4">
                Wiederholungen
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {rounds.map((round, index) => {
            const isCompleted = round.completedReps >= round.targetReps
            const isCurrent = index === currentRoundIndex
            
            return (
              <div 
                key={round.id}
                className={`
                  relative w-16 h-16 rounded-full 
                  flex items-center justify-center 
                  font-bold text-lg
                  transition-all duration-300
                  ${isCompleted 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'}
                  ${isCurrent 
                    ? 'ring-4 ring-primary ring-offset-2 scale-110' 
                    : ''}
                `}
              >
                {isCompleted ? <Check className="h-6 w-6" /> : <span>{round.targetReps}</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-6 grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-16 border-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
          onClick={handleUndo}
          disabled={currentRoundIndex === 0 && currentRound.completedReps === 0}
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
          <span className="relative z-10 text-lg font-semibold">
            Finish halten
          </span>
        </Button>
      </div>
    </div>
  )
}

export default ProRepsCounter
