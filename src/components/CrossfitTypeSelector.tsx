import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Target, Trophy } from "lucide-react"

export type CrossfitType = "WOD" | "Weightlifting" | null

interface CrossfitTypeSelectorProps {
  selectedType: CrossfitType
  onTypeSelect: (type: CrossfitType) => void
}

export const CrossfitTypeSelector = ({ selectedType, onTypeSelect }: CrossfitTypeSelectorProps) => {
  const types = [
    {
      type: "WOD" as const,
      title: "WOD",
      description: "Funktionelles\nGanzkörperworkout"
    },
    {
      type: "Weightlifting" as const,
      title: "Weightlifting",
      description: "Olympisches\nGewichtheben"
    }
  ]

  return (
    <div className="space-y-4 px-4">
      {types.map(({ type, title, description }) => (
        <Card 
          key={type}
          className={cn(
            "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg rounded-3xl",
            selectedType === type 
              ? "border-primary bg-primary/5 shadow-md" 
              : "border-primary hover:border-primary"
          )}
          onClick={() => onTypeSelect(type)}
        >
          <div className="text-center space-y-3">
            <h4 className="text-2xl font-bold">{title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}