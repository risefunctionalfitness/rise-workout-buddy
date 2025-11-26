import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemberActivity {
  user_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  membership_type: string;
  created_at: string;
  last_activity_date: string | null;
  days_since_signup: number;
  days_since_last_activity: number | null;
  total_bookings: number;
  total_training_sessions: number;
  cancellations: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];
    console.log(`📊 Calculating Risk Radar Snapshot for ${today}...`);

    // ===== 1. Load all members with activity data =====
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, membership_type, created_at')
      .not('membership_type', 'in', '("Administrator","Admin")');

    if (profilesError) throw profilesError;

    const memberActivities: MemberActivity[] = [];

    for (const profile of profiles) {
      // Last activity from course_registrations
      const { data: lastCourse } = await supabase
        .from('course_registrations')
        .select('registered_at, courses(course_date)')
        .eq('user_id', profile.user_id)
        .order('registered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Last activity from training_sessions
      const { data: lastTraining } = await supabase
        .from('training_sessions')
        .select('date')
        .eq('user_id', profile.user_id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determine last activity
      const lastCourseDate = lastCourse?.courses?.course_date || lastCourse?.registered_at;
      const lastTrainingDate = lastTraining?.date;
      const lastActivityDate = [lastCourseDate, lastTrainingDate]
        .filter(Boolean)
        .sort()
        .reverse()[0] || null;

      // Calculate days since account creation
      const signupDate = new Date(profile.created_at);
      const todayDate = new Date(today);
      const daysSinceSignup = Math.floor(
        (todayDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate days since last activity
      let daysSinceLastActivity = null;
      if (lastActivityDate) {
        const lastActDate = new Date(lastActivityDate);
        daysSinceLastActivity = Math.floor(
          (todayDate.getTime() - lastActDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Count registered bookings only
      const { count: bookingsCount } = await supabase
        .from('course_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.user_id)
        .eq('status', 'registered');

      // Count free training (Open Gym QR scans) only
      const { count: trainingsCount } = await supabase
        .from('training_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.user_id)
        .eq('workout_type', 'free_training');

      // Count cancellations
      const { count: cancellationsCount } = await supabase
        .from('course_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.user_id)
        .eq('status', 'cancelled');

      memberActivities.push({
        user_id: profile.user_id,
        display_name: profile.display_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
        membership_type: profile.membership_type,
        created_at: profile.created_at,
        last_activity_date: lastActivityDate,
        days_since_signup: daysSinceSignup,
        days_since_last_activity: daysSinceLastActivity,
        total_bookings: bookingsCount || 0,
        total_training_sessions: trainingsCount || 0,
        cancellations: cancellationsCount || 0,
      });
    }

    // ===== 2. Categorize "Never Active" members =====
    const neverActive = memberActivities.filter(
      (m) => m.last_activity_date === null && m.total_bookings === 0 && m.total_training_sessions === 0
    );

    const neverActiveCounts = {
      days_0_7: neverActive.filter((m) => m.days_since_signup <= 7).length,
      days_8_14: neverActive.filter((m) => m.days_since_signup > 7 && m.days_since_signup <= 14).length,
      days_15_21: neverActive.filter((m) => m.days_since_signup > 14 && m.days_since_signup <= 21).length,
      days_21_plus: neverActive.filter((m) => m.days_since_signup > 21).length,
    };

    const totalNeverActive = neverActive.length;

    // Save "Never Active" snapshot
    const { error: neverActiveSnapshotError } = await supabase
      .from('never_active_snapshots')
      .upsert({
        snapshot_date: today,
        days_0_7_count: neverActiveCounts.days_0_7,
        days_8_14_count: neverActiveCounts.days_8_14,
        days_15_21_count: neverActiveCounts.days_15_21,
        days_21_plus_count: neverActiveCounts.days_21_plus,
        total_never_active: totalNeverActive,
        days_0_7_percentage: totalNeverActive > 0 ? (neverActiveCounts.days_0_7 / totalNeverActive) * 100 : 0,
        days_8_14_percentage: totalNeverActive > 0 ? (neverActiveCounts.days_8_14 / totalNeverActive) * 100 : 0,
        days_15_21_percentage: totalNeverActive > 0 ? (neverActiveCounts.days_15_21 / totalNeverActive) * 100 : 0,
        days_21_plus_percentage: totalNeverActive > 0 ? (neverActiveCounts.days_21_plus / totalNeverActive) * 100 : 0,
      }, { onConflict: 'snapshot_date' });

    if (neverActiveSnapshotError) throw neverActiveSnapshotError;

    // Save "Never Active" details
    const neverActiveDetails = neverActive.map((m) => ({
      user_id: m.user_id,
      snapshot_date: today,
      days_since_signup: m.days_since_signup,
      category:
        m.days_since_signup <= 7
          ? '0-7'
          : m.days_since_signup <= 14
          ? '8-14'
          : m.days_since_signup <= 21
          ? '15-21'
          : '21+',
      display_name: m.display_name,
      first_name: m.first_name,
      last_name: m.last_name,
      membership_type: m.membership_type,
      signup_date: m.created_at.split('T')[0],
    }));

    if (neverActiveDetails.length > 0) {
      const { error: neverActiveDetailsError } = await supabase
        .from('never_active_member_details')
        .upsert(neverActiveDetails, { onConflict: 'user_id,snapshot_date' });

      if (neverActiveDetailsError) throw neverActiveDetailsError;
    }

    // ===== 3. Categorize "Inactive" members (was active before) =====
    const previouslyActive = memberActivities.filter((m) => m.last_activity_date !== null);

    const inactiveCounts = {
      active_under_10: previouslyActive.filter((m) => m.days_since_last_activity! < 10).length,
      days_10_15: previouslyActive.filter((m) => m.days_since_last_activity! >= 10 && m.days_since_last_activity! <= 15).length,
      days_15_21: previouslyActive.filter((m) => m.days_since_last_activity! > 15 && m.days_since_last_activity! <= 21).length,
      days_21_plus: previouslyActive.filter((m) => m.days_since_last_activity! > 21).length,
    };

    const totalPreviouslyActive = previouslyActive.length;

    // Save "Inactive" snapshot
    const { error: inactiveSnapshotError } = await supabase
      .from('inactive_member_snapshots')
      .upsert({
        snapshot_date: today,
        active_under_10_count: inactiveCounts.active_under_10,
        days_10_15_count: inactiveCounts.days_10_15,
        days_15_21_count: inactiveCounts.days_15_21,
        days_21_plus_count: inactiveCounts.days_21_plus,
        total_previously_active: totalPreviouslyActive,
        active_under_10_percentage: totalPreviouslyActive > 0 ? (inactiveCounts.active_under_10 / totalPreviouslyActive) * 100 : 0,
        days_10_15_percentage: totalPreviouslyActive > 0 ? (inactiveCounts.days_10_15 / totalPreviouslyActive) * 100 : 0,
        days_15_21_percentage: totalPreviouslyActive > 0 ? (inactiveCounts.days_15_21 / totalPreviouslyActive) * 100 : 0,
        days_21_plus_percentage: totalPreviouslyActive > 0 ? (inactiveCounts.days_21_plus / totalPreviouslyActive) * 100 : 0,
      }, { onConflict: 'snapshot_date' });

    if (inactiveSnapshotError) throw inactiveSnapshotError;

    // Save "Inactive" details
    const inactiveDetails = previouslyActive.map((m) => ({
      user_id: m.user_id,
      snapshot_date: today,
      days_since_last_activity: m.days_since_last_activity!,
      category:
        m.days_since_last_activity! < 10
          ? 'active'
          : m.days_since_last_activity! <= 15
          ? '10-15'
          : m.days_since_last_activity! <= 21
          ? '15-21'
          : '21+',
      display_name: m.display_name,
      first_name: m.first_name,
      last_name: m.last_name,
      membership_type: m.membership_type,
      last_activity_date: m.last_activity_date,
      total_bookings: m.total_bookings,
      total_training_sessions: m.total_training_sessions,
      cancellations: m.cancellations,
    }));

    if (inactiveDetails.length > 0) {
      const { error: inactiveDetailsError } = await supabase
        .from('inactive_member_details')
        .upsert(inactiveDetails, { onConflict: 'user_id,snapshot_date' });

      if (inactiveDetailsError) throw inactiveDetailsError;
    }

    console.log(`✅ Risk Radar Snapshot saved for ${today}`);
    console.log(`📊 Never Active: ${totalNeverActive} members`);
    console.log(`📊 Previously Active: ${totalPreviouslyActive} members`);

    return new Response(
      JSON.stringify({
        success: true,
        snapshot_date: today,
        never_active: {
          total: totalNeverActive,
          categories: neverActiveCounts,
        },
        inactive: {
          total: totalPreviouslyActive,
          categories: inactiveCounts,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error calculating risk radar snapshot:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
