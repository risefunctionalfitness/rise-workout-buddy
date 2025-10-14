import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "@/integrations/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"
import { timezone } from "@/lib/timezone"

interface MonthlyData {
  month: string
  registrations: number
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
      
      // Calculate date 12 months ago
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      const startDate = timezone.formatInBerlin(twelveMonthsAgo, 'yyyy-MM-dd')
      
      // Get all registrations from the last 12 months with a single query
      const { data: registrations, error } = await supabase
        .from('course_registrations')
        .select('registered_at')
        .gte('registered_at', startDate)
      
      if (error) throw error
      
      // Create array of last 12 months (oldest to newest, so current month is on the right)
      const months: MonthlyData[] = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        
        // Count registrations for this month
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
        
        const count = registrations?.filter(r => {
          const regDate = r.registered_at
          return regDate >= monthStart && regDate < monthEnd
        }).length || 0
        
        // Format month name (e.g., "Okt '25")
        const monthName = date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
        
        months.push({
          month: monthName,
          registrations: count
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
  const maxValue = Math.max(...data.map(item => item.registrations))
  const scaleMax = Math.max(maxValue * 1.2, 50)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anmeldungen der letzten 12 Monate</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            <Line 
              type="monotone" 
              dataKey="registrations" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
