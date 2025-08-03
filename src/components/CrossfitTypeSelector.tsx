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
      icon: Target,
      title: "WOD",
      description: "Workout of the Day"
    },
    {
      type: "Weightlifting" as const,
      icon: Trophy,
      title: "Weightlifting",
      description: "Olympic Weightlifting"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {types.map(({ type, icon: Icon, title, description }) => (
        <Card 
          key={type}
          className={cn(
            "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg",
            selectedType === type 
              ? "border-primary bg-primary/5 shadow-md" 
              : "border-border hover:border-primary/50"
          )}
          onClick={() => onTypeSelect(type)}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={cn(
              "p-3 rounded-full transition-colors",
              selectedType === type ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-lg font-semibold">{title}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}