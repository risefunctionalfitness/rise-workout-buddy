import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RiseHeader } from "./RiseHeader"
import { WorkoutTypeSelector, WorkoutType } from "./WorkoutTypeSelector"
import { CrossfitTypeSelector, CrossfitType } from "./CrossfitTypeSelector"
import { BodybuildingSelector, BodybuildingFocus, BodybuildingDifficulty } from "./BodybuildingSelector"
import { WorkoutDisplay } from "./WorkoutDisplay"
import { WorkoutCreationForm } from "./WorkoutCreationForm"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"
import { Plus, Dumbbell } from "lucide-react"

interface WorkoutGeneratorProps {
  user?: User | null
}

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
  required_exercises?: string[]
}

interface BodybuildingWorkout {
  id: string
  title: string
  focus_area: string
  difficulty: string
  workout_content: string
  notes?: string
}

export const WorkoutGenerator = ({ user }: WorkoutGeneratorProps) => {
  const [workoutType, setWorkoutType] = useState<WorkoutType>(null)
  const [crossfitType, setCrossfitType] = useState<CrossfitType>(null)
  const [bodybuilding, setBodybuilding] = useState<{
    focus: BodybuildingFocus
    difficulty: BodybuildingDifficulty
  }>({ focus: null, difficulty: null })
  
  const [generatedWorkout, setGeneratedWorkout] = useState<CrossfitWorkout | BodybuildingWorkout | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCreationForm, setShowCreationForm] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    if (user) {
      loadUserProfile()
    }
  }, [user])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const generateWorkout = async () => {
    setIsGenerating(true)

    try {
      if (workoutType === "crossfit" && crossfitType) {
        await generateCrossfitWorkout()
      } else if (workoutType === "bodybuilding" && bodybuilding.focus && bodybuilding.difficulty) {
        await generateBodybuildingWorkout()
      }
    } catch (error) {
      console.error('Error generating workout:', error)
      toast.error("Fehler beim Generieren des Workouts")
    } finally {
      setIsGenerating(false)
    }
  }

  const generateCrossfitWorkout = async () => {
    if (!crossfitType) return

    try {
      let query = supabase
        .from('crossfit_workouts')
        .select('*')
        .eq('workout_type', crossfitType)

      // Filter by user's preferred exercises if it's a WOD
      if (crossfitType === "WOD" && userProfile?.preferred_exercises && userProfile.preferred_exercises.length > 0) {
        // Only get workouts that use exercises the user has selected
        query = query.overlaps('required_exercises', userProfile.preferred_exercises)
      }

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error("Keine passenden Workouts gefunden.")
        return
      }

      // Select random workout
      const randomWorkout = data[Math.floor(Math.random() * data.length)]
      // Convert the database result to our interface
      const convertedWorkout: CrossfitWorkout = {
        ...randomWorkout,
        required_exercises: Array.isArray(randomWorkout.required_exercises) 
          ? randomWorkout.required_exercises.filter((ex): ex is string => typeof ex === 'string')
          : []
      }
      setGeneratedWorkout(convertedWorkout)
    } catch (error) {
      throw error
    }
  }

  const generateBodybuildingWorkout = async () => {
    if (!bodybuilding.focus || !bodybuilding.difficulty) return

    try {
      const { data, error } = await supabase
        .from('bodybuilding_workouts')
        .select('*')
        .eq('focus_area', bodybuilding.focus)
        .eq('difficulty', bodybuilding.difficulty)

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error("Keine passenden Workouts gefunden.")
        return
      }

      // Select random workout
      const randomWorkout = data[Math.floor(Math.random() * data.length)]
      setGeneratedWorkout(randomWorkout as BodybuildingWorkout)
    } catch (error) {
      throw error
    }
  }

  const newWorkout = () => {
    if (workoutType === "crossfit" && crossfitType) {
      generateCrossfitWorkout()
    } else if (workoutType === "bodybuilding" && bodybuilding.focus && bodybuilding.difficulty) {
      generateBodybuildingWorkout()
    }
  }

  const resetSelection = () => {
    setWorkoutType(null)
    setCrossfitType(null)
    setBodybuilding({ focus: null, difficulty: null })
    setGeneratedWorkout(null)
    setShowCreationForm(false)
  }

  const canGenerate = () => {
    if (workoutType === "crossfit") {
      return crossfitType !== null
    }
    if (workoutType === "bodybuilding") {
      return bodybuilding.focus !== null && bodybuilding.difficulty !== null
    }
    return false
  }

  const isAuthor = userProfile?.authors === true

  // Show creation form
  if (showCreationForm && isAuthor) {
    return (
      <WorkoutCreationForm 
        userNickname={userProfile?.nickname || 'Unbekannt'}
        onBack={() => setShowCreationForm(false)}
        onWorkoutCreated={() => {
          setShowCreationForm(false)
          toast.success("Workout erfolgreich erstellt!")
        }}
      />
    )
  }

  // Show workout display
  if (generatedWorkout) {
    return (
      <WorkoutDisplay 
        workout={generatedWorkout}
        workoutType={workoutType!}
        onNewWorkout={newWorkout}
        onReset={resetSelection}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <RiseHeader />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Dumbbell className="h-8 w-8 text-primary" />
              Workout Generator
            </CardTitle>
            {isAuthor && (
              <Button 
                onClick={() => setShowCreationForm(true)}
                className="mx-auto mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neues WOD hinzufügen
              </Button>
            )}
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Workout Type Selection */}
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Training wählen</h3>
              <WorkoutTypeSelector 
                selectedType={workoutType}
                onTypeSelect={setWorkoutType}
              />
            </div>

            {/* CrossFit Type Selection */}
            {workoutType === "crossfit" && (
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4">CrossFit Art wählen</h3>
                <CrossfitTypeSelector
                  selectedType={crossfitType}
                  onTypeSelect={setCrossfitType}
                />
              </div>
            )}

            {/* Bodybuilding Selection */}
            {workoutType === "bodybuilding" && (
              <div className="text-center">
                <BodybuildingSelector
                  selectedFocus={bodybuilding.focus}
                  selectedDifficulty={bodybuilding.difficulty}
                  onFocusSelect={(focus) => setBodybuilding(prev => ({ ...prev, focus }))}
                  onDifficultySelect={(difficulty) => setBodybuilding(prev => ({ ...prev, difficulty }))}
                />
              </div>
            )}

            {/* Generate Button */}
            {canGenerate() && (
              <div className="text-center">
                <Button 
                  onClick={generateWorkout}
                  disabled={isGenerating}
                  size="lg"
                  className="px-8"
                >
                  {isGenerating ? "Generiere..." : "Workout generieren"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}