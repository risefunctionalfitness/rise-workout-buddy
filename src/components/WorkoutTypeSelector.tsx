import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Dumbbell, Zap } from "lucide-react"

export type WorkoutType = "crossfit" | "bodybuilding" | null

interface WorkoutTypeSelectorProps {
  selectedType: WorkoutType
  onTypeSelect: (type: WorkoutType) => void
}

export const WorkoutTypeSelector = ({ selectedType, onTypeSelect }: WorkoutTypeSelectorProps) => {
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
    </div>
  )
}