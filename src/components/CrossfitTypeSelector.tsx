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
            "bg-gray-100 dark:bg-gray-800 rounded-2xl h-32 shadow-sm p-6 cursor-pointer transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-[1.02]",
            selectedType === type 
              ? "bg-primary/10 dark:bg-primary/20 border-2 border-primary" 
              : ""
          )}
          onClick={() => onTypeSelect(type)}
        >
          <div className="text-center space-y-3">
            <h4 className="text-xl font-bold">{title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}