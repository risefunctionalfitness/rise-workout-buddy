import { TrainingPathNode } from "./TrainingPathNode"
import { TrainingSessionDialog } from "./TrainingSessionDialog"
import { MonthlyTrainingCalendar } from "./MonthlyTrainingCalendar"
import { NewsSection } from "./NewsSection"
import { WhatsAppButton } from "./WhatsAppButton"
import { GymCodeDisplay } from "./GymCodeDisplay"
import { Button } from "@/components/ui/button"
import { Newspaper } from "lucide-react"
import { useNewsNotification } from "@/hooks/useNewsNotification"
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
  const { hasUnreadNews, markNewsAsRead } = useNewsNotification(user)

  // Auto-scroll to today on mount and when trainingDays change
  useEffect(() => {
    const scrollToToday = () => {
      const todayElement = todayRef.current
      const container = containerRef.current
      
      if (!todayElement || !container) {
        return
      }

      // Einfache Scroll-Logik: Scroll das Element in die Mitte des Containers
      const elementOffsetTop = todayElement.offsetTop
      const containerHeight = container.clientHeight
      const elementHeight = todayElement.offsetHeight
      
      const targetScrollTop = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2)
      
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      })
    }

    // Mehrere Versuche mit zunehmender Verzögerung
    if (trainingDays.length > 0) {
      // Sofort versuchen
      setTimeout(scrollToToday, 100)
      // Nach DOM-Update
      setTimeout(scrollToToday, 300)
      // Fallback
      setTimeout(scrollToToday, 800)
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
        
        {/* Button-Stack auch in News-Ansicht ÜBER der Navigation */}
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-3">
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

      {/* Rechts unten: Button-Stack - fixiert ÜBER der Navigation */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-3">
        {/* Aktuelles Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setShowNews(true)
            markNewsAsRead()
          }}
          className="rounded-full w-14 h-14 border-2 border-foreground/20 bg-background/90 backdrop-blur-sm hover:bg-foreground/10 shadow-lg relative"
          aria-label="Aktuelles anzeigen"
        >
          <Newspaper className="h-4 w-4" />
          {hasUnreadNews && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              1
            </div>
          )}
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