import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "@/integrations/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"
import { timezone } from "@/lib/timezone"

interface MonthlyData {
  month: string
  total: number
  'Basic Member': number
  'Premium Member': number
  'Wellpass': number
  '10er Karte': number
  'Open Gym': number
}

export const MonthlyRegistrationsChart = () => {
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMonthlyRegistrations()
  }, [])

  const loadMonthlyRegistrations = async () => {
    try {
      setLoading(true)
      
      // Get current date in Berlin timezone
      const now = timezone.nowInBerlin()
      
      // Get check-ins from leaderboard_entries for the last 12 months
      const { data: leaderboardData, error } = await supabase
        .from('leaderboard_entries')
        .select('user_id, year, month, training_count')
        .gte('year', now.getFullYear() - 1)
      
      if (error) throw error
      
      // Get all user profiles to map membership types
      const userIds = leaderboardData?.map(entry => entry.user_id) || []
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, membership_type')
        .in('user_id', userIds)
      
      // Create membership map
      const membershipMap = new Map(
        profiles?.map(p => [p.user_id, p.membership_type]) || []
      )
      
      // Create array of last 12 months (oldest to newest, so current month is on the right)
      const months: MonthlyData[] = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        
        // Get all entries for this month
        const monthEntries = leaderboardData?.filter(entry => 
          entry.year === year && entry.month === month
        ) || []
        
        // Count by membership type
        const basicCount = monthEntries
          .filter(e => membershipMap.get(e.user_id) === 'Basic Member')
          .reduce((sum, e) => sum + e.training_count, 0)
        
        const premiumCount = monthEntries
          .filter(e => membershipMap.get(e.user_id) === 'Premium Member')
          .reduce((sum, e) => sum + e.training_count, 0)
        
        const wellpassCount = monthEntries
          .filter(e => membershipMap.get(e.user_id) === 'Wellpass')
          .reduce((sum, e) => sum + e.training_count, 0)
        
        const tenCardCount = monthEntries
          .filter(e => membershipMap.get(e.user_id) === '10er Karte')
          .reduce((sum, e) => sum + e.training_count, 0)
        
        const openGymCount = monthEntries
          .filter(e => {
            const type = membershipMap.get(e.user_id)
            return type === 'Open Gym' || type === 'Trainer'
          })
          .reduce((sum, e) => sum + e.training_count, 0)
        
        // Total is sum of all training_count for this month
        const total = monthEntries.reduce((sum, e) => sum + e.training_count, 0)
        
        // Format month name (e.g., "Okt '25")
        const monthName = date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
        
        months.push({
          month: monthName,
          total,
          'Basic Member': basicCount,
          'Premium Member': premiumCount,
          'Wellpass': wellpassCount,
          '10er Karte': tenCardCount,
          'Open Gym': openGymCount
        })
      }
      
      setData(months)
    } catch (error) {
      console.error('Error loading monthly registrations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Anmeldungen der letzten 12 Monate</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Calculate max value for scale
  const maxValue = Math.max(...data.map(item => item.total))
  const scaleMax = Math.max(maxValue * 1.2, 50)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-ins der letzten 12 Monate</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis 
              domain={[0, scaleMax]} 
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            
            {/* Total line - thick and prominent */}
            <Line 
              type="monotone" 
              dataKey="total" 
              name="Gesamt"
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", r: 5 }}
              activeDot={{ r: 7 }}
            />
            
            {/* Basic Member line */}
            <Line 
              type="monotone" 
              dataKey="Basic Member" 
              name="Basic Member"
              stroke="hsl(142, 76%, 36%)" 
              strokeWidth={2}
              dot={{ fill: "hsl(142, 76%, 36%)", r: 3 }}
              activeDot={{ r: 5 }}
            />
            
            {/* Premium Member line */}
            <Line 
              type="monotone" 
              dataKey="Premium Member" 
              name="Premium Member"
              stroke="hsl(45, 93%, 47%)" 
              strokeWidth={2}
              dot={{ fill: "hsl(45, 93%, 47%)", r: 3 }}
              activeDot={{ r: 5 }}
            />
            
            {/* Wellpass line */}
            <Line 
              type="monotone" 
              dataKey="Wellpass" 
              name="Wellpass"
              stroke="hsl(185, 100%, 33%)" 
              strokeWidth={2}
              dot={{ fill: "hsl(185, 100%, 33%)", r: 3 }}
              activeDot={{ r: 5 }}
            />
            
            {/* 10er Karte line */}
            <Line 
              type="monotone" 
              dataKey="10er Karte" 
              name="10er Karte"
              stroke="hsl(0, 0%, 0%)" 
              strokeWidth={2}
              dot={{ fill: "hsl(0, 0%, 0%)", r: 3 }}
              activeDot={{ r: 5 }}
            />
            
            {/* Open Gym line - with darker stroke for visibility */}
            <Line 
              type="monotone" 
              dataKey="Open Gym" 
              name="Open Gym"
              stroke="hsl(0, 0%, 50%)" 
              strokeWidth={2}
              dot={{ fill: "hsl(0, 0%, 50%)", r: 3 }}
              activeDot={{ r: 5 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
