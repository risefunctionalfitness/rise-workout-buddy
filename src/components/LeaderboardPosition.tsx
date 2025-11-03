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

      // Get profiles for all users in leaderboard to check visibility
      const userIds = leaderboardData?.map(entry => entry.user_id) || []
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, show_in_leaderboard')
        .in('user_id', userIds)

      // Get most recent training session for each user in current month
      const { data: recentSessions } = await supabase
        .from('training_sessions')
        .select('user_id, date')
        .in('user_id', userIds)
        .eq('status', 'completed')
        .order('date', { ascending: false })

      // Create a map of user_id to most recent training date
      const mostRecentTrainingMap = new Map<string, string>()
      recentSessions?.forEach(session => {
        if (!mostRecentTrainingMap.has(session.user_id)) {
          mostRecentTrainingMap.set(session.user_id, session.date)
        }
      })

      // Create a map for quick lookup
      const profileMap = new Map(
        profilesData?.map(p => [p.user_id, p.show_in_leaderboard]) || []
      )

      // Check if current user should be visible in leaderboard
      const currentUserVisible = profileMap.get(user.id) ?? true
      if (!currentUserVisible) {
        setPosition(null)
        setTotalUsers(0)
        setLoading(false)
        return
      }

      if (leaderboardData && leaderboardData.length > 0) {
        // Filter to only include users with show_in_leaderboard = true
        const visibleLeaderboardData = leaderboardData.filter(entry => {
          const isVisible = profileMap.get(entry.user_id)
          return isVisible !== false // Include if true or undefined (default true)
        })
        
        // Calculate total scores and sort by total score, then by most recent training
        const sortedData = visibleLeaderboardData
          .map(entry => ({
            ...entry,
            total_score: entry.training_count + (entry.challenge_bonus_points || 0),
            most_recent_training: mostRecentTrainingMap.get(entry.user_id) || '1970-01-01'
          }))
          .sort((a, b) => {
            // Primary sort: by total score (descending)
            if (a.total_score !== b.total_score) {
              return b.total_score - a.total_score
            }
            // Secondary sort: by most recent training date (descending - more recent first)
            return new Date(b.most_recent_training).getTime() - new Date(a.most_recent_training).getTime()
          })
        
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
      <Trophy className="h-5 w-5 text-foreground" />
      <span className="text-lg font-bold text-foreground">{position}</span>
    </div>
  )
}