import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface LeaderboardEntry {
  user_id: string
  training_count: number
  year: number
  month: number
  display_name: string
}

interface ExtendedStatsDialogProps {
  trigger: React.ReactNode
}

export const ExtendedStatsDialog = ({ trigger }: ExtendedStatsDialogProps) => {
  const [open, setOpen] = useState(false)
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([])
  const [thisYearLeaderboard, setThisYearLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  const loadLeaderboards = async () => {
    setLoading(true)
    try {
      const currentYear = new Date().getFullYear()

      // All time leaderboard - aggregated by user
      const { data: allTimeData } = await supabase
        .from('leaderboard_entries')
        .select(`
          user_id,
          training_count,
          profiles!inner(display_name)
        `)

      // This year leaderboard - aggregated by user for current year
      const { data: thisYearData } = await supabase
        .from('leaderboard_entries')
        .select(`
          user_id,
          training_count,
          profiles!inner(display_name)
        `)
        .eq('year', currentYear)

      // Aggregate all time data by user
      const allTimeAggregated: { [key: string]: { user_id: string, total: number, display_name: string } } = {}
      allTimeData?.forEach(entry => {
        if (!allTimeAggregated[entry.user_id]) {
          allTimeAggregated[entry.user_id] = {
            user_id: entry.user_id,
            total: 0,
            display_name: (entry.profiles as any)?.display_name || 'Unbekannt'
          }
        }
        allTimeAggregated[entry.user_id].total += entry.training_count
      })

      // Aggregate this year data by user
      const thisYearAggregated: { [key: string]: { user_id: string, total: number, display_name: string } } = {}
      thisYearData?.forEach(entry => {
        if (!thisYearAggregated[entry.user_id]) {
          thisYearAggregated[entry.user_id] = {
            user_id: entry.user_id,
            total: 0,
            display_name: (entry.profiles as any)?.display_name || 'Unbekannt'
          }
        }
        thisYearAggregated[entry.user_id].total += entry.training_count
      })

      // Convert to arrays and sort
      const allTimeSorted = Object.values(allTimeAggregated)
        .sort((a, b) => b.total - a.total)
        .slice(0, 20) // Top 20
        .map((entry, index) => ({
          user_id: entry.user_id,
          training_count: entry.total,
          year: 0,
          month: 0,
          display_name: entry.display_name,
          position: index + 1
        }))

      const thisYearSorted = Object.values(thisYearAggregated)
        .sort((a, b) => b.total - a.total)
        .slice(0, 20) // Top 20
        .map((entry, index) => ({
          user_id: entry.user_id,
          training_count: entry.total,
          year: currentYear,
          month: 0,
          display_name: entry.display_name,
          position: index + 1
        }))

      setAllTimeLeaderboard(allTimeSorted)
      setThisYearLeaderboard(thisYearSorted)
    } catch (error) {
      console.error('Error loading leaderboards:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadLeaderboards()
    }
  }, [open])

  const LeaderboardCard = ({ title, data, icon }: { title: string, data: any[], icon: React.ReactNode }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.map((entry, index) => (
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
                  {entry.training_count} Sessions
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Erweiterte Statistiken</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeaderboardCard 
            title="All Time Leaderboard"
            data={allTimeLeaderboard}
            icon={<Trophy className="h-5 w-5 text-yellow-600" />}
          />
          
          <LeaderboardCard 
            title="This Year Leaderboard"
            data={thisYearLeaderboard}
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}