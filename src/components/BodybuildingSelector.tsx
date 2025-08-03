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

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">Fokus wählen</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {focusOptions.map(({ type, icon: Icon, title, description }) => (
            <Card 
              key={type}
              className={cn(
                "p-4 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg",
                selectedFocus === type 
                  ? "border-primary bg-primary/5 shadow-md" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onFocusSelect(type)}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={cn(
                  "p-2 rounded-full transition-colors",
                  selectedFocus === type ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">{title}</h4>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {selectedFocus && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-center">Schwierigkeit wählen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {difficultyOptions.map(({ type, title, description }) => (
              <Card 
                key={type}
                className={cn(
                  "p-4 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg",
                  selectedDifficulty === type 
                    ? "border-primary bg-primary/5 shadow-md" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => onDifficultySelect(type)}
              >
                <div className="text-center space-y-2">
                  <h4 className="font-semibold">{title}</h4>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}