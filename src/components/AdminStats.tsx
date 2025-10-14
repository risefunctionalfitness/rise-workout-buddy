import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, ChevronDown, ChevronUp, Trophy, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "@/integrations/supabase/client"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CourseUtilizationCard } from "@/components/CourseUtilizationCard"
import { PopularCoursesCard } from "@/components/PopularCoursesCard"
import { CancellationRateCard } from "@/components/CancellationRateCard"
import { BookingPatternsCard } from "@/components/BookingPatternsCard"
import { InactiveMembersCard } from "@/components/InactiveMembersCard"
import { MonthlyRegistrationsChart } from "@/components/MonthlyRegistrationsChart"

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
  const { toast } = useToast()
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
  const [allTimeCurrentPage, setAllTimeCurrentPage] = useState(1)
  const [yearCurrentPage, setYearCurrentPage] = useState(1)
  const [allTimeTotal, setAllTimeTotal] = useState(0)
  const [yearTotal, setYearTotal] = useState(0)
  const itemsPerPage = 10

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

  const loadExtendedStats = async (allTimePage = 1, yearPage = 1) => {
    setExtendedStatsLoading(true)
    await loadExtendedStatsManual(allTimePage, yearPage)
    setExtendedStatsLoading(false)
  }

  const loadExtendedStatsManual = async (allTimePage = 1, yearPage = 1) => {
    try {
      console.log('Loading extended leaderboard stats...')
      const currentYear = new Date().getFullYear()

      // Get ALL leaderboard entries with better error handling
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('leaderboard_entries')
        .select('user_id, training_count, year, month')
        .order('training_count', { ascending: false })

      if (allTimeError) {
        console.error('Error fetching leaderboard entries:', allTimeError)
        throw allTimeError
      }

      console.log('Leaderboard entries found:', allTimeData?.length || 0)

      // Get all profiles with display names, first_name, last_name
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .not('user_id', 'is', null)
        .not('display_name', 'is', null)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        throw profilesError
      }

      console.log('Profiles with display names found:', profilesData?.length || 0)

      // Always create the extended stats structure, even if empty
      if (!allTimeData || allTimeData.length === 0) {
        console.log('No leaderboard data available')
        setExtendedStats({
          allTimeLeaderboard: [],
          yearLeaderboard: []
        })
        setAllTimeTotal(0)
        setYearTotal(0)
        return
      }

      // Create profiles lookup with better safety checks
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        if (profile.user_id && profile.display_name) {
          acc[profile.user_id] = profile
        }
        return acc
      }, {} as Record<string, any>)

      // Aggregate by user for all time (sum all training counts across all months/years)
      const allTimeAggregated = (allTimeData || []).reduce((acc, entry) => {
        const userId = entry.user_id
        if (!acc[userId]) {
          acc[userId] = 0
        }
        acc[userId] += entry.training_count || 0
        return acc
      }, {} as Record<string, number>)

      console.log('All time users aggregated:', Object.keys(allTimeAggregated).length)

      // Create all-time leaderboard entries - include ALL users with profiles
      const allTimeLeaderboardFull = Object.entries(allTimeAggregated)
        .map(([userId, count]) => {
          const profile = profilesMap[userId]
          if (!profile || !profile.display_name) {
            console.log('Skipping user without profile:', userId)
            return null
          }
          const fullName = profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.display_name
          return {
            user_id: userId,
            training_count: count,
            display_name: fullName,
            avatar_url: profile.avatar_url || null,
            year: 0, // Indicates all-time
            month: 0,
            total: count // For compatibility with display component
          }
        })
        .filter(entry => entry !== null) // Remove null entries
        .sort((a, b) => b.training_count - a.training_count)

      // Set total count
      setAllTimeTotal(allTimeLeaderboardFull.length)

      // Get paginated results for all time
      const allTimeStartIndex = (allTimePage - 1) * itemsPerPage
      const allTimeEndIndex = allTimeStartIndex + itemsPerPage
      const allTimeLeaderboard = allTimeLeaderboardFull.slice(allTimeStartIndex, allTimeEndIndex)

      console.log('All time leaderboard created with', allTimeLeaderboard.length, 'entries on page', allTimePage)

      // Aggregate by user for current year only
      const currentYearData = (allTimeData || []).filter(entry => entry.year === currentYear)
      console.log('Current year entries found:', currentYearData.length)
      
      const yearAggregated = currentYearData.reduce((acc, entry) => {
        const userId = entry.user_id
        if (!acc[userId]) {
          acc[userId] = 0
        }
        acc[userId] += entry.training_count || 0
        return acc
      }, {} as Record<string, number>)

      console.log('Current year users aggregated:', Object.keys(yearAggregated).length)

      // Create current year leaderboard entries - include ALL users with profiles
      const yearLeaderboardFull = Object.entries(yearAggregated)
        .map(([userId, count]) => {
          const profile = profilesMap[userId]
          if (!profile || !profile.display_name) {
            return null
          }
          const fullName = profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.display_name
          return {
            user_id: userId,
            training_count: count,
            display_name: fullName,
            avatar_url: profile.avatar_url || null,
            year: currentYear,
            month: 0,
            total: count // For compatibility with display component
          }
        })
        .filter(entry => entry !== null) // Remove null entries
        .sort((a, b) => b.training_count - a.training_count)

      // Set total count
      setYearTotal(yearLeaderboardFull.length)

      // Get paginated results for current year
      const yearStartIndex = (yearPage - 1) * itemsPerPage
      const yearEndIndex = yearStartIndex + itemsPerPage
      const yearLeaderboard = yearLeaderboardFull.slice(yearStartIndex, yearEndIndex)

      console.log('Year leaderboard created with', yearLeaderboard.length, 'entries on page', yearPage)

      // Set the final result
      setExtendedStats({
        allTimeLeaderboard,
        yearLeaderboard
      })

      console.log('Extended stats successfully loaded:', {
        allTimeCount: allTimeLeaderboard.length,
        yearCount: yearLeaderboard.length,
        allTimeTotal: allTimeLeaderboardFull.length,
        yearTotal: yearLeaderboardFull.length
      })

    } catch (error) {
      console.error('Error loading extended stats:', error)
      // Set empty arrays on error but don't fail silently
      setExtendedStats({
        allTimeLeaderboard: [],
        yearLeaderboard: []
      })
      setAllTimeTotal(0)
      setYearTotal(0)
    }
  }

  const toggleExtendedStats = () => {
    setExtendedStatsOpen(!extendedStatsOpen)
    if (!extendedStatsOpen && extendedStats.allTimeLeaderboard.length === 0) {
      loadExtendedStats()
    }
  }

  const handleAllTimePageChange = (page: number) => {
    setAllTimeCurrentPage(page)
    loadExtendedStats(page, yearCurrentPage)
  }

  const handleYearPageChange = (page: number) => {
    setYearCurrentPage(page)
    loadExtendedStats(allTimeCurrentPage, page)
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

  // Get colors for membership types (matching MonthlyRegistrationsChart)
  const getMembershipColor = (type: string) => {
    switch (type) {
      case 'Basic Member':
        return 'hsl(142, 76%, 36%)' // Green for Basic
      case 'Premium Member': 
        return 'hsl(45, 93%, 47%)' // Gold for Premium
      case 'Wellpass':
        return 'hsl(185, 100%, 33%)' // Cyan for Wellpass
      case '10er Karte':
        return 'hsl(0, 0%, 0%)' // Black for 10er Karte
      case 'Open Gym':
        return 'hsl(0, 0%, 50%)' // Gray for Open Gym
      default:
        return 'hsl(var(--primary))'
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

      {/* Monthly Registrations Line Chart */}
      <MonthlyRegistrationsChart />

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
              <p className="text-lg font-medium text-foreground">Anzahl Mitgliedschaften je Kategorie</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.memberStats).map(([type, count]) => (
              <div key={type} className="text-center">
                <Badge variant="secondary" className="text-sm mb-2">{type}</Badge>
                <p className="text-xl font-bold">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Course Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CourseUtilizationCard />
        <PopularCoursesCard />
        <CancellationRateCard />
        <BookingPatternsCard />
        <InactiveMembersCard />
      </div>

      {/* Extended Stats */}
      <Collapsible open={extendedStatsOpen} onOpenChange={toggleExtendedStats}>
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
                   <div className="space-y-4">
                     <div className="space-y-2 max-h-96 overflow-y-auto">
                       {extendedStats.allTimeLeaderboard.length === 0 ? (
                         <div className="text-center py-8 text-muted-foreground">
                           Keine Daten verfügbar
                         </div>
                       ) : (
                         extendedStats.allTimeLeaderboard.map((entry, index) => {
                           const globalIndex = (allTimeCurrentPage - 1) * itemsPerPage + index
                           return (
                             <div key={entry.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                               <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                   globalIndex === 0 ? 'bg-yellow-500 text-white' :
                                   globalIndex === 1 ? 'bg-gray-400 text-white' :
                                   globalIndex === 2 ? 'bg-amber-600 text-white' :
                                   'bg-gray-200 text-gray-700'
                                 }`}>
                                   {globalIndex + 1}
                                 </div>
                                 <span className="font-medium">{entry.display_name}</span>
                               </div>
                               <Badge variant="secondary" className="text-sm">
                                 {entry.total} Sessions
                               </Badge>
                             </div>
                           )
                         })
                       )}
                     </div>
                     
                     {/* All Time Pagination */}
                     {allTimeTotal > itemsPerPage && (
                       <div className="flex items-center justify-between pt-4">
                         <div className="text-sm text-muted-foreground">
                           Zeige {((allTimeCurrentPage - 1) * itemsPerPage) + 1} bis {Math.min(allTimeCurrentPage * itemsPerPage, allTimeTotal)} von {allTimeTotal} Nutzern
                         </div>
                         <div className="flex items-center gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleAllTimePageChange(allTimeCurrentPage - 1)}
                             disabled={allTimeCurrentPage === 1}
                           >
                             <ChevronLeft className="h-4 w-4" />
                           </Button>
                           <span className="text-sm px-3 py-1 bg-muted rounded">
                             {allTimeCurrentPage} / {Math.ceil(allTimeTotal / itemsPerPage)}
                           </span>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleAllTimePageChange(allTimeCurrentPage + 1)}
                             disabled={allTimeCurrentPage >= Math.ceil(allTimeTotal / itemsPerPage)}
                           >
                             <ChevronRight className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
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
                   <div className="space-y-4">
                     <div className="space-y-2 max-h-96 overflow-y-auto">
                       {extendedStats.yearLeaderboard.length === 0 ? (
                         <div className="text-center py-8 text-muted-foreground">
                           Keine Daten verfügbar
                         </div>
                       ) : (
                         extendedStats.yearLeaderboard.map((entry, index) => {
                           const globalIndex = (yearCurrentPage - 1) * itemsPerPage + index
                           return (
                             <div key={entry.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                               <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                   globalIndex === 0 ? 'bg-yellow-500 text-white' :
                                   globalIndex === 1 ? 'bg-gray-400 text-white' :
                                   globalIndex === 2 ? 'bg-amber-600 text-white' :
                                   'bg-gray-200 text-gray-700'
                                 }`}>
                                   {globalIndex + 1}
                                 </div>
                                 <span className="font-medium">{entry.display_name}</span>
                               </div>
                               <Badge variant="secondary" className="text-sm">
                                 {entry.total} Sessions
                               </Badge>
                             </div>
                           )
                         })
                       )}
                     </div>
                     
                     {/* Year Pagination */}
                     {yearTotal > itemsPerPage && (
                       <div className="flex items-center justify-between pt-4">
                         <div className="text-sm text-muted-foreground">
                           Zeige {((yearCurrentPage - 1) * itemsPerPage) + 1} bis {Math.min(yearCurrentPage * itemsPerPage, yearTotal)} von {yearTotal} Nutzern
                         </div>
                         <div className="flex items-center gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleYearPageChange(yearCurrentPage - 1)}
                             disabled={yearCurrentPage === 1}
                           >
                             <ChevronLeft className="h-4 w-4" />
                           </Button>
                           <span className="text-sm px-3 py-1 bg-muted rounded">
                             {yearCurrentPage} / {Math.ceil(yearTotal / itemsPerPage)}
                           </span>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleYearPageChange(yearCurrentPage + 1)}
                             disabled={yearCurrentPage >= Math.ceil(yearTotal / itemsPerPage)}
                           >
                             <ChevronRight className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
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