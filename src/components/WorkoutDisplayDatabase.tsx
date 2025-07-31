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
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* Titel */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">{workout.title}</h1>
      </div>

      {/* Workout Parts */}
      {workoutParts.map((part, partIndex) => (
        <div key={part.id} className="space-y-4">
          {/* Part Name als Überschrift */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-3">{part.part_name}:</h2>
            
            {part.description && (
              <p className="text-foreground mb-4">{part.description}</p>
            )}

            {/* Exercises simple Liste */}
            <div className="space-y-2">
              {part.exercises.map((exercise, exerciseIndex) => (
                <div key={exercise.id} className="text-foreground">
                  {formatExerciseDetails(exercise) ? (
                    <p>{formatExerciseDetails(exercise)}</p>
                  ) : (
                    <p>{exercise.exercise_name}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            {part.notes && (
              <div className="mt-4">
                <div className="flex">
                  <div className="w-1/2">
                    <h3 className="font-bold text-foreground mb-2">Notes:</h3>
                    <p className="text-foreground whitespace-pre-line">{part.notes}</p>
                  </div>
                  <div className="w-1/2 pl-8">
                    <h3 className="font-bold text-foreground mb-2">Scaling:</h3>
                    <p className="text-foreground">L1:</p>
                    <p className="text-foreground">L2:</p>
                    <p className="text-foreground">L3:</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Action Button */}
      <div className="flex justify-center pt-6">
        <Button 
          onClick={onNewWorkout} 
          variant="outline" 
          className="px-8 py-2 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Nächstes
        </Button>
      </div>
    </div>
  )
}