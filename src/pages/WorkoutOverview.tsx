import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"

const WorkoutOverview = () => {
  const navigate = useNavigate()

  const workoutOptions = [
    {
      title: "Functional Fitness",
      onClick: () => navigate('/pro/exercises')
    },
    {
      title: "Bodybuilding",
      onClick: () => navigate('/admin/workouts')
    },
    {
      title: "Workout-Timer",
      onClick: () => navigate('/workout-timer')
    },
    {
      title: "Percentage Calculator",
      onClick: () => navigate('/pro/percentage-calculator')
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-2 gap-3 h-[calc(100vh-12rem)]">
        {workoutOptions.map((option) => (
          <Card 
            key={option.title}
            className="cursor-pointer hover:bg-accent/50 transition-colors h-full"
            onClick={option.onClick}
          >
            <CardContent className="h-full p-6 flex items-center justify-center">
              <h3 className="text-xl font-semibold text-center">
                {option.title}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default WorkoutOverview