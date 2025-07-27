import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SelectButton } from "@/components/ui/select-button"
import { Dumbbell, Clock, Target } from "lucide-react"
import { toast } from "@/hooks/use-toast"

type WorkoutType = "crossfit" | "bodybuilding" | null
type Duration = 20 | 30 | 45 | null
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

export const WorkoutGenerator = () => {
  const [workoutType, setWorkoutType] = useState<WorkoutType>(null)
  const [duration, setDuration] = useState<Duration>(null)
  const [focus, setFocus] = useState<Focus>(null)
  const [generatedWorkout, setGeneratedWorkout] = useState<WorkoutData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateWorkout = async () => {
    if (!workoutType || !duration || !focus) {
      toast({
        title: "Unvollständige Auswahl",
        description: "Bitte wählen Sie alle Optionen aus.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    
    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock workout data based on selections
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
        title: "Workout generiert!",
        description: `Dein ${workoutType.toUpperCase()} Workout ist bereit.`
      })
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Workout konnte nicht generiert werden. Versuche es erneut.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const resetSelection = () => {
    setWorkoutType(null)
    setDuration(null)
    setFocus(null)
    setGeneratedWorkout(null)
  }

  if (generatedWorkout) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">{generatedWorkout.title}</h2>
              <Button onClick={resetSelection} variant="outline">
                Neues Workout
              </Button>
            </div>
            
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>{generatedWorkout.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{generatedWorkout.duration} Minuten</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Übungen:</h3>
              <div className="grid gap-3">
                {generatedWorkout.exercises.map((exercise, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">{exercise.name}</span>
                    <div className="text-sm text-muted-foreground space-x-2">
                      {exercise.reps && <span>{exercise.reps}</span>}
                      {exercise.weight && <span>• {exercise.weight}</span>}
                      {exercise.rest && <span>• {exercise.rest} Pause</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {generatedWorkout.notes && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-foreground">{generatedWorkout.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Workout Type Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Trainingsziel wählen</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectButton
            isSelected={workoutType === "crossfit"}
            onClick={() => setWorkoutType("crossfit")}
          >
            CrossFit
          </SelectButton>
          <SelectButton
            isSelected={workoutType === "bodybuilding"}
            onClick={() => setWorkoutType("bodybuilding")}
          >
            Bodybuilding
          </SelectButton>
        </div>
      </div>

      {/* Duration Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Trainingsdauer</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectButton
            isSelected={duration === 20}
            onClick={() => setDuration(20)}
          >
            20 Minuten
          </SelectButton>
          <SelectButton
            isSelected={duration === 30}
            onClick={() => setDuration(30)}
          >
            30 Minuten
          </SelectButton>
          <SelectButton
            isSelected={duration === 45}
            onClick={() => setDuration(45)}
          >
            45 Minuten
          </SelectButton>
        </div>
      </div>

      {/* Focus Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Trainingsbereich</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectButton
            isSelected={focus === "ganzkörper"}
            onClick={() => setFocus("ganzkörper")}
          >
            Ganzkörper
          </SelectButton>
          <SelectButton
            isSelected={focus === "oberkörper"}
            onClick={() => setFocus("oberkörper")}
          >
            Oberkörper
          </SelectButton>
          <SelectButton
            isSelected={focus === "unterkörper"}
            onClick={() => setFocus("unterkörper")}
          >
            Unterkörper
          </SelectButton>
        </div>
      </div>

      {/* Generate Button */}
      <div className="text-center">
        <Button
          onClick={generateWorkout}
          disabled={!workoutType || !duration || !focus || isGenerating}
          size="lg"
          className="px-12 py-4 text-lg"
        >
          {isGenerating ? "Workout wird generiert..." : "Workout generieren"}
        </Button>
      </div>
    </div>
  )
}