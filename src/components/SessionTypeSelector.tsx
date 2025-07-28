import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Target, Zap } from "lucide-react"

type SessionType = "wod_only" | "full_session" | null

interface SessionTypeSelectorProps {
  selectedType: SessionType
  onTypeSelect: (type: SessionType) => void
}

export const SessionTypeSelector = ({ selectedType, onTypeSelect }: SessionTypeSelectorProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card 
        className={cn(
          "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg",
          selectedType === "wod_only" 
            ? "border-primary bg-primary/5 shadow-md" 
            : "border-border hover:border-primary/50"
        )}
        onClick={() => onTypeSelect("wod_only")}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className={cn(
            "p-3 rounded-full transition-colors",
            selectedType === "wod_only" ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-lg font-semibold">WOD Only</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Nur Conditioning-Teil
            </p>
          </div>
        </div>
      </Card>

      <Card 
        className={cn(
          "p-6 cursor-pointer transition-all duration-300 border-2 hover:shadow-lg",
          selectedType === "full_session" 
            ? "border-primary bg-primary/5 shadow-md" 
            : "border-border hover:border-primary/50"
        )}
        onClick={() => onTypeSelect("full_session")}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className={cn(
            "p-3 rounded-full transition-colors",
            selectedType === "full_session" ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-lg font-semibold">Full Session</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Strength + WOD + Zusatz
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}