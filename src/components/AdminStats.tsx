import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, Zap } from "lucide-react"
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
  topUser: {
    name: string
    count: number
  } | null
  registrationsByType?: {
    freeTraining: number
    courses: number
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
    topUser: null,
    registrationsByType: {
      freeTraining: 0,
      courses: 0,
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
      const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

      // Get current month training sessions (freies Training + Kurs)
      const { data: trainingSessions } = await supabase
        .from('training_sessions')
        .select('user_id, workout_type')
        .gte('date', firstDayOfMonth)
        .lte('date', lastDayOfMonth)
        .eq('status', 'completed')

      // Get current month course registrations
      const { data: courseRegistrations } = await supabase
        .from('course_registrations')
        .select(`
          user_id,
          status,
          courses!inner(course_date)
        `)
        .eq('status', 'registered')
        .gte('courses.course_date', firstDayOfMonth)
        .lte('courses.course_date', lastDayOfMonth)

      // Get all profiles for membership categorization
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, membership_type')

      // Calculate statistics
      const freeTrainingCount = trainingSessions?.filter(s => s.workout_type === 'free_training').length || 0
      const courseTrainingCount = courseRegistrations?.length || 0
      const totalRegistrations = freeTrainingCount + courseTrainingCount

      // Registration counts by membership type
      const membershipCounts = {
        'Member': 0,
        'Wellpass': 0,
        '10er Karte': 0,
        'Open Gym': 0
      }

      // Count free training by membership
      trainingSessions?.forEach(session => {
        const profile = profiles?.find(p => p.user_id === session.user_id)
        const membershipType = profile?.membership_type || 'Member'
        if (membershipCounts.hasOwnProperty(membershipType)) {
          membershipCounts[membershipType]++
        }
      })

      // Count course registrations by membership
      courseRegistrations?.forEach(registration => {
        const profile = profiles?.find(p => p.user_id === registration.user_id)
        const membershipType = profile?.membership_type || 'Member'
        if (membershipCounts.hasOwnProperty(membershipType)) {
          membershipCounts[membershipType]++
        }
      })

      // Count total memberships by category
      const membershipStats: { [key: string]: number } = {}
      profiles?.forEach(profile => {
        const membershipType = profile.membership_type || 'Member'
        membershipStats[membershipType] = (membershipStats[membershipType] || 0) + 1
      })

      // Get top user of current month
      const { data: topUserData } = await supabase
        .from('leaderboard_entries')
        .select('user_id, training_count')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .order('training_count', { ascending: false })
        .limit(1)

      let topUser = null
      if (topUserData?.[0]) {
        const { data: topUserProfile } = await supabase
          .from('profiles')
          .select('display_name, nickname')
          .eq('user_id', topUserData[0].user_id)
          .single()

        topUser = {
          name: topUserProfile?.nickname || topUserProfile?.display_name || 'Unbekannt',
          count: topUserData[0].training_count
        }
      }

      const statsData = {
        totalEntries: totalRegistrations,
        memberStats: membershipStats,
        currentMonthEntries: totalRegistrations,
        topUser,
        registrationsByType: {
          freeTraining: freeTrainingCount,
          courses: courseTrainingCount,
          ...membershipCounts
        }
      }

      setStats({
        ...stats,
        ...statsData
      })
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

  return (
    <div className="space-y-6">
      {/* Monthly Registrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Anmeldungen diesen Monat</p>
                <p className="text-2xl font-bold">{stats.registrationsByType?.freeTraining + stats.registrationsByType?.courses || 0}</p>
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
              <Users className="h-8 w-8 text-orange-500" />
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
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Top Athlet</p>
                <p className="text-lg font-bold truncate">
                  {stats.topUser ? `${stats.topUser.name} (${stats.topUser.count})` : 'Keine Daten'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership Type Registrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Member Anmeldungen</p>
              <p className="text-2xl font-bold text-blue-600">{stats.registrationsByType?.Member || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Wellpass Anmeldungen</p>
              <p className="text-2xl font-bold text-green-600">{stats.registrationsByType?.Wellpass || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">10er Karte Anmeldungen</p>
              <p className="text-2xl font-bold text-orange-600">{stats.registrationsByType?.['10er Karte'] || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Open Gym Anmeldungen</p>
              <p className="text-2xl font-bold text-purple-600">{stats.registrationsByType?.['Open Gym'] || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

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