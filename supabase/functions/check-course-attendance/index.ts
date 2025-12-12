import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MINIMUM_PARTICIPANTS = 3

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting course attendance check...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const webhookUrl = Deno.env.get('MAKE_COURSE_CANCELLATION_WEBHOOK_URL')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current time in Europe/Berlin timezone
    const now = new Date()
    const berlinTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
    const nowDate = berlinTime.toISOString().split('T')[0]
    const nowTime = berlinTime.toTimeString().slice(0, 8)

    console.log(`Current time (Berlin): ${nowDate} ${nowTime}`)

    // Find courses where:
    // 1. Course is today or in the future
    // 2. Registration deadline has passed (course_start - registration_deadline_minutes < now)
    // 3. Less than 3 registered participants
    // 4. Not already cancelled for low attendance
    // 5. Not already cancelled in general
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        course_date,
        start_time,
        end_time,
        trainer,
        registration_deadline_minutes,
        max_participants,
        is_cancelled,
        cancelled_due_to_low_attendance
      `)
      .eq('is_cancelled', false)
      .eq('cancelled_due_to_low_attendance', false)
      .gte('course_date', nowDate)
      .order('course_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
      throw coursesError
    }

    console.log(`Found ${courses?.length || 0} potential courses to check`)

    const cancelledCourses = []

    for (const course of courses || []) {
      // Calculate registration deadline
      const courseStart = new Date(`${course.course_date}T${course.start_time}`)
      const registrationDeadline = new Date(courseStart.getTime() - (course.registration_deadline_minutes * 60 * 1000))
      
      // Check if registration deadline has passed
      if (now < registrationDeadline) {
        console.log(`Course ${course.title} (${course.course_date}): Registration deadline not yet passed`)
        continue
      }

      // Count registered participants
      const { count, error: countError } = await supabase
        .from('course_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id)
        .eq('status', 'registered')

      if (countError) {
        console.error(`Error counting participants for course ${course.id}:`, countError)
        continue
      }

      const registeredCount = count || 0
      console.log(`Course ${course.title} (${course.course_date} ${course.start_time}): ${registeredCount} registered participants`)

      // Check if less than minimum participants
      if (registeredCount < MINIMUM_PARTICIPANTS) {
        console.log(`Course ${course.title} has less than ${MINIMUM_PARTICIPANTS} participants - cancelling...`)

        // Mark course as cancelled due to low attendance
        const { error: updateError } = await supabase
          .from('courses')
          .update({ cancelled_due_to_low_attendance: true })
          .eq('id', course.id)

        if (updateError) {
          console.error(`Error updating course ${course.id}:`, updateError)
          continue
        }

        console.log(`Marked course ${course.id} as cancelled due to low attendance`)

        // Cancel all registrations for this course (so no credits are deducted and no leaderboard points given)
        const { error: cancelRegError } = await supabase
          .from('course_registrations')
          .update({ status: 'cancelled' })
          .eq('course_id', course.id)
          .in('status', ['registered', 'waitlist'])

        if (cancelRegError) {
          console.error(`Error cancelling registrations for course ${course.id}:`, cancelRegError)
        } else {
          console.log(`Cancelled all registrations for course ${course.id}`)
        }

        // Get participant details for notification
        const { data: registrations, error: regError } = await supabase
          .from('course_registrations')
          .select('user_id')
          .eq('course_id', course.id)
          .in('status', ['registered', 'waitlist'])

        if (regError) {
          console.error(`Error fetching registrations for course ${course.id}:`, regError)
          continue
        }

        const userIds = registrations?.map(r => r.user_id) || []
        
        // Get user profiles with emails
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, email')
          .in('user_id', userIds)

        if (profileError) {
          console.error(`Error fetching profiles:`, profileError)
          continue
        }

        const participants = profiles?.map(p => ({
          email: p.email,
          first_name: p.first_name || p.display_name || 'Mitglied',
          display_name: p.display_name
        })).filter(p => p.email) || []

        // Send webhook to Make.com if configured
        if (webhookUrl && participants.length > 0) {
          try {
            const webhookPayload = {
              event_type: 'course_cancelled_low_attendance',
              course: {
                id: course.id,
                title: course.title,
                date: course.course_date,
                start_time: course.start_time,
                end_time: course.end_time,
                trainer: course.trainer
              },
              registered_count: registeredCount,
              minimum_required: MINIMUM_PARTICIPANTS,
              participants: participants,
              cancelled_at: new Date().toISOString()
            }

            console.log('Sending webhook payload:', JSON.stringify(webhookPayload))

            const webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookPayload)
            })

            if (!webhookResponse.ok) {
              console.error(`Webhook failed with status ${webhookResponse.status}`)
            } else {
              console.log(`Webhook sent successfully for course ${course.title}`)
            }
          } catch (webhookError) {
            console.error('Error sending webhook:', webhookError)
          }
        } else if (!webhookUrl) {
          console.log('No webhook URL configured - skipping notification')
        }

        cancelledCourses.push({
          id: course.id,
          title: course.title,
          date: course.course_date,
          time: course.start_time,
          registered_count: registeredCount,
          participants_notified: participants.length
        })
      }
    }

    console.log(`Cancelled ${cancelledCourses.length} courses due to low attendance`)

    return new Response(
      JSON.stringify({
        success: true,
        checked_at: now.toISOString(),
        cancelled_courses: cancelledCourses,
        message: `Checked courses. Cancelled ${cancelledCourses.length} courses due to low attendance.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in check-course-attendance:', error)
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
