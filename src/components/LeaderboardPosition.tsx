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
      className="fixed top-20 right-4 z-50 bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
    >
      <div className="flex flex-col items-center gap-1">
        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
          <Trophy className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs font-bold text-amber-800">
          {position} von {totalUsers}
        </span>
      </div>
    </button>
  )
}