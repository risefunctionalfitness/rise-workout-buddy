import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workoutType, sessionType, duration, focus, userId } = await req.json();
    console.log('Generating workout for user:', userId, 'Type:', workoutType, 'Session:', sessionType, 'Duration:', duration, 'Focus:', focus);

    // 1. Profildaten des Users laden
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Profil nicht gefunden');
    }

    console.log('User profile loaded:', profile);

    // 2. Prompt für ähnliche Workouts erstellen
    const searchPrompt = `${workoutType} ${sessionType || ''} workout ${duration} minutes ${focus}`;

    // 3. Embedding für die Suche generieren
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: searchPrompt,
      }),
    });

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 4. Ähnliche Workouts suchen (Vector similarity search)
    const { data: similarWorkouts, error: searchError } = await supabase.rpc('match_workouts', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5
    });

    if (searchError) {
      console.error('Search error:', searchError);
      // Fallback: Einfache Textsuche
      const { data: fallbackWorkouts } = await supabase
        .from('workouts_rag')
        .select('*')
        .or(`full_text.ilike.%${workoutType}%,part_a_description.ilike.%${focus}%,part_b_description.ilike.%${focus}%`)
        .limit(3);
      
      console.log('Using fallback workouts:', fallbackWorkouts?.length);
    } else {
      console.log('Found similar workouts:', similarWorkouts?.length);
    }

    const workoutsForContext = searchError ? [] : similarWorkouts;

    // 5. Personalisierungskontext erstellen
    const fitnessLevelMap = {
      'beginner': 'Anfänger',
      'intermediate': 'Mittel',
      'advanced': 'Fortgeschritten',
      'elite': 'Elite'
    };

    const userContext = {
      fitnessLevel: fitnessLevelMap[profile.fitness_level as keyof typeof fitnessLevelMap] || 'Mittel',
      weight: profile.weight_kg,
      age: profile.birth_year ? new Date().getFullYear() - profile.birth_year : null,
      gender: profile.gender,
      oneRepMaxes: {
        frontSquat: profile.front_squat_1rm,
        backSquat: profile.back_squat_1rm,
        deadlift: profile.deadlift_1rm,
        benchPress: profile.bench_press_1rm,
        snatch: profile.snatch_1rm,
        cleanAndJerk: profile.clean_and_jerk_1rm
      },
      preferredExercises: profile.preferred_exercises || [],
      extraLifts: profile.extra_lifts || []
    };

    // 6. OpenAI Prompt erstellen
    const systemPrompt = `Du bist ein erfahrener CrossFit Coach und erstellst personalisierte Workouts. 

BENUTZERPROFIL:
- Fitnesslevel: ${userContext.fitnessLevel}
- Gewicht: ${userContext.weight || 'unbekannt'} kg
- Alter: ${userContext.age || 'unbekannt'} Jahre
- Geschlecht: ${userContext.gender || 'unbekannt'}
- 1RM Werte: Front Squat: ${userContext.oneRepMaxes.frontSquat || 'unbekannt'} kg, Back Squat: ${userContext.oneRepMaxes.backSquat || 'unbekannt'} kg, Deadlift: ${userContext.oneRepMaxes.deadlift || 'unbekannt'} kg, Bench Press: ${userContext.oneRepMaxes.benchPress || 'unbekannt'} kg, Snatch: ${userContext.oneRepMaxes.snatch || 'unbekannt'} kg, Clean & Jerk: ${userContext.oneRepMaxes.cleanAndJerk || 'unbekannt'} kg

BEVORZUGTE ÜBUNGEN: 
${userContext.preferredExercises.length > 0 ? userContext.preferredExercises.join(', ') : 'Alle Übungen erlaubt'}

REFERENZ WORKOUTS (als Inspiration):
${workoutsForContext.map(w => `
Workout: ${w.full_text}
Part A: ${w.part_a_description}
Part B: ${w.part_b_description}
${w.part_c_description ? `Part C: ${w.part_c_description}` : ''}
`).join('\n')}

Erstelle ein ${workoutType} Workout (${sessionType || 'full_session'}) mit ${duration} Minuten Fokus auf ${focus}.

WICHTIGE REGELN:
1. Verwende NUR Übungen aus den bevorzugten Übungen (falls angegeben)
2. Berechne Arbeitsgewichte basierend auf 1RM-Werten (60-85% je nach Intensität)
3. Passe Intensität an Fitnesslevel an
4. Gib konkrete Gewichtsempfehlungen basierend auf den 1RM-Werten
5. Verwende deutsche Begriffe

Antworte in folgendem JSON Format:
{
  "name": "Workout Name",
  "type": "${workoutType}",
  "duration": ${duration},
  "focus": "${focus}",
  "difficulty": "leicht/mittel/schwer",
  "parts": [
    {
      "name": "Warm-Up",
      "duration": "5-10 min",
      "exercises": ["Übung 1", "Übung 2"]
    },
    {
      "name": "Hauptteil",
      "format": "AMRAP/For Time/EMOM",
      "duration": "15-20 min",
      "exercises": ["Übung mit Gewichtsempfehlung"],
      "notes": "Spezifische Anweisungen"
    }
  ],
  "notes": "Weitere Hinweise basierend auf Fitnesslevel"
}`;

    // 7. OpenAI API Call
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Erstelle ein personalisiertes ${workoutType} Workout (${sessionType || 'full_session'}) mit ${duration} Minuten, Fokus: ${focus}` }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    const completionData = await completion.json();
    console.log('OpenAI response received');

    let workoutData;
    try {
      workoutData = JSON.parse(completionData.choices[0].message.content);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      // Fallback workout
      workoutData = {
        name: `${workoutType} Workout`,
        type: workoutType,
        duration: duration,
        focus: focus,
        difficulty: "mittel",
        parts: [
          {
            name: "Warm-Up",
            duration: "5-10 min",
            exercises: ["Leichtes Cardio", "Dynamisches Stretching"]
          },
          {
            name: "Hauptteil",
            format: "AMRAP",
            duration: `${duration - 10} min`,
            exercises: ["Angepasste Übungen basierend auf Profil"],
            notes: "Personalisiert für dein Fitnesslevel"
          }
        ],
        notes: "Workout basierend auf deinem Profil erstellt"
      };
    }

    // 8. Workout in training_sessions speichern
    const { error: sessionError } = await supabase
      .from('training_sessions')
      .insert({
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        workout_type: `${workoutType}_${sessionType || 'full_session'}`,
        workout_data: workoutData,
        status: 'pending'
      });

    if (sessionError) {
      console.error('Session save error:', sessionError);
    }

    return new Response(JSON.stringify({ workout: workoutData }), {
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