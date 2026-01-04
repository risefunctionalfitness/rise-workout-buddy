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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for initial sync parameter (sync all historical data)
    const url = new URL(req.url)
    const isInitialSync = url.searchParams.get('initial') === 'true'
    const daysBack = isInitialSync ? 90 : 7

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const cutoffDate = new Date(today)
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)
    const cutoffStr = cutoffDate.toISOString().split('T')[0]

    console.log(`Syncing course trainings from ${cutoffStr} to ${todayStr} (initial: ${isInitialSync})`)

    // Get all past courses in the date range
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, course_date, end_time')
      .lt('course_date', todayStr)
      .gte('course_date', cutoffStr)
      .eq('is_cancelled', false)

    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
      throw coursesError
    }

    console.log(`Found ${courses?.length || 0} past courses to process`)

    let sessionsCreated = 0
    let sessionsSkipped = 0
    let leaderboardUpdates = 0

    for (const course of courses || []) {
      // Check if course has actually ended (combine date and end_time)
      const courseEndDateTime = new Date(`${course.course_date}T${course.end_time}`)
      if (courseEndDateTime > new Date()) {
        console.log(`Skipping course ${course.id} - not yet ended`)
        continue
      }

      // Get all registered participants for this course (exclude no-shows)
      const { data: registrations, error: regError } = await supabase
        .from('course_registrations')
        .select('user_id, attendance_status')
        .eq('course_id', course.id)
        .eq('status', 'registered')

      if (regError) {
        console.error(`Error fetching registrations for course ${course.id}:`, regError)
        continue
      }

      // Filter out no-shows - they don't get points
      const eligibleRegistrations = (registrations || []).filter(
        reg => reg.attendance_status !== 'no_show'
      )

      for (const reg of eligibleRegistrations) {
        // Check if training session already exists for this user on this date
        const { data: existingSession, error: checkError } = await supabase
          .from('training_sessions')
          .select('id')
          .eq('user_id', reg.user_id)
          .eq('date', course.course_date)
          .maybeSingle()

        if (checkError) {
          console.error(`Error checking existing session for user ${reg.user_id}:`, checkError)
          continue
        }

        if (existingSession) {
          sessionsSkipped++
          continue
        }

        // Create training session
        const { error: insertError } = await supabase
          .from('training_sessions')
          .insert({
            user_id: reg.user_id,
            date: course.course_date,
            workout_type: 'course',
            status: 'completed'
          })

        if (insertError) {
          // Handle duplicate key gracefully (race condition)
          if (!insertError.message?.includes('duplicate key')) {
            console.error(`Error creating session for user ${reg.user_id}:`, insertError)
          }
          continue
        }

        sessionsCreated++

        // Update leaderboard entry
        const sessionDate = new Date(course.course_date)
        const month = sessionDate.getMonth() + 1
        const year = sessionDate.getFullYear()

        const { error: leaderboardError } = await supabase.rpc('update_leaderboard_entry', {
          user_id_param: reg.user_id,
          session_date: course.course_date
        })

        if (leaderboardError) {
          console.error(`Error updating leaderboard for user ${reg.user_id}:`, leaderboardError)
        } else {
          leaderboardUpdates++
        }
      }
    }

    const result = {
      success: true,
      coursesProcessed: courses?.length || 0,
      sessionsCreated,
      sessionsSkipped,
      leaderboardUpdates,
      dateRange: { from: cutoffStr, to: todayStr },
      isInitialSync
    }

    console.log('Sync completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in sync-course-trainings:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
