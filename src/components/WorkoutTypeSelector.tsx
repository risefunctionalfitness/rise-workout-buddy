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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card 
        className={cn(
          "p-8 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg",
          selectedType === "crossfit" 
            ? "border-primary bg-primary/5 shadow-md" 
            : "border-border hover:border-primary/50"
        )}
        onClick={() => onTypeSelect("crossfit")}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={cn(
            "p-4 rounded-full transition-colors",
            selectedType === "crossfit" ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <Zap className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold">CrossFit</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Hochintensive, funktionelle Workouts für maximale Fitness
            </p>
          </div>
        </div>
      </Card>

      <Card 
        className={cn(
          "p-8 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg",
          selectedType === "bodybuilding" 
            ? "border-primary bg-primary/5 shadow-md" 
            : "border-border hover:border-primary/50"
        )}
        onClick={() => onTypeSelect("bodybuilding")}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={cn(
            "p-4 rounded-full transition-colors",
            selectedType === "bodybuilding" ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <Dumbbell className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Bodybuilding</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Gezielter Muskelaufbau und Kraftsteigerung
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}