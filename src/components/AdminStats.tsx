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
}

export const AdminStats = ({ onStatsLoad }: AdminStatsProps) => {
  const [stats, setStats] = useState<LeaderboardStats>({
    totalEntries: 0,
    memberStats: {},
    currentMonthEntries: 0,
    topUser: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // Get total leaderboard entries
      const { data: totalData, count: totalCount } = await supabase
        .from('leaderboard_entries')
        .select('*', { count: 'exact' })

      // Get current month entries
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

      const { data: currentMonthData, count: currentMonthCount } = await supabase
        .from('leaderboard_entries')
        .select('*', { count: 'exact' })
        .eq('year', currentYear)
        .eq('month', currentMonth)

      // Get membership statistics with separate queries
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, membership_type')

      const { data: membershipData } = await supabase
        .from('leaderboard_entries')
        .select('user_id')

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

      // Process membership stats
      const memberStats: { [key: string]: number } = {}
      if (membershipData && profiles) {
        membershipData.forEach(entry => {
          const profile = profiles.find(p => p.user_id === entry.user_id)
          const membershipType = profile?.membership_type || 'Unknown'
          memberStats[membershipType] = (memberStats[membershipType] || 0) + 1
        })
      }

      const statsData = {
        totalEntries: totalCount || 0,
        memberStats,
        currentMonthEntries: currentMonthCount || 0,
        topUser
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gesamt Einträge</p>
              <p className="text-2xl font-bold">{stats.totalEntries}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aktueller Monat</p>
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
              <p className="text-sm font-medium text-gray-600">Top Athlet</p>
              <p className="text-lg font-bold truncate">
                {stats.topUser ? `${stats.topUser.name} (${stats.topUser.count})` : 'Keine Daten'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mitgliedschaften</p>
              <div className="space-y-1">
                {Object.entries(stats.memberStats).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <Badge variant="secondary" className="text-xs">{type}</Badge>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}