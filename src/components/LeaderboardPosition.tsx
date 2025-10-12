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
        .select('user_id, training_count, challenge_bonus_points')
        .eq('year', currentYear)
        .eq('month', currentMonth)

      if (error) throw error

      if (leaderboardData && leaderboardData.length > 0) {
        // Calculate total scores and sort by total score
        const sortedData = leaderboardData
          .map(entry => ({
            ...entry,
            total_score: entry.training_count + (entry.challenge_bonus_points || 0)
          }))
          .sort((a, b) => b.total_score - a.total_score)
        
        const userPosition = sortedData.findIndex(entry => entry.user_id === user.id) + 1
        setPosition(userPosition > 0 ? userPosition : null)
        setTotalUsers(sortedData.length)
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
    // Use window.dispatchEvent to trigger tab change in Dashboard
    window.dispatchEvent(new CustomEvent('changeTab', { detail: 'leaderboard' }))
  }

  return (
    <div className="flex items-center gap-2">
      <Trophy className="h-5 w-5 text-yellow-500" />
      <span className="text-lg font-bold text-primary">{position}</span>
    </div>
  )
}