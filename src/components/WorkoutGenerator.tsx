import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dumbbell } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { WorkoutTypeSelector } from "./WorkoutTypeSelector"
import { SessionTypeSelector } from "./SessionTypeSelector"
import { DurationSlider } from "./DurationSlider"
import { BodySelector } from "./BodySelector"
import { WorkoutDisplay } from "./WorkoutDisplay"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"

type WorkoutType = "crossfit" | "bodybuilding" | null
type SessionType = "wod_only" | "full_session" | null
type Focus = "ganzkörper" | "oberkörper" | "unterkörper" | null

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

interface WorkoutGeneratorProps {
  user: User
}

export const WorkoutGenerator = ({ user }: WorkoutGeneratorProps) => {
  const [workoutType, setWorkoutType] = useState<WorkoutType>(null)
  const [sessionType, setSessionType] = useState<SessionType>(null)
  const [duration, setDuration] = useState<number>(0)
  const [focus, setFocus] = useState<Focus>(null)
  const [generatedWorkout, setGeneratedWorkout] = useState<WorkoutData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateWorkout = async () => {
    // Für CrossFit: Session Type erforderlich, für Bodybuilding: automatisch full_session
    const requiredSessionType = workoutType === "crossfit" ? sessionType : "full_session"
    
    if (!workoutType || !duration || !focus || (workoutType === "crossfit" && !sessionType)) {
      toast({
        title: "Unvollständige Auswahl",
        description: "Bitte wählen Sie alle Optionen aus.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    
    try {
      // Edge Function für intelligente Workout-Generierung aufrufen
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: {
          workoutType,
          sessionType: requiredSessionType,
          duration,
          focus,
          userId: user.id
        }
      })

      if (error) {
        console.error('Edge Function Error:', error)
        throw new Error(error.message || 'Fehler beim Generieren des Workouts')
      }

      // Konvertiere das neue Workout-Format in das bestehende Format
      const convertedWorkout: WorkoutData = {
        title: data.workout.name,
        type: data.workout.type,
        duration: data.workout.duration,
        exercises: data.workout.parts.reduce((acc: any[], part: any) => {
          if (part.exercises) {
            acc.push(...part.exercises.map((ex: string) => ({ name: ex })))
          }
          return acc
        }, []),
        notes: data.workout.notes
      }

      setGeneratedWorkout(convertedWorkout)
      
      toast({
        title: "Personalisiertes Workout generiert!",
        description: `Dein ${workoutType.toUpperCase()} Workout basierend auf deinem Profil.`
      })
    } catch (error) {
      console.error("Fehler beim Generieren:", error)
      
      // Fallback bei Fehlern - lokale Mock-Generierung
      const mockWorkouts = {
        crossfit: {
          ganzkörper: {
            title: "CrossFit AMRAP Challenge",
            type: "AMRAP",
            duration: duration,
            exercises: [
              { name: "Burpees", reps: "10" },
              { name: "Pull-ups", reps: "8" },
              { name: "Box Jumps", reps: "15" },
              { name: "Push-ups", reps: "12" },
              { name: "Kettlebell Swings", reps: "20" }
            ],
            notes: `${duration} Minuten AMRAP - so viele Runden wie möglich!`
          },
          oberkörper: {
            title: "Upper Body CrossFit WOD",
            type: "For Time",
            duration: duration,
            exercises: [
              { name: "Push-ups", reps: "50" },
              { name: "Pull-ups", reps: "30" },
              { name: "Handstand Push-ups", reps: "20" },
              { name: "Ring Dips", reps: "25" }
            ],
            notes: "Absolviere alle Übungen so schnell wie möglich!"
          },
          unterkörper: {
            title: "Lower Body Power WOD",
            type: "EMOM",
            duration: duration,
            exercises: [
              { name: "Air Squats", reps: "15" },
              { name: "Lunges", reps: "10 pro Seite" },
              { name: "Jump Squats", reps: "12" },
              { name: "Single Leg Deadlifts", reps: "8 pro Seite" }
            ],
            notes: `${duration} Minuten EMOM - jede Minute eine Übung!`
          }
        },
        bodybuilding: {
          ganzkörper: {
            title: "Full Body Strength Circuit",
            type: "Krafttraining",
            duration: duration,
            exercises: [
              { name: "Squats", reps: "4x12", weight: "Körpergewicht" },
              { name: "Push-ups", reps: "3x15", rest: "60s" },
              { name: "Bent-over Rows", reps: "4x10", weight: "Hanteln" },
              { name: "Overhead Press", reps: "3x12", weight: "Hanteln" },
              { name: "Plank", reps: "3x45s", rest: "45s" }
            ],
            notes: "Fokus auf kontrollierte Bewegung und saubere Technik."
          },
          oberkörper: {
            title: "Upper Body Mass Builder",
            type: "Hypertrophie",
            duration: duration,
            exercises: [
              { name: "Bench Press", reps: "4x8-10", weight: "80% 1RM", rest: "90s" },
              { name: "Lat Pulldowns", reps: "4x10-12", weight: "Schwer", rest: "75s" },
              { name: "Shoulder Press", reps: "3x12", weight: "Moderat", rest: "60s" },
              { name: "Bicep Curls", reps: "3x15", weight: "Leicht", rest: "45s" },
              { name: "Tricep Dips", reps: "3x12-15", rest: "45s" }
            ],
            notes: "Fokus auf Muskelaufbau mit moderaten bis schweren Gewichten."
          },
          unterkörper: {
            title: "Leg Day Power Session",
            type: "Kraftaufbau",
            duration: duration,
            exercises: [
              { name: "Squats", reps: "5x5", weight: "Schwer", rest: "2-3min" },
              { name: "Romanian Deadlifts", reps: "4x8", weight: "Moderat", rest: "90s" },
              { name: "Bulgarian Split Squats", reps: "3x12 pro Seite", rest: "60s" },
              { name: "Calf Raises", reps: "4x15", weight: "Moderat", rest: "45s" },
              { name: "Leg Curls", reps: "3x15", rest: "45s" }
            ],
            notes: "Progressive Überlastung für maximalen Kraftzuwachs."
          }
        }
      }

      const workout = mockWorkouts[workoutType][focus]
      setGeneratedWorkout(workout)
      
      toast({
        title: "Fallback-Workout generiert",
        description: "KI-Generation nicht verfügbar, lokales Workout erstellt.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const newWorkout = () => {
    setGeneratedWorkout(null)
  }

  const resetSelection = () => {
    setWorkoutType(null)
    setSessionType(null)
    setDuration(0)
    setFocus(null)
    setGeneratedWorkout(null)
  }

  if (generatedWorkout) {
    return (
      <WorkoutDisplay 
        workout={generatedWorkout}
        onNewWorkout={newWorkout}
        onReset={resetSelection}
      />
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column - Selections */}
        <div className="space-y-6">
          {/* Workout Type Selection */}
          <div className="space-y-4">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                <Dumbbell className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Trainingsziel</h2>
              </div>
            </div>
            <WorkoutTypeSelector
              selectedType={workoutType}
              onTypeSelect={(type) => {
                setWorkoutType(type)
                setSessionType(null) // Reset session type when workout type changes
              }}
            />
          </div>

          {/* Session Type Selection - nur für CrossFit */}
          {workoutType === "crossfit" && (
            <div className="space-y-4">
              <div className="text-center lg:text-left">
                <h3 className="text-lg font-semibold text-foreground mb-2">Session-Typ</h3>
              </div>
              <SessionTypeSelector
                selectedType={sessionType}
                onTypeSelect={setSessionType}
              />
            </div>
          )}

          {/* Duration Selection */}
          {workoutType && (workoutType === "bodybuilding" || sessionType) && (
            <div className="space-y-4">
              <DurationSlider
                workoutType={workoutType}
                duration={duration}
                onDurationChange={setDuration}
              />
            </div>
          )}

          {/* Body Part Selection */}
          {workoutType && duration > 0 && (workoutType === "bodybuilding" || sessionType) && (
            <div className="space-y-4">
              <div className="text-center lg:text-left">
                <h3 className="text-lg font-semibold text-foreground mb-2">Trainingsbereich</h3>
              </div>
              <div className="flex justify-center lg:justify-start">
                <BodySelector
                  selectedPart={focus}
                  onPartSelect={setFocus}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Generate Button */}
        <div className="flex items-center justify-center lg:items-end lg:justify-start">
          {workoutType && duration > 0 && focus && (workoutType === "bodybuilding" || sessionType) && (
            <Button
              onClick={generateWorkout}
              disabled={isGenerating}
              size="lg"
              className="px-12 py-6 text-lg font-semibold w-full lg:w-auto"
            >
              {isGenerating ? "Workout wird generiert..." : "Workout generieren"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}