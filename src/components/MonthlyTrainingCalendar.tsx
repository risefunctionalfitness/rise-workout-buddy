import { useState, useEffect } from "react"
import { User } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"

interface MonthlyTrainingCalendarProps {
  user: User
}

export const MonthlyTrainingCalendar = ({ user }: MonthlyTrainingCalendarProps) => {
  const [trainingDays, setTrainingDays] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrainingDays()
  }, [user.id])

  const loadTrainingDays = async () => {
    try {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth()
      
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

      setTrainingDays(days)
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
    <div className="flex flex-col gap-1">
      {Array.from({ length: getDaysInMonth() }, (_, i) => {
        const day = i + 1
        return (
          <div
            key={day}
            className={`w-3 h-3 rounded-full ${getDayStatus(day)} transition-colors`}
            title={`Tag ${day}: ${
              trainingDays.has(day) 
                ? 'Trainiert' 
                : day < getCurrentDay() 
                ? 'Nicht trainiert' 
                : day === getCurrentDay()
                ? 'Heute'
                : 'Noch nicht erreicht'
            }`}
          />
        )
      })}
    </div>
  )
}