import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Course {
  id: string;
  title: string;
  max_participants: number;
  registered_count: number;
  waitlisted_count: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Starting waitlist processing...');

    // Get all courses with waitlisted participants
    const { data: coursesWithWaitlists, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        max_participants,
        course_registrations!inner(status)
      `)
      .gte('course_date', new Date().toISOString().split('T')[0])
      .eq('course_registrations.status', 'waitlisted');

    if (coursesError) {
      console.error('❌ Error fetching courses:', coursesError);
      throw coursesError;
    }

    if (!coursesWithWaitlists || coursesWithWaitlists.length === 0) {
      console.log('✅ No courses with waitlists found');
      return new Response(
        JSON.stringify({ message: 'No courses with waitlists found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${coursesWithWaitlists.length} courses with waitlists`);

    let totalProcessed = 0;
    let totalPromoted = 0;

    // Process each course
    for (const course of coursesWithWaitlists) {
      try {
        console.log(`🏃‍♂️ Processing course: ${course.title} (${course.id})`);

        // Get current registration counts
        const { data: registrations, error: regError } = await supabase
          .from('course_registrations')
          .select('status')
          .eq('course_id', course.id);

        if (regError) {
          console.error(`❌ Error fetching registrations for course ${course.id}:`, regError);
          continue;
        }

        const registeredCount = registrations?.filter(r => r.status === 'registered').length || 0;
        const waitlistedCount = registrations?.filter(r => r.status === 'waitlisted').length || 0;
        const availableSpots = course.max_participants - registeredCount;

        console.log(`📊 Course ${course.title}: ${registeredCount}/${course.max_participants} registered, ${waitlistedCount} waitlisted, ${availableSpots} spots available`);

        if (availableSpots <= 0 || waitlistedCount === 0) {
          console.log(`⏭️ Skipping course ${course.title}: no spots or no waitlist`);
          continue;
        }

        // Get waitlisted users ordered by registration time
        const { data: waitlistedUsers, error: waitlistError } = await supabase
          .from('course_registrations')
          .select('id, user_id, registered_at')
          .eq('course_id', course.id)
          .eq('status', 'waitlisted')
          .order('registered_at', { ascending: true })
          .limit(availableSpots);

        if (waitlistError) {
          console.error(`❌ Error fetching waitlisted users for course ${course.id}:`, waitlistError);
          continue;
        }

        if (!waitlistedUsers || waitlistedUsers.length === 0) {
          console.log(`⏭️ No waitlisted users found for course ${course.title}`);
          continue;
        }

        const usersToPromote = Math.min(waitlistedUsers.length, availableSpots);
        console.log(`🎯 Promoting ${usersToPromote} users from waitlist for course ${course.title}`);

        // Promote users from waitlist to registered
        for (let i = 0; i < usersToPromote; i++) {
          const user = waitlistedUsers[i];
          
          const { error: updateError } = await supabase
            .from('course_registrations')
            .update({ 
              status: 'registered',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error(`❌ Error promoting user ${user.user_id} for course ${course.id}:`, updateError);
            continue;
          }

          console.log(`✅ Promoted user ${user.user_id} from waitlist to registered for course ${course.title}`);
          totalPromoted++;
        }

        totalProcessed++;

      } catch (courseError) {
        console.error(`❌ Error processing course ${course.id}:`, courseError);
        continue;
      }
    }

    const result = {
      message: 'Waitlist processing completed',
      coursesProcessed: totalProcessed,
      usersPromoted: totalPromoted,
      timestamp: new Date().toISOString()
    };

    console.log(`🎉 Waitlist processing completed: ${totalProcessed} courses processed, ${totalPromoted} users promoted`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error in waitlist processing:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process waitlists', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});