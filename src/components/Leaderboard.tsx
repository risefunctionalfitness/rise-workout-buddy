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
  most_recent_training: string
}

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<{ imageUrl: string | null; displayName: string } | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')

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
  }, [viewMode])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

      // Get leaderboard entries based on view mode
      let query = supabase
        .from('leaderboard_entries')
        .select('*')
        .eq('year', currentYear)
      
      if (viewMode === 'month') {
        query = query.eq('month', currentMonth)
      }

      const { data: leaderboardData, error: leaderboardError } = await query

      if (leaderboardError) {
        console.error('Error loading leaderboard:', leaderboardError)
        setLeaderboard([])
        return
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        setLeaderboard([])
        return
      }

      // Aggregate by user_id if in year mode
      let aggregatedData: typeof leaderboardData = leaderboardData
      if (viewMode === 'year') {
        const userAggregates = new Map<string, typeof leaderboardData[0]>()

        leaderboardData.forEach(entry => {
          const existing = userAggregates.get(entry.user_id)
          if (existing) {
            existing.training_count += entry.training_count || 0
            existing.challenge_bonus_points += entry.challenge_bonus_points || 0
          } else {
            userAggregates.set(entry.user_id, {
              ...entry,
              training_count: entry.training_count || 0,
              challenge_bonus_points: entry.challenge_bonus_points || 0
            })
          }
        })

        aggregatedData = Array.from(userAggregates.values())
      }

      // Get all user IDs from leaderboard
      const userIds = aggregatedData.map(entry => entry.user_id)

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

      // Get challenge completion status based on view mode
      let challengeQuery = supabase
        .from('user_challenge_progress')
        .select(`
          user_id,
          is_completed,
          monthly_challenges!inner(year, month)
        `)
        .eq('monthly_challenges.year', currentYear)
        .eq('is_completed', true)
        .in('user_id', userIds)
      
      if (viewMode === 'month') {
        challengeQuery = challengeQuery.eq('monthly_challenges.month', currentMonth)
      }

      const { data: challengeProgress, error: challengeError } = await challengeQuery

      if (challengeError) {
        console.error('Error loading challenge progress:', challengeError)
      }

      // Get most recent training session date for each user (for tie-breaking)
      const { data: recentSessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('user_id, date')
        .in('user_id', userIds)
        .eq('status', 'completed')
        .order('date', { ascending: false })

      if (sessionsError) {
        console.error('Error loading recent sessions:', sessionsError)
      }

      // Create a map of user_id to most recent training date
      const mostRecentTrainingMap = new Map<string, string>()
      recentSessions?.forEach(session => {
        if (!mostRecentTrainingMap.has(session.user_id)) {
          mostRecentTrainingMap.set(session.user_id, session.date)
        }
      })

      // Combine leaderboard data with profile info and calculate total score
      const leaderboardWithProfiles = aggregatedData.map(entry => {
        const profile = profiles?.find(p => p.user_id === entry.user_id)
        const hasCompletedChallenge = challengeProgress?.some(cp => cp.user_id === entry.user_id) || false
        const totalScore = entry.training_count + (entry.challenge_bonus_points || 0)
        const mostRecentTraining = mostRecentTrainingMap.get(entry.user_id) || '1970-01-01'
        
        return {
          id: entry.user_id,
          user_id: entry.user_id,
          training_count: entry.training_count,
          challenge_bonus_points: entry.challenge_bonus_points || 0,
          display_name: profile?.nickname || profile?.display_name || 'Unbekannt',
          avatar_url: profile?.avatar_url || null,
          year: currentYear,
          month: currentMonth,
          total_score: totalScore,
          hasCompletedChallenge,
          most_recent_training: mostRecentTraining
        }
      }).sort((a, b) => {
        // Primary sort: by total score (descending)
        if (a.total_score !== b.total_score) {
          return b.total_score - a.total_score
        }
        // Secondary sort: by most recent training date (descending - more recent first)
        return new Date(b.most_recent_training).getTime() - new Date(a.most_recent_training).getTime()
      }).slice(0, 30) // Limit to top 30 AFTER sorting

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

  const getRemainingDaysInYear = () => {
    const today = new Date()
    const endOfYear = new Date(today.getFullYear(), 11, 31)
    const remainingDays = Math.ceil((endOfYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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
          
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setViewMode('month')}
              className={`pb-1 text-sm transition-colors ${
                viewMode === 'month'
                  ? 'text-primary border-b-2 border-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monat
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`pb-1 text-sm transition-colors ${
                viewMode === 'year'
                  ? 'text-primary border-b-2 border-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Jahr
            </button>
          </div>

          <p className="text-muted-foreground">
            Top 30 {viewMode === 'month' 
              ? `im ${new Date().toLocaleDateString('de-DE', { month: 'long' })}` 
              : `in ${new Date().getFullYear()}`}
          </p>
          <div className="absolute top-0 right-0 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">
              {viewMode === 'month' ? getRemainingDaysInMonth() : getRemainingDaysInYear()}
            </span>
            <Calendar className="h-4 w-4" />
          </div>
        </div>

        <div className="space-y-3 pb-2">
          {leaderboard.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  Noch keine Trainings {viewMode === 'month' ? 'in diesem Monat' : 'in diesem Jahr'}
                </p>
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
                            {viewMode === 'month' && entry.hasCompletedChallenge && (
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
                          <Badge variant="secondary" className="text-lg px-3 py-1 bg-rise-accent text-white flex items-center gap-1 pointer-events-none select-none">
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