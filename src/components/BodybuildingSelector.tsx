import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Dumbbell, ArrowUp, ArrowDown, User, Zap } from "lucide-react"

export type BodybuildingFocus = "Push" | "Pull" | "Legs" | "Upper" | "Full" | null
export type BodybuildingDifficulty = "Beginner" | "Intermediate" | "Pro" | null

interface BodybuildingSelectorProps {
  selectedFocus: BodybuildingFocus
  selectedDifficulty: BodybuildingDifficulty
  onFocusSelect: (focus: BodybuildingFocus) => void
  onDifficultySelect: (difficulty: BodybuildingDifficulty) => void
}

export const BodybuildingSelector = ({ 
  selectedFocus, 
  selectedDifficulty, 
  onFocusSelect, 
  onDifficultySelect 
}: BodybuildingSelectorProps) => {
  const focusOptions = [
    { type: "Push" as const, icon: ArrowUp, title: "Push", description: "Brust, Schultern, Trizeps" },
    { type: "Pull" as const, icon: ArrowDown, title: "Pull", description: "Rücken, Bizeps" },
    { type: "Legs" as const, icon: Dumbbell, title: "Beine", description: "Quadrizeps, Hamstrings, Glutes" },
    { type: "Upper" as const, icon: User, title: "Oberkörper", description: "Kompletter Oberkörper" },
    { type: "Full" as const, icon: Zap, title: "Ganzkörper", description: "Komplettes Training" }
  ]

  const difficultyOptions = [
    { type: "Beginner" as const, title: "Beginner", description: "Anfänger" },
    { type: "Intermediate" as const, title: "Intermediate", description: "Fortgeschritten" },
    { type: "Pro" as const, title: "Pro", description: "Profi" }
  ]

  // For focus selection step (step 2)
  if (!selectedFocus) {
    return (
      <div className="space-y-4 px-4">
        {focusOptions.map(({ type, title, description }) => (
          <Card 
            key={type}
            className={cn(
              "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg rounded-3xl border-rise-accent",
              selectedFocus === type 
                ? "bg-rise-accent/5 border-rise-accent shadow-md" 
                : "hover:border-rise-accent"
            )}
            onClick={() => onFocusSelect(type)}
          >
            <div className="text-center space-y-3">
              <h4 className="text-xl font-bold">{title}</h4>
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // For difficulty selection step (step 3)
  return (
    <div className="space-y-4 px-4">
      {difficultyOptions.map(({ type, title, description }) => (
        <Card 
          key={type}
          className={cn(
            "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg rounded-3xl border-rise-accent",
            selectedDifficulty === type 
              ? "bg-rise-accent/5 border-rise-accent shadow-md" 
              : "hover:border-rise-accent"
          )}
          onClick={() => onDifficultySelect(type)}
        >
          <div className="text-center space-y-3">
            <h4 className="text-xl font-bold">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}