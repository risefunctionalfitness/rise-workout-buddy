import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProfileImageViewer } from "@/components/ProfileImageViewer"
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
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProfile, setSelectedProfile] = useState<{ imageUrl: string | null; displayName: string } | null>(null)
  const entriesPerPage = 30

  useEffect(() => {
    loadLeaderboard()
  }, [])

  useEffect(() => {
    // Filter leaderboard based on search term
    const filtered = leaderboard.filter(entry => 
      entry.display_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredLeaderboard(filtered)
    setCurrentPage(1) // Reset to first page when searching
  }, [leaderboard, searchTerm])

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

      // Get profiles for all users in leaderboard (only those who should be shown)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)
        .eq('show_in_leaderboard', true)

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
        .select(`
          user_id, 
          is_completed,
          challenge_id,
          monthly_challenges!inner(year, month)
        `)
        .eq('is_completed', true)
        .eq('monthly_challenges.year', currentYear)
        .eq('monthly_challenges.month', currentMonth)

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
        return <Trophy className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-muted-foreground">{position}</span>
    }
  }

  const currentDate = new Date()
  const currentMonthName = currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  // Calculate pagination
  const totalEntries = filteredLeaderboard.length
  const totalPages = Math.ceil(totalEntries / entriesPerPage)
  const startIndex = (currentPage - 1) * entriesPerPage
  const endIndex = startIndex + entriesPerPage
  const currentEntries = filteredLeaderboard.slice(startIndex, endIndex)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Leaderboard
          </CardTitle>
          <CardDescription>
            Top {entriesPerPage} im {currentMonthName}
          </CardDescription>
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                Alle Teilnehmer {currentMonthName}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">{totalEntries}</span>
              {showSearch ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    className="pl-10 w-48"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={() => !searchTerm && setShowSearch(false)}
                    autoFocus
                  />
                </div>
              ) : (
                <div 
                  className="p-2 border rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalEntries === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Noch keine Einträge</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Keine Treffer für diese Suche gefunden.' : 'Für diesen Monat sind noch keine Trainingssessions eingetragen.'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {currentEntries.map((entry, index) => {
                  const globalRank = startIndex + index + 1
                  const isTopThree = globalRank <= 3
                  
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        isTopThree 
                          ? globalRank === 1 
                            ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20' 
                            : globalRank === 2
                            ? 'bg-gradient-to-r from-gray-400/10 to-transparent border-gray-400/20'
                            : 'bg-gradient-to-r from-amber-600/10 to-transparent border-amber-600/20'
                          : 'bg-card hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(globalRank)}
                        </div>
                        <Avatar 
                          className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedProfile({
                            imageUrl: entry.avatar_url,
                            displayName: entry.display_name
                          })}
                        >
                          <AvatarImage src={entry.avatar_url || undefined} />
                          <AvatarFallback>
                            {entry.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{entry.display_name}</h3>
                          {entry.hasCompletedChallenge && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Challenge ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="destructive" 
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1"
                        >
                          {entry.total_score}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Zeige {startIndex + 1} bis {Math.min(endIndex, totalEntries)} von {totalEntries} Einträgen
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Zurück
                    </Button>
                    <span className="px-3 py-1 text-sm bg-muted rounded">
                      {currentPage} von {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Weiter
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedProfile && (
        <ProfileImageViewer
          imageUrl={selectedProfile.imageUrl}
          displayName={selectedProfile.displayName}
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  )
}