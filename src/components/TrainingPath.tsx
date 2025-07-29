import { TrainingPathNode } from "./TrainingPathNode"
import { TrainingSessionDialog } from "./TrainingSessionDialog"
import { MonthlyTrainingCalendar } from "./MonthlyTrainingCalendar"
import { NewsSection } from "./NewsSection"
import { WhatsAppButton } from "./WhatsAppButton"
import { GymCodeDisplay } from "./GymCodeDisplay"
import { Button } from "@/components/ui/button"
import { Newspaper } from "lucide-react"
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
  user: any
}

export const TrainingPath: React.FC<TrainingPathProps> = ({ 
  trainingDays, 
  onAddTraining, 
  onRemoveTraining,
  user
}) => {
  const [selectedDay, setSelectedDay] = useState<TrainingDay | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [showNews, setShowNews] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to today on mount
  useEffect(() => {
    if (todayRef.current && containerRef.current) {
      const container = containerRef.current
      const todayElement = todayRef.current
      
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        // Calculate scroll position to center today's element
        const containerHeight = container.clientHeight
        const elementTop = todayElement.offsetTop
        const elementHeight = todayElement.clientHeight
        
        const scrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2)
        
        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth'
        })
      }, 100)
    }
  }, [trainingDays])

  const currentMonth = new Date().toLocaleDateString('de-DE', { 
    month: 'long', 
    year: 'numeric' 
  })

  const handleDayClick = (day: TrainingDay) => {
    if (day.isFuture) return // Zukünftige Tage nicht klickbar
    
    setSelectedDay(day)
    setShowDialog(true)
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

  if (showNews) {
    return (
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            onClick={() => setShowNews(false)}
          >
            ← Zurück
          </Button>
        </div>
        <NewsSection />
        
        {/* Button-Stack auch in News-Ansicht */}
        <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-3">
          <GymCodeDisplay />
          <WhatsAppButton />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Fixierte Überschrift */}
      <div className="text-center p-4 bg-background">
        <h2 className="text-xl font-bold text-foreground">
          Trainingstage {currentMonth}
        </h2>
      </div>

      {/* Scrollbarer Trainingsbereich */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/20">
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
      </div>

      {/* Fixierte Elemente */}
      {/* Links: Monatliche Trainingskalender - fixiert */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-30">
        <MonthlyTrainingCalendar user={user} />
      </div>

      {/* Rechts unten: Button-Stack - fixiert */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-3">
        {/* Aktuelles Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowNews(true)}
          className="rounded-full w-14 h-14 border-2 border-border hover:border-primary"
          aria-label="Aktuelles anzeigen"
        >
          <Newspaper className="h-4 w-4" />
        </Button>
        
        {/* Gym Code Button */}
        <GymCodeDisplay />
        
        {/* WhatsApp Button */}
        <WhatsAppButton />
      </div>

      {/* Dialog für Training-Auswahl */}
      <TrainingSessionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
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