import { CheckCircle, Play, Lock, Check, X } from "lucide-react"
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
  isRegisteredForCourse?: boolean
  hasCourseToday?: boolean
}

export const TrainingPathNode: React.FC<TrainingPathNodeProps> = ({
  id,
  date,
  status,
  workoutType,
  dayNumber,
  onSelectWorkout,
  isRegisteredForCourse = false,
  hasCourseToday = false
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'current':
        // Wenn für heute ein Kurs registriert ist, zeige grünen Kreis
        if (isRegisteredForCourse) {
          return <CheckCircle className="h-8 w-8 text-green-500" />
        }
        return <Play className="h-8 w-8 text-primary" />
      case 'locked':
        // Kein Schloss mehr - zeige Play-Symbol für klickbare zukünftige Tage
        return <Play className="h-8 w-8 text-primary" />
      case 'pending':
        // Für vergangene Tage: X für nicht besucht
        return <X className="h-8 w-8 text-red-500" />
    }
  }

  const getTopIcon = () => {
    // Icons außerhalb der Kreise entfernt
    return null
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-500 hover:bg-green-200 text-green-700'
      case 'current':
        // Wenn für heute ein Kurs registriert ist, zeige grün
        if (isRegisteredForCourse) {
          return 'bg-green-100 border-green-500 hover:bg-green-200 text-green-700'
        }
        return 'bg-primary/10 border-primary hover:bg-primary/20 text-primary'
      case 'pending':
        return 'bg-red-50 border-red-200 hover:bg-red-100 text-red-600'
      case 'locked':
        // Zukünftige Tage sind grau
        return 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-600 cursor-pointer'
    }
  }

  const isClickable = true // Alle Tage klickbar machen

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        
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
      </div>
      
      <div className="text-center">
        <div className="text-xs text-muted-foreground">{date}</div>
        {(status === 'current' || status === 'completed') && workoutType && (
          <div className="text-xs font-medium mt-1">
            {workoutType === 'course' ? 'Kurs' : 
             workoutType === 'free_training' ? 'Frei' : 'Plan'}
          </div>
        )}
      </div>
    </div>
  )
}