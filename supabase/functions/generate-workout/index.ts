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
    const { workoutType, sessionType, duration, focus, userId = 'demo-user' } = await req.json();
    console.log(`Generating workout for user: ${userId} Type: ${workoutType} Session: ${sessionType} Duration: ${duration} Focus: ${focus}`);

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
        .single();

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

    // 6. CrossFit/Bodybuilding spezifischer Prompt
    const systemPrompt = workoutType === 'crossfit' ? 
      `Du bist ein erfahrener CrossFit Coach und erstellst authentische CrossFit WODs im Stil von CrossFit.com.

BENUTZERPROFIL:
- Fitnesslevel: ${userContext.fitnessLevel}
- Gewicht: ${userContext.weight || 'unbekannt'} kg
- Alter: ${userContext.age || 'unbekannt'} Jahre
- 1RM Werte: Front Squat: ${userContext.oneRepMaxes.frontSquat || 'unbekannt'} kg, Back Squat: ${userContext.oneRepMaxes.backSquat || 'unbekannt'} kg, Deadlift: ${userContext.oneRepMaxes.deadlift || 'unbekannt'} kg, Bench Press: ${userContext.oneRepMaxes.benchPress || 'unbekannt'} kg, Snatch: ${userContext.oneRepMaxes.snatch || 'unbekannt'} kg, Clean & Jerk: ${userContext.oneRepMaxes.cleanAndJerk || 'unbekannt'} kg

REFERENZ WORKOUTS (als Inspiration):
${workoutsForContext.map(w => `${w.full_text}`).join('\n')}

CROSSFIT WOD REGELN:
- Verwende authentische CrossFit Bewegungen: Thrusters, Burpees, Pull-Ups, Double Unders, Wall Balls, etc.
- Arbeitsgewichte: 60-70% von 1RM für Kraftübungen
- Format: AMRAP (As Many Rounds As Possible), For Time, EMOM (Every Minute On the Minute), oder Tabata
- Reps: Klassische CrossFit Zahlen (21-15-9, 5-4-3-2-1, etc.)
- Kurze, intensive Workouts (10-20 Min)
- Deutsche Übungsnamen verwenden

Erstelle ein ${sessionType === 'wod_only' ? 'reines WOD' : 'komplettes CrossFit Training'} mit ${duration} Minuten Fokus auf ${focus}.

JSON Format:
{
  "name": "Authentischer WOD Name",
  "type": "crossfit",
  "duration": ${duration},
  "focus": "${focus}",
  "difficulty": "leicht/mittel/schwer",
  "parts": [
    ${sessionType === 'full_session' ? `{
      "name": "Warm-Up",
      "duration": "5-8 min",
      "exercises": ["Dynamic Warm-Up Übungen"]
    },
    {
      "name": "Skill/Strength",
      "duration": "8-12 min", 
      "exercises": ["Kraftübung mit spezifischem Gewicht basierend auf 1RM"]
    },` : ''}
    {
      "name": "WOD",
      "format": "AMRAP/For Time/EMOM",
      "duration": "${sessionType === 'wod_only' ? duration + ' min' : '12-15 min'}",
      "exercises": ["CrossFit Übungen mit Reps und Gewichten"],
      "notes": "WOD Anweisungen und Skalierung"
    }${sessionType === 'full_session' ? `,
    {
      "name": "Cool Down",
      "duration": "5 min",
      "exercises": ["Stretching und Mobility"]
    }` : ''}
  ]
}`
      :
      `Du bist ein erfahrener Bodybuilding Coach und erstellst wissenschaftlich fundierte Trainingspläne.

BENUTZERPROFIL:
- Fitnesslevel: ${userContext.fitnessLevel}
- Gewicht: ${userContext.weight || 'unbekannt'} kg
- Alter: ${userContext.age || 'unbekannt'} Jahre
- 1RM Werte: Bench Press: ${userContext.oneRepMaxes.benchPress || 'unbekannt'} kg, Back Squat: ${userContext.oneRepMaxes.backSquat || 'unbekannt'} kg, Deadlift: ${userContext.oneRepMaxes.deadlift || 'unbekannt'} kg

BODYBUILDING PRINZIPIEN:
- Fokus auf Muskelaufbau und Hypertrophie
- 3-4 Sätze, 8-12 Wiederholungen für Hypertrophie
- 70-80% von 1RM für Hauptübungen
- Fokusbereich: ${focus}
- Progressive Überladung
- Isolation und Compound Übungen kombinieren

Erstelle ein ${duration}-minütiges ${focus} Bodybuilding Training.

JSON Format:
{
  "name": "Bodybuilding ${focus} Training", 
  "type": "bodybuilding",
  "duration": ${duration},
  "focus": "${focus}",
  "difficulty": "leicht/mittel/schwer",
  "parts": [
    {
      "name": "Warm-Up",
      "duration": "8-10 min",
      "exercises": ["Allgemeines Aufwärmen und spezifische Mobilisation"]
    },
    {
      "name": "Hauptübungen",
      "duration": "35-40 min",
      "exercises": ["Compound Bewegungen mit Gewicht, Sätzen und Reps"],
      "notes": "Fokus auf korrekte Form und progressive Überladung"
    },
    {
      "name": "Isolationsübungen", 
      "duration": "15-20 min",
      "exercises": ["Isolation Übungen für Zielmuskeln"],
      "notes": "Höhere Wiederholungszahlen für Pump und Definition"
    }
  ]
}`;

    console.log('System prompt created for:', workoutType);

    // 7. OpenAI API Call
    console.log('Calling OpenAI API...');
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

    if (!completion.ok) {
      console.error('OpenAI API Error Status:', completion.status);
      console.error('OpenAI API Error Text:', await completion.text());
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

    const completionData = await completion.json();
    console.log('OpenAI response received successfully');
    console.log('OpenAI response:', JSON.stringify(completionData, null, 2));

    let workoutData;
    try {
      const content = completionData.choices[0].message.content;
      console.log('Trying to parse OpenAI content:', content);
      workoutData = JSON.parse(content);
      console.log('Successfully parsed OpenAI workout');
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw OpenAI content:', completionData.choices[0]?.message?.content);
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

    // 8. Workout in training_sessions speichern (nur für echte User)
    if (userId !== 'demo-user') {
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
      } else {
        console.log('Training session saved successfully');
      }
    } else {
      console.log('Skipping session save for demo user');
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