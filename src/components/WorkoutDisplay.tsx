import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, RotateCcw } from "lucide-react"

interface CrossfitWorkout {
  id: string
  title: string
  workout_type: string
  author_nickname: string
  workout_content: string
  notes?: string
  scaling_beginner?: string
  scaling_scaled?: string
  scaling_rx?: string
}

interface BodybuildingWorkout {
  id: string
  title: string
  focus_area: string
  difficulty: string
  workout_content: string
  notes?: string
}

interface WorkoutDisplayProps {
  workout: CrossfitWorkout | BodybuildingWorkout
  workoutType: 'crossfit' | 'bodybuilding'
  onNewWorkout: () => void
  onReset: () => void
  isGenerating?: boolean
}

export const WorkoutDisplay = ({ workout, workoutType, onNewWorkout, onReset, isGenerating }: WorkoutDisplayProps) => {
  const isCrossfitWorkout = (w: any): w is CrossfitWorkout => workoutType === 'crossfit'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{workout.title}</CardTitle>
          <div className="flex justify-center gap-2 flex-wrap">
            {isCrossfitWorkout(workout) ? (
              <>
                <Badge variant="secondary">{workout.workout_type}</Badge>
                <Badge variant="outline">von {workout.author_nickname}</Badge>
              </>
            ) : (
              <>
                <Badge variant="secondary">{workout.focus_area}</Badge>
                <Badge variant="outline">{workout.difficulty}</Badge>
              </>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Workout</h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm">{workout.workout_content}</pre>
            </div>
          </div>

          {isCrossfitWorkout(workout) && (workout.scaling_beginner || workout.scaling_scaled || workout.scaling_rx) && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Scaling-Optionen</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {workout.scaling_beginner && (
                  <div>
                    <Badge className="mb-2" variant="outline">Beginner</Badge>
                    <div className="bg-muted p-3 rounded text-sm">
                      <pre className="whitespace-pre-wrap">{workout.scaling_beginner}</pre>
                    </div>
                  </div>
                )}
                {workout.scaling_scaled && (
                  <div>
                    <Badge className="mb-2" variant="outline">Scaled</Badge>
                    <div className="bg-muted p-3 rounded text-sm">
                      <pre className="whitespace-pre-wrap">{workout.scaling_scaled}</pre>
                    </div>
                  </div>
                )}
                {workout.scaling_rx && (
                  <div>
                    <Badge className="mb-2" variant="outline">RX</Badge>
                    <div className="bg-muted p-3 rounded text-sm">
                      <pre className="whitespace-pre-wrap">{workout.scaling_rx}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {workout.notes && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Notizen</h3>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{workout.notes}</pre>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex gap-4 justify-center">
            <Button onClick={onNewWorkout} variant="default" disabled={isGenerating}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {isGenerating ? "Generiere..." : "Neues Workout"}
            </Button>
            <Button onClick={onReset} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}