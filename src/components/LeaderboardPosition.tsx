import { useState, useEffect } from "react"
import { Trophy } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"
import { useNavigate } from "react-router-dom"

interface LeaderboardPositionProps {
  user: User
}

export const LeaderboardPosition: React.FC<LeaderboardPositionProps> = ({ user }) => {
  const navigate = useNavigate()
  const [position, setPosition] = useState<number | null>(null)
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboardPosition()
  }, [user.id])

  const loadLeaderboardPosition = async () => {
    try {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

      // Get current month's leaderboard data
      const { data: leaderboardData, error } = await supabase
        .from('leaderboard_entries')
        .select('user_id, training_count')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .order('training_count', { ascending: false })

      if (error) throw error

      if (leaderboardData && leaderboardData.length > 0) {
        const userPosition = leaderboardData.findIndex(entry => entry.user_id === user.id) + 1
        setPosition(userPosition > 0 ? userPosition : null)
        setTotalUsers(leaderboardData.length)
      } else {
        setPosition(null)
        setTotalUsers(0)
      }
    } catch (error) {
      console.error('Error loading leaderboard position:', error)
      setPosition(null)
      setTotalUsers(0)
    } finally {
      setLoading(false)
    }
  }

  if (loading || position === null || totalUsers === 0) {
    return null
  }

  const handleLeaderboardClick = () => {
    navigate("/dashboard?tab=leaderboard")
  }

  return (
    <button 
      onClick={handleLeaderboardClick}
      className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg flex flex-col items-center justify-center text-white font-bold text-sm hover:scale-105 transition-transform"
    >
      <Trophy className="h-5 w-5 mb-0.5" />
      <span className="text-xs leading-none">{position} von {totalUsers}</span>
    </button>
  )
}