import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workoutType, sessionType, duration, focus, userId = 'demo-user' } = await req.json();
    console.log(`Loading workout for user: ${userId} Type: ${workoutType} Session: ${sessionType} Duration: ${duration} Focus: ${focus}`);

    // Validate userId format for real users
    if (userId !== 'demo-user') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        throw new Error('Ungültige User-ID Format');
      }
    }

    // 1. Profildaten des Users laden (skip for demo user)
    let profile = null;
    if (userId !== 'demo-user') {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Profil nicht gefunden');
      }
      profile = profileData;
      console.log('User profile loaded:', profile);
    } else {
      // Demo profile for light version
      profile = {
        fitness_level: 'intermediate',
        weight_kg: 70,
        birth_year: 1990,
        gender: 'unspecified',
        preferred_exercises: []
      };
      console.log('Using demo profile for light version');
    }

    // 2. Workout aus der Datenbank basierend auf Parametern suchen
    const focusAreaMapped = mapFocusArea(focus);
    const sessionTypeMapped = mapSessionType(sessionType || 'full_session');
    
    console.log('Searching for workouts with:', {
      workout_type: workoutType,
      session_type: sessionTypeMapped,
      focus_area: focusAreaMapped,
      duration_range: [duration - 10, duration + 10]
    });

    // Suche passende Workouts in der Datenbank
    let { data: matchingWorkouts, error: searchError } = await supabase
      .from('workouts')
      .select('*')
      .eq('workout_type', workoutType)
      .eq('session_type', sessionTypeMapped)
      .eq('focus_area', focusAreaMapped)
      .gte('duration_minutes', Math.max(5, duration - 10))
      .lte('duration_minutes', duration + 10)
      .order('duration_minutes');

    if (searchError) {
      console.error('Search error:', searchError);
      throw new Error('Fehler beim Suchen in der Datenbank');
    }

    // Falls keine exakte Treffer, erweitere die Suche
    if (!matchingWorkouts || matchingWorkouts.length === 0) {
      console.log('No exact matches, expanding search...');
      
      const { data: expandedSearch, error: expandedError } = await supabase
        .from('workouts')
        .select('*')
        .eq('workout_type', workoutType)
        .eq('focus_area', focusAreaMapped)
        .order('duration_minutes');

      if (expandedError) {
        console.error('Expanded search error:', expandedError);
        throw new Error('Keine passenden Workouts gefunden');
      }

      matchingWorkouts = expandedSearch;
    }

    if (!matchingWorkouts || matchingWorkouts.length === 0) {
      throw new Error('Keine passenden Workouts in der Datenbank gefunden');
    }

    // 3. Bestes Workout auswählen (nächste Dauer zum gewünschten Wert)
    const selectedWorkout = matchingWorkouts.reduce((best, current) => {
      const bestDiff = Math.abs(best.duration_minutes - duration);
      const currentDiff = Math.abs(current.duration_minutes - duration);
      return currentDiff < bestDiff ? current : best;
    });

    console.log('Selected workout:', selectedWorkout.title, 'Duration:', selectedWorkout.duration_minutes);

    // 4. Training Session erstellen (nur für echte User)
    if (userId !== 'demo-user') {
      const { error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          user_id: userId,
          date: new Date().toISOString().split('T')[0],
          workout_type: `${workoutType}_${sessionType || 'full_session'}`,
          workout_data: {
            workout_id: selectedWorkout.id,
            title: selectedWorkout.title,
            type: selectedWorkout.workout_type,
            duration: selectedWorkout.duration_minutes
          },
          status: 'pending'
        });

      if (sessionError) {
        console.error('Session save error:', sessionError);
      } else {
        console.log('Training session saved successfully');
      }
    }

    // 5. Workout-ID zurückgeben für die neue Display-Komponente
    return new Response(JSON.stringify({ 
      workout_id: selectedWorkout.id,
      workout: {
        name: selectedWorkout.title,
        type: selectedWorkout.workout_type,
        duration: selectedWorkout.duration_minutes,
        focus: selectedWorkout.focus_area,
        difficulty: selectedWorkout.difficulty_level
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-workout function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper Funktionen für Mapping
function mapFocusArea(focus: string): string {
  switch (focus?.toLowerCase()) {
    case 'ganzkörper':
    case 'full_body':
      return 'full_body';
    case 'oberkörper':
    case 'upper_body':
      return 'upper_body';
    case 'unterkörper':
    case 'lower_body':
      return 'lower_body';
    default:
      return 'full_body';
  }
}

function mapSessionType(sessionType: string): string {
  switch (sessionType?.toLowerCase()) {
    case 'wod_only':
      return 'wod_only';
    case 'strength_only':
      return 'strength_only';
    case 'weightlifting_only':
      return 'weightlifting_only';
    case 'full_session':
    default:
      return 'full_session';
  }
}