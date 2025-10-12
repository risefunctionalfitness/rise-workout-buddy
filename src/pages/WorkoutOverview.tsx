import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Dumbbell, Target, Clock, Calculator } from "lucide-react"

const WorkoutOverview = () => {
  const navigate = useNavigate()

  const workoutOptions = [
    {
      title: "Functional Fitness",
      description: "Hochintensive, funktionale Workouts und Gewichtheben",
      icon: Dumbbell,
      onClick: () => navigate('/pro/exercises')
    },
    {
      title: "Bodybuilding",
      description: "Gezielter Muskelaufbau und Kraftsteigerung",
      icon: Target,
      onClick: () => navigate('/admin/workouts')
    },
    {
      title: "Workout-Timer",
      description: "Timer für deine Workouts",
      icon: Clock,
      onClick: () => navigate('/workout-timer')
    },
    {
      title: "Percentage Calculator",
      description: "Berechne deine Trainingsgewichte",
      icon: Calculator,
      onClick: () => navigate('/pro/percentage-calculator')
    }
  ]

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Workout</h1>
        
        <div className="space-y-4">
          {workoutOptions.map((option) => {
            const Icon = option.icon
            return (
              <Card 
                key={option.title}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={option.onClick}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold mb-1">{option.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WorkoutOverview