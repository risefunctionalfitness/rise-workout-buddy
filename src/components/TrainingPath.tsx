import { TrainingPathNode } from "./TrainingPathNode"
import { TrainingSessionDialog } from "./TrainingSessionDialog"
import { useState } from "react"

interface CalendarDay {
  date: Date
  dayNumber: number
  isToday: boolean
  isFuture: boolean
  trainingSession?: {
    type: 'course' | 'free_training' | 'plan'
    id: string
  }
}

interface TrainingPathProps {
  calendarDays: CalendarDay[]
  onAddTraining: (dayNumber: number, type: 'course' | 'free_training' | 'plan') => void
  onRemoveTraining: (dayNumber: number) => void
}

export const TrainingPath: React.FC<TrainingPathProps> = ({
  calendarDays,
  onAddTraining,
  onRemoveTraining
}) => {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleDayClick = (day: CalendarDay) => {
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

  const getNodeStatus = (day: CalendarDay) => {
    if (day.isFuture) return 'locked'
    if (day.trainingSession) return 'completed'
    if (day.isToday) return 'current'
    return 'pending'
  }

  return (
    <div className="flex-1 flex flex-col p-6 bg-gradient-to-b from-background to-muted/20">
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-3 max-w-2xl mx-auto">
        {/* Wochentage Header */}
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        
        {/* Kalendertage */}
        {calendarDays.map((day) => (
          <div key={day.dayNumber} className="flex justify-center">
            <TrainingPathNode
              id={day.dayNumber.toString()}
              date={day.date.getDate().toString()}
              status={getNodeStatus(day)}
              workoutType={day.trainingSession?.type}
              dayNumber={day.dayNumber}
              onSelectWorkout={() => handleDayClick(day)}
            />
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