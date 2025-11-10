import { useState } from "react"
import { WorkoutGenerator } from "@/components/WorkoutGenerator"
import { User } from "@supabase/supabase-js"

interface WorkoutOverviewProps {
  user?: User | null
}

const WorkoutOverview = ({ user }: WorkoutOverviewProps) => {
  const [workoutType, setWorkoutType] = useState<'crossfit' | 'bodybuilding' | null>(null)
  const [step, setStep] = useState(1)

  // If user selected a workout type, show WorkoutGenerator
  if (step > 1 && workoutType) {
    return (
      <WorkoutGenerator 
        user={user}
        initialWorkoutType={workoutType}
        initialStep={2}
        onBack={() => {
          setStep(1)
          setWorkoutType(null)
        }}
      />
    )
  }

  const workoutOptions = [
    {
      title: "Functional Fitness",
      description: "Hochintensive,\nfunktionelle Workouts\nund Gewichtheben",
      onClick: () => {
        setWorkoutType('crossfit')
        setStep(2)
      }
    },
    {
      title: "Bodybuilding",
      description: "Gezielter Muskelaufbau\nund Kraftsteigerung",
      onClick: () => {
        setWorkoutType('bodybuilding')
        setStep(2)
      }
    },
    {
      title: "Workout-Timer",
      description: "Timer für deine Workouts",
      onClick: () => {
        window.location.href = '/workout-timer'
      }
    },
    {
      title: "Rep Counter",
      description: "Zähle Runden und\nWiederholungen",
      onClick: () => {
        window.location.href = '/rep-counter'
      }
    },
    {
      title: "Prozentrechner",
      description: "Berechne deine\nTrainingsgewichte",
      onClick: () => {
        window.location.href = '/pro/percentage-calculator'
      }
    }
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-foreground">Workout</h1>
      </div>

      {/* Vertical Stack of Options */}
      <div className="container mx-auto px-4 space-y-4">
        {workoutOptions.map((option) => (
          <button
            key={option.title}
            onClick={option.onClick}
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 min-h-[120px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-foreground">{option.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default WorkoutOverview