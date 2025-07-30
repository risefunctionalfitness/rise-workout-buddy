import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Weight } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface LeaderboardEntry {
  id: string
  user_id: string
  training_count: number
  display_name: string
  year: number
  month: number
}

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

      // First get leaderboard entries
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .order('training_count', { ascending: false })

      if (leaderboardError) {
        console.error('Error loading leaderboard:', leaderboardError)
        return
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        setLeaderboard([])
        return
      }

      // Get all user IDs from leaderboard
      const userIds = leaderboardData.map(entry => entry.user_id)

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds)

      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
        return
      }

      // Combine leaderboard data with profile names
      const formattedData = leaderboardData.map(entry => {
        const profile = profilesData?.find(p => p.user_id === entry.user_id)
        return {
          id: entry.id,
          user_id: entry.user_id,
          training_count: entry.training_count || 0,
          display_name: profile?.display_name || 'Unbekannt',
          year: entry.year,
          month: entry.month
        }
      })

      setLeaderboard(formattedData)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-orange-500" />
      default:
        return <div className="h-6 w-6 flex items-center justify-center text-muted-foreground font-bold">{position}</div>
    }
  }

  const getRankColor = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200"
      case 2:
        return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"
      case 3:
        return "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200"
      default:
        return "bg-card border-border"
    }
  }

  const currentMonth = new Date().toLocaleDateString('de-DE', { 
    month: 'long', 
    year: 'numeric' 
  })

  const getRemainingDaysInMonth = () => {
    const today = new Date()
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const remainingDays = lastDayOfMonth.getDate() - today.getDate()
    return remainingDays
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Leaderboard wird geladen...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 relative">
          <h1 className="text-2xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Trainings für {currentMonth}</p>
          <div className="absolute top-0 right-0 text-sm text-muted-foreground">
            {getRemainingDaysInMonth()} Tage übrig
          </div>
        </div>

        <div className="space-y-3">
          {leaderboard.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Noch keine Trainings in diesem Monat</p>
              </CardContent>
            </Card>
          ) : (
            leaderboard.map((entry, index) => {
              const position = index + 1
              return (
                <Card key={entry.id} className={`transition-all duration-200 ${getRankColor(position)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12">
                          {getRankIcon(position)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{entry.display_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Platz {position}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <Badge variant="secondary" className="text-lg px-3 py-1 bg-[#B81243] text-white flex items-center gap-1">
                          {entry.training_count}
                          <Weight className="h-4 w-4" />
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}