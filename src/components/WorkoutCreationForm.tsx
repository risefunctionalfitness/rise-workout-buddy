import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const EXERCISES = [
  // Langhantel
  { category: "Langhantel", name: "Back Squat" },
  { category: "Langhantel", name: "Front Squat" },
  { category: "Langhantel", name: "Overhead Squat" },
  { category: "Langhantel", name: "Deadlift" },
  { category: "Langhantel", name: "Bench Press" },
  { category: "Langhantel", name: "Strict Press" },
  { category: "Langhantel", name: "Push Press" },
  { category: "Langhantel", name: "Push Jerk" },
  { category: "Langhantel", name: "Split Jerk" },
  { category: "Langhantel", name: "Thruster" },

  // Olympic Lifts
  { category: "Olympic Lifts", name: "Power Snatch" },
  { category: "Olympic Lifts", name: "Squat Snatch" },
  { category: "Olympic Lifts", name: "Power Clean" },
  { category: "Olympic Lifts", name: "Squat Clean" },
  { category: "Olympic Lifts", name: "Clean & Jerk" },

  // Gymnastics – Pull
  { category: "Gymnastics – Pull", name: "Strict Pull-Up" },
  { category: "Gymnastics – Pull", name: "Kipping Pull-Up" },
  { category: "Gymnastics – Pull", name: "Butterfly Pull-Up" },
  { category: "Gymnastics – Pull", name: "Chest-to-Bar Pull-Up" },
  { category: "Gymnastics – Pull", name: "Bar Muscle-Up" },
  { category: "Gymnastics – Pull", name: "Ring Muscle-Up" },
  { category: "Gymnastics – Pull", name: "Rope Climb" },

  // Gymnastics – Push
  { category: "Gymnastics – Push", name: "Handstand Push-Up" },
  { category: "Gymnastics – Push", name: "Handstand Walk" },
  { category: "Gymnastics – Push", name: "Ring Dip" },
  { category: "Gymnastics – Push", name: "Wall Walks" },
  { category: "Gymnastics – Push", name: "Push Ups" },

  // Gymnastics – Core
  { category: "Gymnastics – Core", name: "Toes-to-Bar" },
  { category: "Gymnastics – Core", name: "Knees-to-Elbows" },
  { category: "Gymnastics – Core", name: "GHD Sit-Up" },
  { category: "Gymnastics – Core", name: "V-Ups" },
  { category: "Gymnastics – Core", name: "Hollow Rock" },
  { category: "Gymnastics – Core", name: "L-Sit" },
  { category: "Gymnastics – Core", name: "Plank" },
  { category: "Gymnastics – Core", name: "Sit Ups" },

  // Lower Body
  { category: "Lower Body", name: "Pistol Squat" },
  { category: "Lower Body", name: "Lunges" },
  { category: "Lower Body", name: "Overhead Lunges" },
  { category: "Lower Body", name: "Box Step-Ups" },
  { category: "Lower Body", name: "Bulgarian Split Squat" },
  { category: "Lower Body", name: "Air Squats" },

  // Cardio
  { category: "Cardio", name: "Run" },
  { category: "Cardio", name: "Row" },
  { category: "Cardio", name: "SkiErg" },
  { category: "Cardio", name: "BikeErg" },
  { category: "Cardio", name: "Assault Bike" },
  { category: "Cardio", name: "Double Unders" },
  { category: "Cardio", name: "Single Unders" },
  { category: "Cardio", name: "Box Jump" },
  { category: "Cardio", name: "Box Jump Over" },
  { category: "Cardio", name: "Burpee" },
  { category: "Cardio", name: "Burpee Box Jump Over" },
  { category: "Cardio", name: "Burpee Box Jump Overs" },

  // Dumbbell Movements
  { category: "Dumbbell Movements", name: "DB Snatch" },
  { category: "Dumbbell Movements", name: "DB Clean" },
  { category: "Dumbbell Movements", name: "DB Clean & Jerk" },
  { category: "Dumbbell Movements", name: "DB Thruster" },
  { category: "Dumbbell Movements", name: "DB Push Press" },
  { category: "Dumbbell Movements", name: "DB Lunges" },
  { category: "Dumbbell Movements", name: "DB Bench Press" },
  { category: "Dumbbell Movements", name: "DB Row" },
  { category: "Dumbbell Movements", name: "DB Devil Press" },
  { category: "Dumbbell Movements", name: "DB Overhead Squat" },

  // Kettlebell Movements
  { category: "Kettlebell Movements", name: "KB Swing" },
  { category: "Kettlebell Movements", name: "KB Snatch" },
  { category: "Kettlebell Movements", name: "KB Clean & Jerk" },
  { category: "Kettlebell Movements", name: "KB Goblet Squat" },
  { category: "Kettlebell Movements", name: "KB Lunges" },
  { category: "Kettlebell Movements", name: "KB Turkish Get-Up" },

  // Weitere
  { category: "Weitere", name: "Wall Ball" },
  { category: "Weitere", name: "Sandbag Clean" },
  { category: "Weitere", name: "Sandbag Carry" },
  { category: "Weitere", name: "Farmer's Carry" },
  { category: "Weitere", name: "Sled Push" },
  { category: "Weitere", name: "Sled Pull" },
  { category: "Weitere", name: "D-Ball Over Shoulder" }
]

