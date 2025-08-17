import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Dumbbell, Zap, Timer } from "lucide-react"
import { useNavigate } from "react-router-dom"

export type WorkoutType = "crossfit" | "bodybuilding" | null

interface WorkoutTypeSelectorProps {
  selectedType: WorkoutType
  onTypeSelect: (type: WorkoutType) => void
}

export const WorkoutTypeSelector = ({ selectedType, onTypeSelect }: WorkoutTypeSelectorProps) => {
  const navigate = useNavigate()

  const handleTimerClick = () => {
    // Store current page as referrer for better back navigation
    sessionStorage.setItem('timer-referrer', window.location.pathname)
    navigate('/workout-timer')
  }

  return (
    <div className="space-y-4 px-4">
      <Card 
        className={cn(
          "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg rounded-3xl border-rise-accent h-32",
          selectedType === "crossfit" 
            ? "bg-rise-accent/5 border-rise-accent shadow-md" 
            : "hover:border-rise-accent"
        )}
        onClick={() => onTypeSelect("crossfit")}
      >
        <div className="text-center space-y-3 flex flex-col justify-center h-full">
          <h3 className="text-xl font-bold">Functional Fitness</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hochintensive,<br />
            funktionelle Workouts<br />
            und Gewichtheben
          </p>
        </div>
      </Card>

      <Card 
        className={cn(
          "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg rounded-3xl border-rise-accent h-32",
          selectedType === "bodybuilding" 
            ? "bg-rise-accent/5 border-rise-accent shadow-md" 
            : "hover:border-rise-accent"
        )}
        onClick={() => onTypeSelect("bodybuilding")}
      >
        <div className="text-center space-y-3 flex flex-col justify-center h-full">
          <h3 className="text-xl font-bold">Bodybuilding</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Gezielter Muskelaufbau<br />
            und Kraftsteigerung
          </p>
        </div>
      </Card>

      <Card 
        className="p-4 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg rounded-3xl border-muted-foreground/20 hover:border-muted-foreground/40 h-20 bg-muted/20"
        onClick={handleTimerClick}
      >
        <div className="text-center flex flex-col justify-center h-full">
          <h3 className="text-xl font-bold text-muted-foreground">Workout- Timer</h3>
        </div>
      </Card>
    </div>
  )
}