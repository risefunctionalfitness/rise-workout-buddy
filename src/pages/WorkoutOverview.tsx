import { Dumbbell, Target, Clock, Calculator } from "lucide-react"

const WorkoutOverview = () => {
  const handleFunctionalFitnessClick = () => {
    // Store preference for workout type
    sessionStorage.setItem('workout-type', 'crossfit')
    sessionStorage.setItem('show-workout-generator', 'true')
    // Dispatch custom event to switch to WOD tab with crossfit pre-selected
    window.dispatchEvent(new CustomEvent('changeTab', { detail: 'wod' }))
    // Trigger refresh of workout generator
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workout-type-selected', { detail: 'crossfit' }))
    }, 100)
  }

  const handleBodybuildingClick = () => {
    // Store preference for workout type
    sessionStorage.setItem('workout-type', 'bodybuilding')
    sessionStorage.setItem('show-workout-generator', 'true')
    // Dispatch custom event to switch to WOD tab with bodybuilding pre-selected
    window.dispatchEvent(new CustomEvent('changeTab', { detail: 'wod' }))
    // Trigger refresh of workout generator
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workout-type-selected', { detail: 'bodybuilding' }))
    }, 100)
  }

  const workoutOptions = [
    {
      title: "Functional Fitness",
      icon: Dumbbell,
      onClick: handleFunctionalFitnessClick
    },
    {
      title: "Bodybuilding",
      icon: Target,
      onClick: handleBodybuildingClick
    },
    {
      title: "Workout-Timer",
      icon: Clock,
      onClick: () => window.location.href = '/workout-timer'
    },
    {
      title: "Percentage Calculator",
      icon: Calculator,
      onClick: () => window.location.href = '/pro/percentage-calculator'
    }
  ]

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-2 gap-3">
        {workoutOptions.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.title}
              onClick={option.onClick}
              className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 h-32 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all hover:scale-[1.02] w-full"
            >
              {/* Icon */}
              <Icon className="absolute top-4 right-4 h-6 w-6 text-primary" />
              
              {/* Center Content */}
              <div className="flex items-center justify-center h-full">
                <span className="text-lg font-semibold text-foreground text-center">
                  {option.title}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WorkoutOverview