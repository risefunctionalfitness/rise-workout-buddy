import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, RotateCcw, Clock, Target, Dumbbell } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

interface WorkoutPart {
  id: string
  part_name: string
  part_order: number
  description: string
  duration_minutes?: number
  duration_rounds?: number
  score_type?: string
  notes?: string
  exercises: Exercise[]
}

interface Exercise {
  id: string
  exercise_name: string
  exercise_order: number
  reps?: number
  weight_kg?: number
  distance_meters?: number
  duration_seconds?: number
  percentage_1rm?: number
  rest_seconds?: number
  notes?: string
}

interface WorkoutDisplayDatabaseProps {
  workoutId: string
  onNewWorkout: () => void
  onReset: () => void
}

export const WorkoutDisplayDatabase = ({ workoutId, onNewWorkout, onReset }: WorkoutDisplayDatabaseProps) => {
  const [workout, setWorkout] = useState<any>(null)
  const [workoutParts, setWorkoutParts] = useState<WorkoutPart[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkout()
  }, [workoutId])

  const loadWorkout = async () => {
    try {
      // Lade Workout-Details
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single()

      if (workoutError) throw workoutError

      // Lade Workout-Parts mit Übungen
      const { data: partsData, error: partsError } = await supabase
        .from('workout_parts')
        .select(`
          *,
          workout_exercises (
            id,
            exercise_name,
            exercise_order,
            reps,
            weight_kg,
            distance_meters,
            duration_seconds,
            percentage_1rm,
            rest_seconds,
            notes
          )
        `)
        .eq('workout_id', workoutId)
        .order('part_order')

      if (partsError) throw partsError

      // Struktur für WorkoutParts aufbauen
      const formattedParts: WorkoutPart[] = partsData.map(part => ({
        id: part.id,
        part_name: part.part_name,
        part_order: part.part_order,
        description: part.description,
        duration_minutes: part.duration_minutes,
        duration_rounds: part.duration_rounds,
        score_type: part.score_type,
        notes: part.notes,
        exercises: (part.workout_exercises || [])
          .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
          .map((ex: any) => ({
            id: ex.id,
            exercise_name: ex.exercise_name,
            exercise_order: ex.exercise_order,
            reps: ex.reps,
            weight_kg: ex.weight_kg,
            distance_meters: ex.distance_meters,
            duration_seconds: ex.duration_seconds,
            percentage_1rm: ex.percentage_1rm,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes
          }))
      }))

      setWorkout(workoutData)
      setWorkoutParts(formattedParts)
    } catch (error) {
      console.error('Fehler beim Laden des Workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatExerciseDetails = (exercise: Exercise) => {
    const details = []
    
    if (exercise.reps) details.push(`${exercise.reps} Reps`)
    if (exercise.weight_kg) details.push(`${exercise.weight_kg}kg`)
    if (exercise.distance_meters) details.push(`${exercise.distance_meters}m`)
    if (exercise.duration_seconds) details.push(`${exercise.duration_seconds}s`)
    if (exercise.percentage_1rm) details.push(`${exercise.percentage_1rm}% 1RM`)
    if (exercise.rest_seconds) details.push(`${exercise.rest_seconds}s Rest`)
    
    return details.join(' • ')
  }

  const getScoreTypeColor = (scoreType?: string) => {
    switch (scoreType?.toLowerCase()) {
      case 'amrap': return 'bg-blue-500/10 text-blue-700 border-blue-200'
      case 'for time': return 'bg-red-500/10 text-red-700 border-red-200'
      case 'emom': return 'bg-green-500/10 text-green-700 border-green-200'
      case 'strength': return 'bg-purple-500/10 text-purple-700 border-purple-200'
      case 'tabata': return 'bg-orange-500/10 text-orange-700 border-orange-200'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Workout wird geladen...</p>
        </div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 text-center">
        <p className="text-destructive">Workout konnte nicht geladen werden.</p>
        <Button onClick={onReset} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{workout.title}</h1>
                <p className="text-muted-foreground capitalize">
                  {workout.workout_type} • {workout.session_type?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{workout.duration_minutes} Min</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span className="capitalize">{workout.focus_area?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="secondary" className="capitalize">
              {workout.difficulty_level}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {workout.focus_area?.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Workout Parts */}
      <div className="space-y-6">
        {workoutParts.map((part, index) => (
          <Card key={part.id} className="p-6">
            <div className="space-y-4">
              {/* Part Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{part.part_name}</h3>
                    {part.score_type && (
                      <Badge className={cn("mt-1", getScoreTypeColor(part.score_type))}>
                        {part.score_type}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {part.duration_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{part.duration_minutes} Min</span>
                    </div>
                  )}
                  {part.duration_rounds && (
                    <span>{part.duration_rounds} Runden</span>
                  )}
                </div>
              </div>

              {/* Part Description */}
              {part.description && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground font-medium">{part.description}</p>
                </div>
              )}

              {/* Exercises */}
              {part.exercises.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <div className="grid gap-2">
                    {part.exercises.map((exercise, exIndex) => (
                      <div key={exercise.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium">
                            {exIndex + 1}
                          </span>
                          <span className="font-medium">{exercise.exercise_name}</span>
                        </div>
                        {formatExerciseDetails(exercise) && (
                          <span className="text-muted-foreground text-sm">
                            {formatExerciseDetails(exercise)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Part Notes */}
              {part.notes && (
                <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-lg">
                  {part.notes}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Notes */}
      {workout.notes && (
        <Card className="p-6 bg-muted/50">
          <h4 className="font-semibold mb-2">Hinweise</h4>
          <p className="text-muted-foreground">{workout.notes}</p>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center pt-6">
        <Button onClick={onNewWorkout} size="lg" className="px-8">
          <RotateCcw className="h-4 w-4 mr-2" />
          Neues Workout
        </Button>
        <Button onClick={onReset} variant="outline" size="lg" className="px-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>
    </div>
  )
}