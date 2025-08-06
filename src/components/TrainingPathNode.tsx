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
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'current':
        // Wenn für heute ein Kurs registriert ist, zeige grünes Häkchen
        if (isRegisteredForCourse) {
          return <CheckCircle className="h-8 w-8 text-green-600" />
        }
        return <Play className="h-8 w-8 text-primary" />
      case 'locked':
        // Zukünftige Tage: wenn angemeldet grünes Häkchen, sonst graues Play
        if (isRegisteredForCourse) {
          return <CheckCircle className="h-8 w-8 text-green-600" />
        }
        return <Play className="h-8 w-8 text-gray-600" />
      case 'pending':
        // Für vergangene Tage: X für nicht besucht
        return <X className="h-8 w-8 text-red-600" />
    }
  }

  const getTopIcon = () => {
    // Icons außerhalb der Kreise entfernt
    return null
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        // Vergangene Tage mit Training: intensives grün
        return 'bg-green-200 border-green-600 hover:bg-green-300 text-green-800 dark:bg-green-900/50 dark:border-green-500 dark:text-green-300'
      case 'current':
        // Heute: wenn für Kurs angemeldet intensives grün, sonst primary
        if (isRegisteredForCourse) {
          return 'bg-green-200 border-green-600 hover:bg-green-300 text-green-800 dark:bg-green-900/50 dark:border-green-500 dark:text-green-300'
        }
        return 'bg-primary/10 border-primary hover:bg-primary/20 text-primary'
      case 'pending':
        // Vergangene Tage ohne Training: intensives rot
        return 'bg-red-200 border-red-600 hover:bg-red-300 text-red-800 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300'
      case 'locked':
        // Zukünftige Tage: wenn angemeldet intensives grün, sonst normal grau
        if (isRegisteredForCourse) {
          return 'bg-green-200 border-green-600 hover:bg-green-300 text-green-800 cursor-pointer dark:bg-green-900/50 dark:border-green-500 dark:text-green-300'
        }
        return 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-600 cursor-pointer dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-400'
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