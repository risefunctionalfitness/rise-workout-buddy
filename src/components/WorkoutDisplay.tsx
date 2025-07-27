import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Target, Clock, RotateCcw, ArrowLeft, CheckCircle } from "lucide-react"

interface WorkoutData {
  title: string
  type: string
  duration: number
  exercises: Array<{
    name: string
    reps?: string
    weight?: string
    rest?: string
  }>
  notes?: string
}

interface WorkoutDisplayProps {
  workout: WorkoutData
  onNewWorkout: () => void
  onReset: () => void
}

export const WorkoutDisplay = ({ workout, onNewWorkout, onReset }: WorkoutDisplayProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-foreground p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{workout.title}</h1>
            <div className="flex gap-2">
              <Button onClick={onNewWorkout} variant="secondary" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Neues Workout
              </Button>
              <Button onClick={onReset} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Target className="h-4 w-4 mr-2" />
              {workout.type}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Clock className="h-4 w-4 mr-2" />
              {workout.duration} Minuten
            </Badge>
          </div>
        </div>

        {/* Exercises */}
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Übungen
          </h2>
          
          <div className="grid gap-4">
            {workout.exercises.map((exercise, index) => (
              <div key={index}>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="font-semibold text-lg">{exercise.name}</span>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {exercise.reps && (
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-foreground">{exercise.reps}</span>
                          <span className="text-xs">Wiederholungen</span>
                        </div>
                      )}
                      {exercise.weight && (
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-foreground">{exercise.weight}</span>
                          <span className="text-xs">Gewicht</span>
                        </div>
                      )}
                      {exercise.rest && (
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-foreground">{exercise.rest}</span>
                          <span className="text-xs">Pause</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
                {index < workout.exercises.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {workout.notes && (
          <div className="p-6 pt-0">
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="font-semibold text-primary mb-2">Hinweise:</h3>
              <p className="text-sm">{workout.notes}</p>
            </Card>
          </div>
        )}
      </Card>
    </div>
  )
}