import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Dumbbell, Calendar, CheckCircle, Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  const [currentPage, setCurrentPage] = useState(1)
  const entriesPerPage = 10

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
        return <Trophy className="w-4 h-4 text-yellow-500" />
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />
      case 3:
        return <Award className="w-4 h-4 text-amber-600" />
      default:
        return <span className="w-4 h-4 flex items-center justify-center text-sm font-bold text-muted-foreground">{position}</span>
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Leaderboard {currentMonthName}
              </CardTitle>
              <CardDescription>
                Alle {totalEntries} Teilnehmer des aktuellen Monats
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Name suchen..."
                  className="pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalEntries === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Noch keine Einträge</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Keine Treffer für diese Suche gefunden.' : 'Für diesen Monat sind noch keine Trainingssessions eingetragen.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View - Cards */}
              <div className="block md:hidden space-y-4">
                {currentEntries.map((entry, index) => {
                  const globalRank = startIndex + index + 1
                  return (
                    <Card key={entry.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            {getRankIcon(globalRank)}
                            <div>
                              <h3 className="font-medium text-sm">{entry.display_name}</h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Dumbbell className="w-3 h-3" />
                                  <span>{entry.training_count}</span>
                                </div>
                                {entry.challenge_bonus_points > 0 && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>+{entry.challenge_bonus_points}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{entry.total_score}</div>
                            <div className="text-xs text-muted-foreground">Punkte</div>
                          </div>
                        </div>
                        {entry.hasCompletedChallenge && (
                          <Badge variant="secondary" className="text-xs">
                            Challenge ✓
                          </Badge>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rang</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Training</TableHead>
                      <TableHead>Challenge Bonus</TableHead>
                      <TableHead>Gesamt</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEntries.map((entry, index) => {
                      const globalRank = startIndex + index + 1
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="flex items-center gap-2">
                            {getRankIcon(globalRank)}
                          </TableCell>
                          <TableCell className="font-medium">{entry.display_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Dumbbell className="w-4 h-4 text-muted-foreground" />
                              <span>{entry.training_count}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.challenge_bonus_points > 0 ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>+{entry.challenge_bonus_points}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-lg">{entry.total_score}</div>
                          </TableCell>
                          <TableCell>
                            {entry.hasCompletedChallenge ? (
                              <Badge variant="secondary" className="text-xs">
                                Challenge ✓
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
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
    </div>
  )
}