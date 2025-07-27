import { Slider } from "@/components/ui/slider"
import { Clock } from "lucide-react"

type WorkoutType = "crossfit" | "bodybuilding" | null

interface DurationSliderProps {
  workoutType: WorkoutType
  duration: number
  onDurationChange: (duration: number) => void
}

export const DurationSlider = ({ workoutType, duration, onDurationChange }: DurationSliderProps) => {
  if (!workoutType) return null

  const getMinMax = () => {
    if (workoutType === "crossfit") {
      return { min: 10, max: 30, step: 5 }
    }
    return { min: 45, max: 90, step: 15 }
  }

  const { min, max, step } = getMinMax()
  const defaultValue = workoutType === "crossfit" ? 20 : 60

  return (
    <div className="space-y-6 w-full max-w-md mx-auto">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Clock className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold">Trainingsdauer</h3>
        </div>
        <div className="text-3xl font-bold text-primary">
          {duration || defaultValue} Min
        </div>
      </div>
      
      <div className="px-6">
        <Slider
          value={[duration || defaultValue]}
          onValueChange={(value) => onDurationChange(value[0])}
          min={min}
          max={max}
          step={step}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>{min} min</span>
          <span>{max} min</span>
        </div>
      </div>
    </div>
  )
}