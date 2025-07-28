import { TrainingPathNode } from "./TrainingPathNode"
import { TrainingSessionDialog } from "./TrainingSessionDialog"
import { useState, useEffect, useRef } from "react"

interface TrainingDay {
  date: Date
  dayNumber: number
  isToday: boolean
  isFuture: boolean
  isPast: boolean
  trainingSession?: {
    type: 'course' | 'free_training' | 'plan'
    id: string
  }
}

interface TrainingPathProps {
  trainingDays: TrainingDay[]
  onAddTraining: (dayNumber: number, type: 'course' | 'free_training' | 'plan') => void
  onRemoveTraining: (dayNumber: number) => void
}

export const TrainingPath: React.FC<TrainingPathProps> = ({
  trainingDays,
  onAddTraining,
  onRemoveTraining
}) => {
  const [selectedDay, setSelectedDay] = useState<TrainingDay | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to today on mount
  useEffect(() => {
    if (todayRef.current && containerRef.current) {
      const container = containerRef.current
      const todayElement = todayRef.current
      
      // Calculate scroll position to center today's element
      const containerHeight = container.clientHeight
      const elementTop = todayElement.offsetTop
      const elementHeight = todayElement.clientHeight
      
      const scrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2)
      
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      })
    }
  }, [trainingDays])

  const handleDayClick = (day: TrainingDay) => {
    if (day.isFuture) return // Zukünftige Tage nicht klickbar
    
    setSelectedDay(day)
    setDialogOpen(true)
  }

  const handleSelectType = (type: 'course' | 'free_training' | 'plan' | 'remove') => {
    if (!selectedDay) return
    
    if (type === 'remove') {
      onRemoveTraining(selectedDay.dayNumber)
    } else {
      onAddTraining(selectedDay.dayNumber, type)
    }
  }

  const getNodeStatus = (day: TrainingDay) => {
    if (day.isFuture) return 'locked'
    if (day.trainingSession) return 'completed'
    if (day.isToday) return 'current'
    return 'pending'
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/20">
      {/* Vertikaler Pfad */}
      <div className="flex flex-col items-center py-8 max-w-md mx-auto">
        {trainingDays.map((day, index) => (
          <div 
            key={day.dayNumber} 
            className="flex flex-col items-center"
            ref={day.isToday ? todayRef : null}
          >
            <TrainingPathNode
              id={day.dayNumber.toString()}
              date={day.date.toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: 'short' 
              })}
              status={getNodeStatus(day)}
              workoutType={day.trainingSession?.type}
              dayNumber={day.dayNumber}
              onSelectWorkout={() => handleDayClick(day)}
            />
            
            {/* Verbindungslinie zum nächsten Tag */}
            {index < trainingDays.length - 1 && (
              <div className="w-1 h-12 bg-border my-2" />
            )}
          </div>
        ))}
      </div>

      {/* Dialog für Training-Auswahl */}
      <TrainingSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDay ? selectedDay.date.toLocaleDateString('de-DE', { 
          day: '2-digit', 
          month: 'short' 
        }) : ''}
        dayNumber={selectedDay?.dayNumber || 0}
        onSelectType={handleSelectType}
        hasExistingSession={!!selectedDay?.trainingSession}
      />
    </div>
  )
}