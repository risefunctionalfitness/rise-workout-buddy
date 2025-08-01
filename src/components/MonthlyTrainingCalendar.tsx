import { useState, useEffect } from "react"
import { User } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"
import { DayCourseDialog } from "./DayCourseDialog"
import { Calendar } from "lucide-react"

interface MonthlyTrainingCalendarProps {
  user: User
  userRole?: string
}

export const MonthlyTrainingCalendar = ({ user, userRole }: MonthlyTrainingCalendarProps) => {
  const [trainingDays, setTrainingDays] = useState<Set<number>>(new Set())
  const [registeredDays, setRegisteredDays] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showCourseDialog, setShowCourseDialog] = useState(false)

  const isOpenGym = userRole === 'open_gym'

  useEffect(() => {
    loadTrainingDays()
  }, [user.id])

  const loadTrainingDays = async () => {
    try {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth()
      
      // Load training sessions
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('date')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lt('date', `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`)

      if (error) {
        console.error('Error loading training days:', error)
        return
      }

      const days = new Set<number>()
      sessions?.forEach(session => {
        const sessionDate = new Date(session.date)
        days.add(sessionDate.getDate())
      })

      // Load course registrations and check for auto-completion
      const { data: registrations, error: regError } = await supabase
        .from('course_registrations')
        .select(`
          course_id,
          courses(course_date, end_time)
        `)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .gte('courses.course_date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lte('courses.course_date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-31`)

      const regDays = new Set<number>()
      if (!regError && registrations) {
        for (const reg of registrations) {
          if (reg.courses?.course_date && reg.courses?.end_time) {
            const courseDate = new Date(reg.courses.course_date)
            const courseEndTime = new Date(`${reg.courses.course_date}T${reg.courses.end_time}`)
            const now = new Date()
            const day = courseDate.getDate()

            // Mark as registered for future courses
            if (now <= courseEndTime) {
              regDays.add(day)
            }

            // If course has ended and user didn't manually unregister, mark as completed
            if (now > courseEndTime) {
              days.add(day)

              // Create training session if not exists
              const { data: existingSession } = await supabase
                .from('training_sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('date', reg.courses.course_date)
                .eq('workout_type', 'course')
                .single()

              if (!existingSession) {
                await supabase
                  .from('training_sessions')
                  .insert({
                    user_id: user.id,
                    date: reg.courses.course_date,
                    workout_type: 'course',
                    status: 'completed'
                  })
              }
            }
          }
        }
      }

      setTrainingDays(days)
      setRegisteredDays(regDays)
    } catch (error) {
      console.error('Error loading training days:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    return new Date(currentYear, currentMonth + 1, 0).getDate()
  }

  const getCurrentDay = () => {
    return new Date().getDate()
  }

  const getDayStatus = (day: number) => {
    const currentDay = getCurrentDay()
    
    if (trainingDays.has(day)) {
      return "bg-green-500" // Trainiert - grün
    } else if (day < currentDay) {
      return "bg-red-500" // Verpasst - rot
    } else {
      return "bg-gray-400" // Zukünftig - grau
    }
  }

  const handleDayClick = (day: number) => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    
    // Alle Tage sind klickbar für Kurs An-/Abmeldung, außer für Open Gym
    if (!isOpenGym) {
      const selectedDate = new Date(currentYear, currentMonth, day)
      const formattedDate = selectedDate.toISOString().split('T')[0]
      setSelectedDate(formattedDate)
      setShowCourseDialog(true)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        {Array.from({ length: getDaysInMonth() }, (_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        {Array.from({ length: getDaysInMonth() }, (_, i) => {
          const day = i + 1
          const currentDay = getCurrentDay()
          const isRegistered = registeredDays.has(day)
          
          return (
            <div
              key={day}
              onClick={() => !isOpenGym ? handleDayClick(day) : undefined}
              className={`w-3 h-3 rounded-full ${getDayStatus(day)} transition-colors ${
                !isOpenGym ? 'cursor-pointer hover:scale-110' : ''
              } relative flex items-center justify-center`}
              title={`Tag ${day}: ${
                trainingDays.has(day) 
                  ? 'Trainiert' 
                  : isRegistered
                  ? 'Angemeldet für Kurs'
                  : day < getCurrentDay() 
                  ? 'Nicht trainiert' 
                  : !isOpenGym
                  ? 'Klicken für Kurse'
                  : 'Zukünftig'
              }`}
            >
              {isRegistered && (
                <Calendar className="h-2 w-2 text-white" />
              )}
            </div>
          )
        })}
      </div>
      
      <DayCourseDialog
        open={showCourseDialog}
        onOpenChange={setShowCourseDialog}
        date={selectedDate}
        user={user}
        userRole={userRole}
      />
    </>
  )
}