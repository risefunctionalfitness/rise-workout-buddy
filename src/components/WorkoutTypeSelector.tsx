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
          "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg rounded-3xl",
          selectedType === "crossfit" 
            ? "border-primary bg-primary/5 shadow-md" 
            : "border-primary hover:border-primary"
        )}
        onClick={() => onTypeSelect("crossfit")}
      >
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-bold">CrossFit</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hochintensive,<br />
            funktionelle Workouts<br />
            sowie olympisches<br />
            Gewichtheben
          </p>
        </div>
      </Card>

      <Card 
        className={cn(
          "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg rounded-3xl",
          selectedType === "bodybuilding" 
            ? "border-primary bg-primary/5 shadow-md" 
            : "border-primary hover:border-primary"
        )}
        onClick={() => onTypeSelect("bodybuilding")}
      >
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-bold">Bodybuilding</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Gezielter Muskelaufbau<br />
            und Kraftsteigerung vor<br />
            allem mit Maschinen
          </p>
        </div>
      </Card>
    </div>
  )
}