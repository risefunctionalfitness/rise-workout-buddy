import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, ChevronDown, ChevronUp, Trophy, TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "@/integrations/supabase/client"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface AdminStatsProps {
  onStatsLoad?: (stats: any) => void
}

interface LeaderboardStats {
  totalEntries: number
  memberStats: {
    [key: string]: number
  }
  currentMonthEntries: number
  registrationsByType: {
    Member: number
    Wellpass: number
    '10er Karte': number
    'Open Gym': number
  }
}

export const AdminStats = ({ onStatsLoad }: AdminStatsProps) => {
  const [stats, setStats] = useState<LeaderboardStats>({
    totalEntries: 0,
    memberStats: {},
    currentMonthEntries: 0,
    registrationsByType: {
      Member: 0,
      Wellpass: 0,
      '10er Karte': 0,
      'Open Gym': 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [extendedStatsOpen, setExtendedStatsOpen] = useState(false)
  const [extendedStats, setExtendedStats] = useState<{
    allTimeLeaderboard: any[]
    yearLeaderboard: any[]
  }>({
    allTimeLeaderboard: [],
    yearLeaderboard: []
  })
  const [extendedStatsLoading, setExtendedStatsLoading] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      
      // Get current month from leaderboard entries (this counts all completed training)
      const { data: leaderboardData } = await supabase
        .from('leaderboard_entries')
        .select('user_id, training_count')
        .eq('year', currentYear)
        .eq('month', currentMonth)

      // Get all profiles for membership categorization
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, membership_type')

      // Calculate total training sessions from leaderboard
      const totalCurrentMonth = leaderboardData?.reduce((sum, entry) => sum + entry.training_count, 0) || 0

      // Count by membership type from leaderboard entries
      const membershipCounts = {
        'Member': 0,
        'Wellpass': 0,
        '10er Karte': 0,
        'Open Gym': 0
      }

      leaderboardData?.forEach(entry => {
        const profile = profiles?.find(p => p.user_id === entry.user_id)
        const membershipType = profile?.membership_type || 'Member'
        if (membershipCounts.hasOwnProperty(membershipType)) {
          membershipCounts[membershipType] += entry.training_count
        }
      })

      // Count total memberships by category
      const membershipStats: { [key: string]: number } = {}
      profiles?.forEach(profile => {
        const membershipType = profile.membership_type || 'Member'
        membershipStats[membershipType] = (membershipStats[membershipType] || 0) + 1
      })

      const statsData = {
        totalEntries: totalCurrentMonth,
        memberStats: membershipStats,
        currentMonthEntries: totalCurrentMonth,
        registrationsByType: membershipCounts
      }

      setStats(statsData)
      onStatsLoad?.(statsData)
    } catch (error) {
      console.error('Error loading admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExtendedStats = async () => {
    setExtendedStatsLoading(true)
    try {
      console.log('Loading extended stats...')
      const currentYear = new Date().getFullYear()

      // Get all leaderboard entries separately
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('leaderboard_entries')
        .select('user_id, training_count, year, month')

      if (allTimeError) {
        console.error('All time error:', allTimeError)
        throw allTimeError
      }

      console.log('All time data:', allTimeData)

      // Get all profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')

      if (profilesError) {
        console.error('Profiles error:', profilesError)
        throw profilesError
      }

      console.log('Profiles data:', profilesData)

      // Create a profiles lookup map
      const profilesMap = profilesData.reduce((acc, profile) => {
        acc[profile.user_id] = profile
        return acc
      }, {} as Record<string, any>)

      // Aggregate all time data by user
      const allTimeAggregated: { [key: string]: { user_id: string, total: number, display_name: string } } = {}
      allTimeData?.forEach(entry => {
        if (!allTimeAggregated[entry.user_id]) {
          const profile = profilesMap[entry.user_id]
          allTimeAggregated[entry.user_id] = {
            user_id: entry.user_id,
            total: 0,
            display_name: profile?.display_name || 'Unbekannt'
          }
        }
        allTimeAggregated[entry.user_id].total += entry.training_count
      })

      // Filter this year data and aggregate by user
      const thisYearData = allTimeData?.filter(entry => entry.year === currentYear) || []
      const thisYearAggregated: { [key: string]: { user_id: string, total: number, display_name: string } } = {}
      thisYearData.forEach(entry => {
        if (!thisYearAggregated[entry.user_id]) {
          const profile = profilesMap[entry.user_id]
          thisYearAggregated[entry.user_id] = {
            user_id: entry.user_id,
            total: 0,
            display_name: profile?.display_name || 'Unbekannt'
          }
        }
        thisYearAggregated[entry.user_id].total += entry.training_count
      })

      // Convert to arrays and sort
      const allTimeSorted = Object.values(allTimeAggregated)
        .sort((a, b) => b.total - a.total)
        .slice(0, 20) // Top 20

      const thisYearSorted = Object.values(thisYearAggregated)
        .sort((a, b) => b.total - a.total)
        .slice(0, 20) // Top 20

      console.log('All time leaderboard:', allTimeSorted)
      console.log('This year leaderboard:', thisYearSorted)

      setExtendedStats({
        allTimeLeaderboard: allTimeSorted,
        yearLeaderboard: thisYearSorted,
      })
    } catch (error) {
      console.error('Error loading extended stats:', error)
    } finally {
      setExtendedStatsLoading(false)
    }
  }

  const toggleExtendedStats = () => {
    setExtendedStatsOpen(!extendedStatsOpen)
    if (!extendedStatsOpen && extendedStats.allTimeLeaderboard.length === 0) {
      loadExtendedStats()
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Get colors from MembershipBadge component
  const getMembershipColor = (type: string) => {
    switch (type) {
      case 'Member':
        return 'hsl(334, 87%, 40%)' // #bd114a
      case 'Wellpass':
        return 'hsl(185, 100%, 33%)' // #00a8b5
      case '10er Karte':
        return 'hsl(0, 0%, 0%)' // #000000
      case 'Open Gym':
        return 'hsl(0, 0%, 85%)' // #d9d9d9
      default:
        return 'hsl(334, 87%, 40%)'
    }
  }

  const chartData = [
    { name: 'Member', value: stats.registrationsByType?.Member || 0, fill: getMembershipColor('Member') },
    { name: 'Wellpass', value: stats.registrationsByType?.Wellpass || 0, fill: getMembershipColor('Wellpass') },
    { name: '10er Karte', value: stats.registrationsByType?.['10er Karte'] || 0, fill: getMembershipColor('10er Karte') },
    { name: 'Open Gym', value: stats.registrationsByType?.['Open Gym'] || 0, fill: getMembershipColor('Open Gym') }
  ]

  // Calculate dynamic scale based on data
  const maxValue = Math.max(...chartData.map(item => item.value))
  const scaleMax = Math.max(maxValue * 1.2, 50) // At least 50, or 20% above max value

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Anmeldungen diesen Monat</p>
                <p className="text-2xl font-bold">{stats.currentMonthEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Anmeldungen nach Mitgliedschaftstyp</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, scaleMax]} />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Total Memberships */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <Users className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-lg font-medium text-gray-900">Anzahl Mitgliedschaften je Kategorie</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.memberStats).map(([type, count]) => (
              <div key={type} className="text-center">
                <Badge variant="secondary" className="text-sm mb-2">{type}</Badge>
                <p className="text-xl font-bold">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extended Stats */}
      <Collapsible open={extendedStatsOpen} onOpenChange={setExtendedStatsOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="font-medium">Weitere Statistiken</span>
                </div>
                {extendedStatsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4">
          {extendedStatsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* All Time Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    All Time Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {extendedStats.allTimeLeaderboard.map((entry, index) => (
                      <div key={entry.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{entry.display_name}</span>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          {entry.total} Sessions
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* This Year Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    This Year Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {extendedStats.yearLeaderboard.map((entry, index) => (
                      <div key={entry.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{entry.display_name}</span>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          {entry.total} Sessions
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}