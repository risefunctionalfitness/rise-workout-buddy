import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { startOfMonth, subMonths, format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

interface MonthlyTrainingData {
  month: string        // "J", "F", "M", etc.
  monthNumber: number  // 1-12
  trainingDays: number // Anzahl Tage
}

interface YearlyTrainingHeatmapProps {
  userId: string
}

export const YearlyTrainingHeatmap: React.FC<YearlyTrainingHeatmapProps> = ({ userId }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyTrainingData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    loadTrainingData()
  }, [userId])

  const loadTrainingData = async () => {
    try {
      const endDate = new Date()
      const startDate = subMonths(endDate, 11) // Letzte 12 Monate

      const { data, error } = await supabase
        .from('training_sessions')
        .select('date')
        .eq('user_id', userId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))

      if (error) throw error

      // Gruppiere nach Monat
      const monthMap = new Map<string, number>()
      
      data?.forEach(session => {
        const monthKey = format(new Date(session.date), 'yyyy-MM')
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1)
      })

      // Erstelle Array für letzte 12 Monate
      const result: MonthlyTrainingData[] = []
      for (let i = 11; i >= 0; i--) {
        const month = subMonths(endDate, i)
        const monthKey = format(month, 'yyyy-MM')
        const monthNumber = month.getMonth() + 1
        
        result.push({
          month: format(month, 'MMM').charAt(0), // Erster Buchstabe
          monthNumber,
          trainingDays: monthMap.get(monthKey) || 0
        })
      }

      setMonthlyData(result)
    } catch (error) {
      console.error('Error loading training data:', error)
      setMonthlyData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Skeleton className="h-32 bg-muted/30 rounded" />
    )
  }

  return (
    <div className="min-h-[200px] bg-muted/30 rounded-lg p-2">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={monthlyData}
          margin={{ left: 0, right: 10, top: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            stroke="currentColor"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            domain={[0, 'dataMax + 2']}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [`${value}`, 'Trainingstage']}
          />
          <Line
            type="monotone"
            dataKey="trainingDays"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
