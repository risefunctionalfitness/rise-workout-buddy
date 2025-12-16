import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting weekly streaks backfill...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all users with weekly_streaks entries
    const { data: streakUsers, error: streakError } = await supabase
      .from('weekly_streaks')
      .select('user_id, weekly_goal')

    if (streakError) {
      console.error('Error fetching streak users:', streakError)
      throw streakError
    }

    console.log(`Found ${streakUsers?.length || 0} users with streak entries`)

    const results = []

    for (const streakUser of streakUsers || []) {
      const userId = streakUser.user_id
      const weeklyGoal = streakUser.weekly_goal || 2

      console.log(`Processing user ${userId} with goal ${weeklyGoal}`)

      // Get all training sessions for this user in the last 52 weeks
      const fiftyTwoWeeksAgo = new Date()
      fiftyTwoWeeksAgo.setDate(fiftyTwoWeeksAgo.getDate() - 364)
      
      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('date, status')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('date', fiftyTwoWeeksAgo.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (sessionsError) {
        console.error(`Error fetching sessions for user ${userId}:`, sessionsError)
        continue
      }

      // Group sessions by week (Monday-Sunday)
      const weeklyTrainings: { [weekStart: string]: number } = {}
      
      for (const session of sessions || []) {
        const sessionDate = new Date(session.date)
        // Get Monday of that week
        const dayOfWeek = sessionDate.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0
        const monday = new Date(sessionDate)
        monday.setDate(sessionDate.getDate() - diff)
        const weekKey = monday.toISOString().split('T')[0]
        
        weeklyTrainings[weekKey] = (weeklyTrainings[weekKey] || 0) + 1
      }

      console.log(`User ${userId} has trainings in ${Object.keys(weeklyTrainings).length} weeks`)

      // Calculate current streak by going backwards from current week
      const now = new Date()
      const currentDayOfWeek = now.getDay()
      const currentDiff = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
      const currentMonday = new Date(now)
      currentMonday.setDate(now.getDate() - currentDiff)
      currentMonday.setHours(0, 0, 0, 0)

      // Start from last week (completed week)
      let checkMonday = new Date(currentMonday)
      checkMonday.setDate(checkMonday.getDate() - 7)
      
      let currentStreak = 0
      let streakStartedAt: string | null = null
      let longestStreak = 0
      let tempStreak = 0
      let tempStreakStart: string | null = null

      // Go through all weeks from oldest to newest to find longest streak
      const allWeeks = Object.keys(weeklyTrainings).sort()
      
      for (const weekKey of allWeeks) {
        const trainings = weeklyTrainings[weekKey]
        if (trainings >= weeklyGoal) {
          if (tempStreak === 0) {
            tempStreakStart = weekKey
          }
          tempStreak++
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak
          }
        } else {
          tempStreak = 0
          tempStreakStart = null
        }
      }

      // Calculate current streak by going backwards from last completed week
      currentStreak = 0
      streakStartedAt = null
      
      while (true) {
        const weekKey = checkMonday.toISOString().split('T')[0]
        const trainings = weeklyTrainings[weekKey] || 0
        
        console.log(`  Week ${weekKey}: ${trainings} trainings (goal: ${weeklyGoal})`)
        
        if (trainings >= weeklyGoal) {
          currentStreak++
          streakStartedAt = weekKey
          // Go to previous week
          checkMonday.setDate(checkMonday.getDate() - 7)
          
          // Safety limit - don't go back more than 52 weeks
          if (currentStreak > 52) break
        } else {
          break
        }
      }

      // Ensure longest_streak is at least current_streak
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
      }

      console.log(`User ${userId}: current_streak=${currentStreak}, longest_streak=${longestStreak}, started_at=${streakStartedAt}`)

      // Update the weekly_streaks table
      const { error: updateError } = await supabase
        .from('weekly_streaks')
        .update({
          current_streak: currentStreak,
          longest_streak: longestStreak,
          streak_started_at: streakStartedAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error(`Error updating streak for user ${userId}:`, updateError)
        results.push({ userId, success: false, error: updateError.message })
      } else {
        results.push({ 
          userId, 
          success: true, 
          current_streak: currentStreak, 
          longest_streak: longestStreak,
          streak_started_at: streakStartedAt
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`Backfill complete. Success: ${successCount}, Failed: ${failCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill complete. Updated ${successCount} users, ${failCount} failed.`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in backfill-weekly-streaks:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
