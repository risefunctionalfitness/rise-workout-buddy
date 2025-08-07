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
    'Basic Member': number
    'Premium Member': number
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
      'Basic Member': 0,
      'Premium Member': 0,
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
        'Basic Member': 0,
        'Premium Member': 0,
        'Wellpass': 0,
        '10er Karte': 0,
        'Open Gym': 0
      }

      leaderboardData?.forEach(entry => {
        const profile = profiles?.find(p => p.user_id === entry.user_id)
        let membershipType = profile?.membership_type || 'Basic Member'
        
        // Map "Trainer" to "Open Gym" for public stats
        if (membershipType === 'Trainer') {
          membershipType = 'Open Gym'
        }
        // Map old "Member" to "Basic Member" for backward compatibility
        if (membershipType === 'Member') {
          membershipType = 'Basic Member'
        }
        
        if (membershipCounts.hasOwnProperty(membershipType)) {
          membershipCounts[membershipType] += entry.training_count
        }
      })

      // Count total memberships by category (filter out Trainer, replace with Open Gym)
      const membershipStats: { [key: string]: number } = {
        'Basic Member': 0,
        'Premium Member': 0,
        'Wellpass': 0,
        '10er Karte': 0,
        'Open Gym': 0
      }
      
      profiles?.forEach(profile => {
        let membershipType = profile.membership_type || 'Basic Member'
        
        // Map "Trainer" to "Open Gym" for membership count display
        if (membershipType === 'Trainer') {
          membershipType = 'Open Gym'
        }
        // Map old "Member" to "Basic Member" for backward compatibility
        if (membershipType === 'Member') {
          membershipType = 'Basic Member'
        }
        
        // Only count the 5 main categories we want to display
        if (membershipStats.hasOwnProperty(membershipType)) {
          membershipStats[membershipType] = (membershipStats[membershipType] || 0) + 1
        }
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
    // Direct to manual aggregation - this is more reliable
    await loadExtendedStatsManual()
    setExtendedStatsLoading(false)
  }

  const loadExtendedStatsManual = async () => {
    try {
      console.log('Using manual aggregation method...')
      const currentYear = new Date().getFullYear()

      // Get ALL leaderboard entries (including 0 counts)
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('leaderboard_entries')
        .select('user_id, training_count, year, month')

      if (allTimeError) {
        console.error('All time error:', allTimeError)
        throw allTimeError
      }

      console.log('All leaderboard entries:', allTimeData?.length)

      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .not('user_id', 'is', null)

      if (profilesError) {
        console.error('Profiles error:', profilesError)
        throw profilesError
      }

      console.log('Profiles found:', profilesData?.length)

      if (!allTimeData || allTimeData.length === 0) {
        console.log('No leaderboard data found')
        setExtendedStats({
          allTimeLeaderboard: [],
          yearLeaderboard: []
        })
        return
      }

      // Create profiles lookup
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        if (profile.user_id) {
          acc[profile.user_id] = profile
        }
        return acc
      }, {} as Record<string, any>)

      // Aggregate all time data by user
      const allTimeAggregated: { [key: string]: number } = {}
      allTimeData.forEach(entry => {
        if (entry.training_count > 0) { // Only count actual training sessions
          allTimeAggregated[entry.user_id] = (allTimeAggregated[entry.user_id] || 0) + entry.training_count
        }
      })

      // Aggregate this year data
      const thisYearAggregated: { [key: string]: number } = {}
      allTimeData
        .filter(entry => entry.year === currentYear && entry.training_count > 0)
        .forEach(entry => {
          thisYearAggregated[entry.user_id] = (thisYearAggregated[entry.user_id] || 0) + entry.training_count
        })

      // Convert to sorted arrays with profile info
      const allTimeSorted = Object.entries(allTimeAggregated)
        .map(([user_id, total]) => ({
          user_id,
          total,
          display_name: profilesMap[user_id]?.display_name || `User ${user_id.slice(0, 8)}`
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20)

      const thisYearSorted = Object.entries(thisYearAggregated)
        .map(([user_id, total]) => ({
          user_id,
          total,
          display_name: profilesMap[user_id]?.display_name || `User ${user_id.slice(0, 8)}`
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20)

      console.log('Manual aggregation results:')
      console.log('All time top users:', allTimeSorted.length)
      console.log('This year top users:', thisYearSorted.length)

      setExtendedStats({
        allTimeLeaderboard: allTimeSorted,
        yearLeaderboard: thisYearSorted,
      })
    } catch (error) {
      console.error('Error in manual aggregation:', error)
      setExtendedStats({
        allTimeLeaderboard: [],
        yearLeaderboard: []
      })
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

  // Get colors for membership types
  const getMembershipColor = (type: string) => {
    switch (type) {
      case 'Basic Member':
        return 'hsl(334, 87%, 40%)' // #bd114a (RISE Red)
      case 'Premium Member': 
        return 'hsl(334, 87%, 30%)' // Darker red for Premium
      case 'Wellpass':
        return 'hsl(185, 100%, 33%)' // #00a8b5
      case '10er Karte':
        return 'hsl(0, 0%, 0%)' // #000000
      case 'Open Gym':
        return 'hsl(0, 0%, 65%)' // #a5a5a5
      default:
        return 'hsl(334, 87%, 40%)'
    }
  }

  const chartData = [
    { name: 'Basic Member', value: stats.registrationsByType?.['Basic Member'] || 0, fill: getMembershipColor('Basic Member') },
    { name: 'Premium Member', value: stats.registrationsByType?.['Premium Member'] || 0, fill: getMembershipColor('Premium Member') },
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
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis 
                  domain={[0, scaleMax]} 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  minPointSize={2}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                     {extendedStats.allTimeLeaderboard.length === 0 ? (
                       <div className="text-center py-8 text-muted-foreground">
                         Keine Daten verfügbar
                       </div>
                     ) : (
                       extendedStats.allTimeLeaderboard.map((entry, index) => (
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
                       ))
                     )}
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
                     {extendedStats.yearLeaderboard.length === 0 ? (
                       <div className="text-center py-8 text-muted-foreground">
                         Keine Daten verfügbar
                       </div>
                     ) : (
                       extendedStats.yearLeaderboard.map((entry, index) => (
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
                       ))
                     )}
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