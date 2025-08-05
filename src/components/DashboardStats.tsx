import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User } from "@supabase/supabase-js"
import { CreditCard, Users, Calendar, Clock } from "lucide-react"

interface DashboardStatsProps {
  user: User
}

export const DashboardStats = ({ user }: DashboardStatsProps) => {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [credits, setCredits] = useState<number>(0)
  const [weeklyRegistrations, setWeeklyRegistrations] = useState<number>(0)
  const [monthlyTrainings, setMonthlyTrainings] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setUserProfile(profile)
        
        // Fetch credits for 10er Karte members
        if (profile.membership_type === '10er Karte') {
          const { data: creditsData } = await supabase
            .from('membership_credits')
            .select('credits_remaining')
            .eq('user_id', user.id)
            .single()
          
          if (creditsData) {
            setCredits(creditsData.credits_remaining)
          }
        }
        
        // Fetch weekly registrations for Basic Members
        if (profile.membership_type === 'Basic Member') {
          const { data: weeklyCount } = await supabase
            .rpc('get_weekly_registrations_count', { user_id_param: user.id })
          
          if (weeklyCount !== null) {
            setWeeklyRegistrations(weeklyCount)
          }
        }
      }

      // Fetch monthly training count for leaderboard
      const { data: leaderboardData } = await supabase
        .from('leaderboard_entries')
        .select('training_count')
        .eq('user_id', user.id)
        .eq('year', new Date().getFullYear())
        .eq('month', new Date().getMonth() + 1)
        .single()

      if (leaderboardData) {
        setMonthlyTrainings(leaderboardData.training_count)
      }

      setLoading(false)
    }

    fetchUserData()
  }, [user.id])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Nur für Premium Member andere Statistiken anzeigen */}
      {userProfile?.membership_type === 'Premium Member' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Mitgliedschaft</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Unlimitiert</div>
            <p className="text-xs text-muted-foreground">
              Keine Begrenzung bei Kursanmeldungen
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}