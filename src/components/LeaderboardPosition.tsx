import { useState, useEffect } from "react"
import { Trophy } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"

interface LeaderboardPositionProps {
  user: User
}

export const LeaderboardPosition: React.FC<LeaderboardPositionProps> = ({ user }) => {
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

  return (
    <div className="fixed top-16 right-4 z-50 bg-background/95 backdrop-blur border rounded-lg px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <span className="text-primary">
          {position} von {totalUsers}
        </span>
      </div>
    </div>
  )
}