import { TrainingPathNode } from "./TrainingPathNode"
import { TrainingSessionDialog } from "./TrainingSessionDialog"
import { DayCourseDialog } from "./DayCourseDialog"
import { MonthlyTrainingCalendar } from "./MonthlyTrainingCalendar"
import { NewsSection } from "./NewsSection"
import { WhatsAppButton } from "./WhatsAppButton"
import { GymCodeDisplay } from "./GymCodeDisplay"
import { CreditsCounter } from "./CreditsCounter"
import { Button } from "@/components/ui/button"
import { Newspaper } from "lucide-react"
import { useNewsNotification } from "@/hooks/useNewsNotification"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"

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
  isRegisteredForCourse?: boolean
}

interface TrainingPathProps {
  trainingDays: TrainingDay[]
  onAddTraining: (dayNumber: number, type: 'course' | 'free_training' | 'plan') => void
  onRemoveTraining: (dayNumber: number) => void
  user: any
  userRole?: string
}

export const TrainingPath: React.FC<TrainingPathProps> = ({ 
  trainingDays, 
  onAddTraining, 
  onRemoveTraining,
  user,
  userRole
}) => {
  const [selectedDay, setSelectedDay] = useState<TrainingDay | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [showDayCourses, setShowDayCourses] = useState(false)
  const [userMembershipType, setUserMembershipType] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  const { hasUnreadNews, markNewsAsRead } = useNewsNotification(user)
  const navigate = useNavigate()

  // Auto-scroll to today on mount and when trainingDays change
  useEffect(() => {
    const scrollToToday = () => {
      const todayElement = todayRef.current
      const container = containerRef.current
      
      if (!todayElement || !container) {
        return
      }

      // Use scrollIntoView for more reliable scrolling
      todayElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    }

    // Enhanced scroll logic with multiple attempts and better timing
    if (trainingDays.length > 0) {
      // Immediate attempt
      const immediateTimer = setTimeout(scrollToToday, 50)
      
      // After DOM update
      const domTimer = setTimeout(scrollToToday, 200)
      
      // After layout calculations
      const layoutTimer = setTimeout(scrollToToday, 500)
      
      // Final fallback with longer delay
      const fallbackTimer = setTimeout(scrollToToday, 1000)

      // Use ResizeObserver to handle dynamic content sizing
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(scrollToToday, 100)
      })

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current)
      }

      // Cleanup function
      return () => {
        clearTimeout(immediateTimer)
        clearTimeout(domTimer)
        clearTimeout(layoutTimer)
        clearTimeout(fallbackTimer)
        resizeObserver.disconnect()
      }
    }
  }, [trainingDays])

  // Additional effect to scroll when component first mounts
  useEffect(() => {
    const scrollToTodayOnMount = () => {
      const todayElement = todayRef.current
      
      if (todayElement) {
        todayElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        })
      }
    }

    // Scroll when the component first loads and today element is available
    const mountTimer = setTimeout(scrollToTodayOnMount, 100)
    
    return () => clearTimeout(mountTimer)
  }, [])

  // Load user membership type
  useEffect(() => {
    const loadUserMembershipType = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('membership_type')
          .eq('user_id', user.id)
          .single()

        setUserMembershipType(profile?.membership_type || null)
      } catch (error) {
        console.error('Error loading user membership type:', error)
      }
    }

    loadUserMembershipType()
  }, [user.id])

  const currentMonth = new Date().toLocaleDateString('de-DE', { 
    month: 'long', 
    year: 'numeric' 
  })

  const handleDayClick = (day: TrainingDay) => {
    // Vergangene Tage können nicht angeklickt werden
    if (!day.isToday && !day.isFuture) {
      return
    }
    
    setSelectedDay(day)
    
    if (userRole === 'open_gym') {
      setShowDialog(true)
    } else {
      setShowDayCourses(true)
    }
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
    if (day.trainingSession) return 'completed'
    if (day.isToday) return 'current'
    if (day.isFuture) return 'locked' // Zukünftige Tage sind grau
    return 'pending'
  }


  return (
    <div className="flex-1 flex flex-col relative">
      {/* Fixierte Überschrift */}
      <div className="text-center p-4 bg-background">
        <h2 className="text-xl font-bold text-foreground">
          {currentMonth}
        </h2>
      </div>

      {/* Scrollbarer Trainingsbereich */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/20">
        <div className="flex flex-col items-center py-8 pb-24 max-w-md mx-auto">
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
                isRegisteredForCourse={day.isRegisteredForCourse || false}
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
        <MonthlyTrainingCalendar user={user} userRole={userRole} />
      </div>

      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-3">
         <Button
           variant="outline"
           size="icon"
           onClick={() => {
             navigate('/news')
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
        
        {userMembershipType === '10er Karte' ? (
          <CreditsCounter user={user} />
        ) : (
          <GymCodeDisplay />
        )}
        
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
        userMembershipType={userMembershipType}
      />

      {/* Dialog für Tages-Kurse */}
      <DayCourseDialog
        open={showDayCourses}
        onOpenChange={setShowDayCourses}
        date={selectedDay ? `${selectedDay.date.getFullYear()}-${String(selectedDay.date.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.date.getDate()).padStart(2, '0')}` : ''}
        user={user}
        userRole={userRole}
      />

    </div>
  )
}