interface WorkoutCreationFormProps {
  userNickname: string
  onBack: () => void
  onWorkoutCreated: () => void
}

export const WorkoutCreationForm = ({ userNickname, onBack, onWorkoutCreated }: WorkoutCreationFormProps) => {
  const [workoutType, setWorkoutType] = useState<"WOD" | "Weightlifting">("WOD")
  const [title, setTitle] = useState("")
  const [workoutContent, setWorkoutContent] = useState("")
  const [notes, setNotes] = useState("")
  const [scalingBeginner, setScalingBeginner] = useState("")
  const [scalingScaled, setScalingScaled] = useState("")
  const [scalingRx, setScalingRx] = useState("")
  const [selectedExercises, setSelectedExercises] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  

  const groupedExercises = EXERCISES.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = []
    }
    acc[exercise.category].push(exercise)
    return acc
  }, {} as Record<string, typeof EXERCISES>)

  const toggleExercise = (exerciseName: string) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseName)
        ? prev.filter(e => e !== exerciseName)
        : [...prev, exerciseName]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !workoutContent.trim()) {
      toast.error("Bitte fülle mindestens Titel und Workout aus.")
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('crossfit_workouts')
        .insert({
          title: title.trim(),
          workout_type: workoutType,
          author_nickname: userNickname,
          workout_content: workoutContent.trim(),
          notes: notes.trim() || null,
          scaling_beginner: scalingBeginner.trim() || null,
          scaling_scaled: scalingScaled.trim() || null,
          scaling_rx: scalingRx.trim() || null,
          required_exercises: selectedExercises
        })

      if (error) throw error

      toast.success("Workout erfolgreich erstellt!")
      onWorkoutCreated()
    } catch (error) {
      console.error('Error creating workout:', error)
      toast.error("Fehler beim Erstellen des Workouts.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Neues WOD erstellen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Workout Type */}
            <div>
              <Label>Workout Type</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={workoutType === "WOD" ? "default" : "outline"}
                  onClick={() => setWorkoutType("WOD")}
                >
                  WOD
                </Button>
                <Button
                  type="button"
                  variant={workoutType === "Weightlifting" ? "default" : "outline"}
                  onClick={() => setWorkoutType("Weightlifting")}
                >
                  Weightlifting
                </Button>
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Fran, Grace, Deadlift 5RM..."
              />
            </div>

            {/* Author (readonly) */}
            <div>
              <Label>Autor</Label>
              <Input value={userNickname} disabled />
            </div>

            {/* Workout Content */}
            <div>
              <Label htmlFor="workout">Workout</Label>
              <Textarea
                id="workout"
                value={workoutContent}
                onChange={(e) => setWorkoutContent(e.target.value)}
                placeholder="Beschreibe das Workout..."
                rows={6}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Zusätzliche Hinweise..."
                rows={3}
              />
            </div>

            {/* Scaling Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="beginner">Beginner</Label>
                <Textarea
                  id="beginner"
                  value={scalingBeginner}
                  onChange={(e) => setScalingBeginner(e.target.value)}
                  placeholder="Beginner Scaling..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="scaled">Scaled</Label>
                <Textarea
                  id="scaled"
                  value={scalingScaled}
                  onChange={(e) => setScalingScaled(e.target.value)}
                  placeholder="Scaled Scaling..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="rx">RX</Label>
                <Textarea
                  id="rx"
                  value={scalingRx}
                  onChange={(e) => setScalingRx(e.target.value)}
                  placeholder="RX Scaling..."
                  rows={4}
                />
              </div>
            </div>

            {/* Exercise Selection */}
            <div>
              <Label>Verwendete Übungen</Label>
              <div className="mt-2 space-y-4">
                {Object.entries(groupedExercises).map(([category, exercises]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {exercises.map((exercise) => (
                        <Badge
                          key={exercise.name}
                          variant={selectedExercises.includes(exercise.name) ? "default" : "secondary"}
                          className="cursor-pointer hover:bg-primary/20"
                          onClick={() => toggleExercise(exercise.name)}
                        >
                          {exercise.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                <Plus className="h-4 w-4 mr-2" />
                {isSubmitting ? "Erstelle..." : "Workout erstellen"}
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                Abbrechen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}