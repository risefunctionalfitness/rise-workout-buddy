import { Button } from "@/components/ui/button"
import { RotateCcw, ArrowLeft } from "lucide-react"

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

interface WorkoutDisplayWhiteboardProps {
  workout: WorkoutData
  onNewWorkout: () => void
  onReset: () => void
}

export const WorkoutDisplayWhiteboard = ({ workout, onNewWorkout, onReset }: WorkoutDisplayWhiteboardProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Whiteboard Style Display */}
      <div className="bg-background border-4 border-primary rounded-lg p-8 min-h-[600px] relative shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2 underline decoration-primary/30 decoration-4">
            {workout.title}
          </h1>
          <div className="text-lg text-muted-foreground">
            {workout.type} • {workout.duration} Min
          </div>
        </div>

        {/* Workout Content */}
        <div className="space-y-6">
          {/* Check if we have structured parts from the Edge Function */}
          {workout.exercises && workout.exercises.length > 0 && (
            <div className="space-y-4">
              {workout.exercises.map((exercise, index) => (
                <div key={index} className="text-lg">
                  <div className="font-semibold text-foreground mb-1">
                    {exercise.name}
                  </div>
                  <div className="flex gap-4 text-muted-foreground text-base">
                    {exercise.reps && <span>{exercise.reps}</span>}
                    {exercise.weight && <span className="text-primary font-medium">{exercise.weight}</span>}
                    {exercise.rest && <span>Rest: {exercise.rest}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {workout.notes && (
            <div className="mt-8 pt-6 border-t-2 border-primary/30">
              <div className="text-primary font-semibold mb-2">NOTES:</div>
              <div className="text-foreground">{workout.notes}</div>
            </div>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex gap-3 justify-center">
            <Button onClick={onNewWorkout} variant="default" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Neues Workout
            </Button>
            <Button onClick={onReset} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}