import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Zap, Activity } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "@/integrations/supabase/client"

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
    freeTraining: number
    courses: number
    openGym: number
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
      freeTraining: 0,
      courses: 0,
      openGym: 0,
      Member: 0,
      Wellpass: 0,
      '10er Karte': 0,
      'Open Gym': 0
    }
  })
  const [loading, setLoading] = useState(true)

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

      // Get detailed breakdown by training type from training_sessions
      const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

      const { data: trainingSessions } = await supabase
        .from('training_sessions')
        .select('user_id, workout_type')
        .gte('date', firstDayOfMonth)
        .lte('date', lastDayOfMonth)
        .eq('status', 'completed')

      // Count by workout type - include all types that could be considered "freies Training"
      const freeTrainingTypes = ['free_training', 'individual', 'crossfit_wod_only', 'crossfit_full_session', 'plan']
      const courseTypes = ['course']
      const openGymTypes = ['open_gym']
      
      const freeTrainingCount = trainingSessions?.filter(s => freeTrainingTypes.includes(s.workout_type)).length || 0
      const courseTrainingCount = trainingSessions?.filter(s => courseTypes.includes(s.workout_type)).length || 0
      const openGymCount = trainingSessions?.filter(s => openGymTypes.includes(s.workout_type)).length || 0

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
        registrationsByType: {
          freeTraining: freeTrainingCount,
          courses: courseTrainingCount,
          openGym: openGymCount,
          ...membershipCounts
        }
      }

      setStats(statsData)
      onStatsLoad?.(statsData)
    } catch (error) {
      console.error('Error loading admin stats:', error)
    } finally {
      setLoading(false)
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Anmeldungen diesen Monat</p>
                <p className="text-2xl font-bold">{stats.currentMonthEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Freies Training</p>
                <p className="text-2xl font-bold">{stats.registrationsByType?.freeTraining || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Kurs Anmeldungen</p>
                <p className="text-2xl font-bold">{stats.registrationsByType?.courses || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Gym</p>
                <p className="text-2xl font-bold">{stats.registrationsByType?.openGym || 0}</p>
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
            <Users className="h-8 w-8 text-purple-500" />
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
    </div>
  )
}