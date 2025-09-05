import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Dumbbell, Calendar, CheckCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface LeaderboardEntry {
  id: string
  user_id: string
  training_count: number
  challenge_bonus_points: number
  display_name: string
  avatar_url: string | null
  year: number
  month: number
  total_score: number
  hasCompletedChallenge: boolean
}

export const AdminLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

      // Get ALL leaderboard entries for current month (no limit)
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .eq('year', currentYear)
        .eq('month', currentMonth)

      if (leaderboardError) {
        console.error('Error loading leaderboard:', leaderboardError)
        setLeaderboard([])
        return
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        setLeaderboard([])
        setLoading(false)
        return
      }

      // Get all user IDs from leaderboard
      const userIds = leaderboardData.map(entry => entry.user_id)

      // Get profiles for all users in leaderboard
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)

      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
        setLeaderboard([])
        setLoading(false)
        return
      }

      // Create profile lookup map
      const profileMap = new Map()
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile)
      })

      // Get challenge completion data for current month
      const { data: challengeData } = await supabase
        .from('user_challenge_progress')
        .select('user_id, is_completed')
        .eq('is_completed', true)

      const challengeCompletedUsers = new Set(challengeData?.map(c => c.user_id) || [])

      // Combine leaderboard data with profile info and calculate total score
      const leaderboardWithProfiles = leaderboardData.map(entry => {
        const profile = profileMap.get(entry.user_id)
        return {
          ...entry,
          display_name: profile?.display_name || 'Unbekannt',
          avatar_url: profile?.avatar_url || null,
          total_score: entry.training_count + entry.challenge_bonus_points,
          hasCompletedChallenge: challengeCompletedUsers.has(entry.user_id)
        }
      })

      // Sort by total score descending
      leaderboardWithProfiles.sort((a, b) => b.total_score - a.total_score)

      setLeaderboard(leaderboardWithProfiles)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{position}</span>
    }
  }

  const currentDate = new Date()
  const currentMonthName = currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Leaderboard {currentMonthName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Lade Leaderboard...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Leaderboard {currentMonthName}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Alle {leaderboard.length} Teilnehmer des aktuellen Monats
        </p>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Noch keine Einträge</h3>
            <p className="text-muted-foreground">
              Für diesen Monat sind noch keine Trainingssessions eingetragen.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  index < 3 
                    ? 'bg-gradient-to-r from-primary/10 to-transparent border' 
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getRankIcon(index + 1)}
                  <div className="flex flex-col">
                    <span className="font-medium">{entry.display_name}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" />
                        <span>{entry.training_count} Training</span>
                      </div>
                      {entry.challenge_bonus_points > 0 && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>+{entry.challenge_bonus_points} Challenge</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.hasCompletedChallenge && (
                    <Badge variant="secondary" className="text-xs">
                      Challenge ✓
                    </Badge>
                  )}
                  <div className="text-right">
                    <div className="font-bold text-lg">{entry.total_score}</div>
                    <div className="text-xs text-muted-foreground">Punkte</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}