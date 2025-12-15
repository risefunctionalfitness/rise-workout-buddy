import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting weekly streak calculation...')

    // Get all users with streak entries
    const { data: streakEntries, error: fetchError } = await supabase
      .from('weekly_streaks')
      .select('*')

    if (fetchError) {
      throw new Error(`Error fetching streak entries: ${fetchError.message}`)
    }

    if (!streakEntries || streakEntries.length === 0) {
      console.log('No streak entries found')
      return new Response(
        JSON.stringify({ success: true, message: 'No streak entries to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${streakEntries.length} streak entries`)

    // Calculate last week's date range (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    
    // Go back to this Monday, then back 7 more days to get last Monday
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - daysToLastMonday - 7)
    lastMonday.setHours(0, 0, 0, 0)
    
    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)
    lastSunday.setHours(23, 59, 59, 999)

    const lastMondayStr = lastMonday.toISOString().split('T')[0]
    const lastSundayStr = lastSunday.toISOString().split('T')[0]

    console.log(`Checking trainings from ${lastMondayStr} to ${lastSundayStr}`)

    const results = {
      processed: 0,
      streaksIncremented: 0,
      freezesUsed: 0,
      streaksReset: 0,
      freezesAwarded: 0,
    }

    for (const entry of streakEntries) {
      try {
        // Count trainings for this user in the last week
        const { count: trainingCount, error: countError } = await supabase
          .from('training_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', entry.user_id)
          .eq('status', 'completed')
          .gte('date', lastMondayStr)
          .lte('date', lastSundayStr)

        if (countError) {
          console.error(`Error counting trainings for user ${entry.user_id}:`, countError)
          continue
        }

        const trainings = trainingCount || 0
        const goalMet = trainings >= entry.weekly_goal

        console.log(`User ${entry.user_id}: ${trainings}/${entry.weekly_goal} trainings, goal met: ${goalMet}`)

        const updateData: any = {
          updated_at: new Date().toISOString(),
        }

        if (goalMet) {
          // Goal met - increment streak
          const newStreak = (entry.current_streak || 0) + 1
          updateData.current_streak = newStreak
          updateData.last_week_completed = lastMondayStr

          // Set streak_started_at if this is the first week
          if (!entry.streak_started_at || entry.current_streak === 0) {
            updateData.streak_started_at = lastMondayStr
          }

          // Update longest streak if needed
          if (newStreak > (entry.longest_streak || 0)) {
            updateData.longest_streak = newStreak
          }

          // Award freeze every 4 weeks (max 2)
          if (newStreak % 4 === 0 && (entry.streak_freezes || 0) < 2) {
            updateData.streak_freezes = (entry.streak_freezes || 0) + 1
            results.freezesAwarded++
            console.log(`Awarding freeze to user ${entry.user_id} for reaching ${newStreak} weeks`)
          }

          results.streaksIncremented++
        } else {
          // Goal not met - check for freeze
          if ((entry.streak_freezes || 0) > 0) {
            // Use freeze
            updateData.streak_freezes = entry.streak_freezes - 1
            updateData.freezes_used_total = (entry.freezes_used_total || 0) + 1
            results.freezesUsed++
            console.log(`Using freeze for user ${entry.user_id}, ${updateData.streak_freezes} freezes remaining`)
          } else {
            // Reset streak
            updateData.current_streak = 0
            updateData.streak_started_at = null
            results.streaksReset++
            console.log(`Resetting streak for user ${entry.user_id}`)
          }
        }

        // Update the entry
        const { error: updateError } = await supabase
          .from('weekly_streaks')
          .update(updateData)
          .eq('id', entry.id)

        if (updateError) {
          console.error(`Error updating streak for user ${entry.user_id}:`, updateError)
        } else {
          results.processed++
        }
      } catch (err) {
        console.error(`Error processing user ${entry.user_id}:`, err)
      }
    }

    console.log('Weekly streak calculation completed:', results)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Weekly streaks calculated',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in calculate-weekly-streaks:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
