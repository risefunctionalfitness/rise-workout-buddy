import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Dumbbell, Calendar, CheckCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { AvatarUpload } from "@/components/AvatarUpload"
import { ProfileImageViewer } from "@/components/ProfileImageViewer"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<{ imageUrl: string | null; displayName: string } | null>(null)

  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (mounted) {
        await loadLeaderboard()
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
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
        .limit(30)

      if (leaderboardError) {
        console.error('Error loading leaderboard:', leaderboardError)
        setLeaderboard([])
        return
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        setLeaderboard([])
        return
      }

      // Get all user IDs from leaderboard
      const userIds = leaderboardData.map(entry => entry.user_id)

      // Get user profiles for display names and avatars
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, nickname, avatar_url')
        .in('user_id', userIds)

      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
        setLeaderboard([])
        return
      }

      // Get challenge completion status for current month
      const { data: challengeProgress, error: challengeError } = await supabase
        .from('user_challenge_progress')
        .select(`
          user_id,
          is_completed,
          monthly_challenges!inner(year, month)
        `)
        .eq('monthly_challenges.year', currentYear)
        .eq('monthly_challenges.month', currentMonth)
        .eq('is_completed', true)
        .in('user_id', userIds)

      if (challengeError) {
        console.error('Error loading challenge progress:', challengeError)
      }

      // Combine leaderboard data with profile info and calculate total score
      const leaderboardWithProfiles = leaderboardData.map(entry => {
        const profile = profiles?.find(p => p.user_id === entry.user_id)
        const hasCompletedChallenge = challengeProgress?.some(cp => cp.user_id === entry.user_id) || false
        const totalScore = entry.training_count + (entry.challenge_bonus_points || 0)
        return {
          ...entry,
          challenge_bonus_points: entry.challenge_bonus_points || 0,
          display_name: profile?.nickname || profile?.display_name || 'Unbekannt',
          avatar_url: profile?.avatar_url || null,
          total_score: totalScore,
          hasCompletedChallenge
        }
      }).sort((a, b) => b.total_score - a.total_score) // Sort by total score

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
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:border-yellow-600"
      case 2:
        return "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300 dark:from-gray-800/50 dark:to-gray-700/50 dark:border-gray-600"
      case 3:
        return "bg-gradient-to-r from-orange-100 to-orange-200 border-orange-300 dark:from-orange-900/30 dark:to-orange-800/30 dark:border-orange-600"
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
    <div className="h-[calc(100vh-8rem)] overflow-auto p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 relative">
          <h1 className="text-2xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Top 30 im {new Date().toLocaleDateString('de-DE', { month: 'long' })}</p>
          <div className="absolute top-0 right-0 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{getRemainingDaysInMonth()}</span>
            <Calendar className="h-4 w-4" />
          </div>
        </div>

        <div className="space-y-3 pb-2">
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
                        <div className="flex items-center space-x-2">
                          <img
                            src={entry.avatar_url || '/placeholder.svg'}
                            alt={entry.display_name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedProfile({ 
                              imageUrl: entry.avatar_url, 
                              displayName: entry.display_name 
                            })}
                          />
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg text-foreground">{entry.display_name}</h3>
                            {entry.hasCompletedChallenge && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <CheckCircle className="h-5 w-5 text-green-500 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Monatschallenge abgeschlossen</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div className="text-right">
                          <Badge variant="secondary" className="text-lg px-3 py-1 bg-rise-accent text-white flex items-center gap-1">
                            <Dumbbell className="h-4 w-4" />
                            {entry.total_score}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
      
      <ProfileImageViewer
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        imageUrl={selectedProfile?.imageUrl || null}
        displayName={selectedProfile?.displayName || ''}
      />
    </div>
  )
}