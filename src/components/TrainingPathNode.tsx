import { CheckCircle, Play, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TrainingSessionStatus = 'completed' | 'current' | 'pending' | 'locked'

interface TrainingPathNodeProps {
  id: string
  date: string
  status: TrainingSessionStatus
  workoutType?: 'course' | 'free_training' | 'plan'
  dayNumber: number
  onSelectWorkout?: (id: string) => void
}

export const TrainingPathNode: React.FC<TrainingPathNodeProps> = ({
  id,
  date,
  status,
  workoutType,
  dayNumber,
  onSelectWorkout
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'current':
        return <Play className="h-8 w-8 text-primary" />
      case 'locked':
      case 'pending':
        return <Lock className="h-8 w-8 text-muted-foreground" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-500 hover:bg-green-200 text-green-700'
      case 'current':
        return 'bg-primary/10 border-primary hover:bg-primary/20 text-primary'
      case 'pending':
        return 'bg-red-50 border-red-200 hover:bg-red-100 text-red-600'
      case 'locked':
        return 'bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed'
    }
  }

  const isClickable = status === 'current'

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="outline"
        size="lg"
        disabled={!isClickable}
        onClick={() => isClickable && onSelectWorkout?.(id)}
        className={cn(
          "h-20 w-20 rounded-full border-2 transition-all duration-200",
          getStatusColor(),
          isClickable && "cursor-pointer transform hover:scale-105"
        )}
      >
        <div className="flex flex-col items-center gap-1">
          {getStatusIcon()}
          <span className="text-xs font-medium">{dayNumber}</span>
        </div>
      </Button>
      
      <div className="text-center">
        <div className="text-xs text-muted-foreground">{date}</div>
        {status === 'current' && (
          <div className="text-xs text-primary font-medium mt-1">
            {workoutType === 'course' ? 'Kurs' : 
             workoutType === 'free_training' ? 'Frei' : 'Plan'}
          </div>
        )}
      </div>
    </div>
  )
}