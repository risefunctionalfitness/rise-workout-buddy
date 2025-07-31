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
    const { workoutType, sessionType, duration, focus, userId = 'demo-user', preferredExercises = [] } = await req.json();
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

    // 4. Ähnliche Workouts suchen mit der neuen erweiterten Funktion
    const { data: similarWorkouts, error: searchError } = await supabase.rpc('match_workouts_v2', {
      query_embedding: queryEmbedding,
      workout_type_param: workoutType,
      session_type_param: sessionType,
      duration_minutes_param: duration,
      focus_area_param: focus === 'ganzkörper' ? 'full_body' : focus === 'oberkörper' ? 'upper_body' : focus === 'unterkörper' ? 'lower_body' : focus,
      user_preferred_exercises: preferredExercises,
      match_threshold: 0.5,
      match_count: 3
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

    // 6. CrossFit/Bodybuilding spezifischer Prompt mit Session-Type Unterstützung
    const systemPrompt = workoutType === 'crossfit' ? 
      `Du bist ein erfahrener CrossFit Coach und erstellst authentische CrossFit WODs im Stil von CrossFit.com.

BENUTZERPROFIL:
- Fitnesslevel: ${userContext.fitnessLevel}
- Gewicht: ${userContext.weight || 'unbekannt'} kg
- Alter: ${userContext.age || 'unbekannt'} Jahre
- 1RM Werte: Front Squat: ${userContext.oneRepMaxes.frontSquat || 'unbekannt'} kg, Back Squat: ${userContext.oneRepMaxes.backSquat || 'unbekannt'} kg, Deadlift: ${userContext.oneRepMaxes.deadlift || 'unbekannt'} kg, Bench Press: ${userContext.oneRepMaxes.benchPress || 'unbekannt'} kg, Snatch: ${userContext.oneRepMaxes.snatch || 'unbekannt'} kg, Clean & Jerk: ${userContext.oneRepMaxes.cleanAndJerk || 'unbekannt'} kg
- Bevorzugte Übungen: ${preferredExercises.length > 0 ? preferredExercises.join(', ') : 'Keine spezifischen Vorlieben'}

REFERENZ WORKOUTS (als Inspiration):
${workoutsForContext.map(w => `${w.title || 'Workout'}: ${w.workout_type} ${w.session_type} - ${w.focus_area}`).join('\n')}

SESSION TYPE: ${sessionType} - ${getSessionTypeDescription(sessionType)}

CROSSFIT WOD REGELN:
- Verwende authentische CrossFit Bewegungen: Thrusters, Burpees, Pull-Ups, Double Unders, Wall Balls, etc.
- ${preferredExercises.length > 0 ? `PRIORITÄT: Verwende möglichst Übungen aus der Präferenzliste: ${preferredExercises.join(', ')}` : ''}
- Arbeitsgewichte: 60-70% von 1RM für Kraftübungen
- Format: AMRAP (As Many Rounds As Possible), For Time, EMOM (Every Minute On the Minute), oder Tabata
- Reps: Klassische CrossFit Zahlen (21-15-9, 5-4-3-2-1, etc.)
- Kurze, intensive Workouts (10-20 Min)
- Deutsche Übungsnamen verwenden

${getSessionTypeInstructions(sessionType)}

Erstelle ein ${sessionType === 'wod_only' ? 'reines WOD' : sessionType === 'strength_only' ? 'reines Krafttraining' : sessionType === 'weightlifting_only' ? 'reines Olympic Weightlifting' : 'komplettes CrossFit Training'} mit ${duration} Minuten Fokus auf ${focus}.

JSON Format:
{
  "name": "Authentischer ${sessionType} Name",
  "type": "crossfit",
  "duration": ${duration},
  "focus": "${focus}",
  "difficulty": "leicht/mittel/schwer",
  "parts": [
    ${getPartsStructure(sessionType, duration)}
  ]
}`
      :
      `Du bist ein erfahrener Bodybuilding Coach und erstellst wissenschaftlich fundierte Trainingspläne.

BENUTZERPROFIL:
- Fitnesslevel: ${userContext.fitnessLevel}
- Gewicht: ${userContext.weight || 'unbekannt'} kg
- Alter: ${userContext.age || 'unbekannt'} Jahre
- 1RM Werte: Bench Press: ${userContext.oneRepMaxes.benchPress || 'unbekannt'} kg, Back Squat: ${userContext.oneRepMaxes.backSquat || 'unbekannt'} kg, Deadlift: ${userContext.oneRepMaxes.deadlift || 'unbekannt'} kg
- Bevorzugte Übungen: ${preferredExercises.length > 0 ? preferredExercises.join(', ') : 'Keine spezifischen Vorlieben'}

BODYBUILDING PRINZIPIEN:
- Fokus auf Muskelaufbau und Hypertrophie
- ${preferredExercises.length > 0 ? `PRIORITÄT: Verwende möglichst Übungen aus der Präferenzliste: ${preferredExercises.join(', ')}` : ''}
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

    console.log('System prompt created for:', workoutType, sessionType);

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
          { role: 'user', content: `Erstelle ein personalisiertes ${workoutType} Workout (${sessionType || 'full_session'}) mit ${duration} Minuten, Fokus: ${focus}. ${preferredExercises.length > 0 ? `Bevorzuge diese Übungen: ${preferredExercises.join(', ')}` : ''}` }
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
        name: `${workoutType} ${sessionType || 'full_session'} Workout`,
        type: workoutType,
        duration: duration,
        focus: focus,
        difficulty: "mittel",
        parts: [
          {
            name: getSessionTypeDescription(sessionType),
            duration: `${duration} min`,
            exercises: ["Angepasste Übungen basierend auf Profil und Präferenzen"],
            notes: `Personalisiert für dein Fitnesslevel und bevorzugte Übungen ${preferredExercises.length > 0 ? `(${preferredExercises.join(', ')})` : ''}`
          }
        ],
        notes: `Workout basierend auf deinem Profil erstellt${preferredExercises.length > 0 ? ` mit Fokus auf deine bevorzugten Übungen` : ''}`
      };
    }

    // 8. Workout in die neue Datenbankstruktur speichern und ID zurückgeben
    let workoutId = null;
    if (userId !== 'demo-user') {
      try {
        workoutId = await saveWorkoutToDatabase(workoutData, profile);
        console.log('Workout saved to database with ID:', workoutId);
      } catch (saveError) {
        console.error('Error saving workout to database:', saveError);
        // Continue without workoutId - fallback to old display
      }
    } else {
      console.log('Skipping database save for demo user');
    }

    return new Response(JSON.stringify({ 
      workout: workoutData,
      workout_id: workoutId
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

// Helper functions for session type handling
function getSessionTypeDescription(sessionType: string): string {
  switch (sessionType) {
    case 'wod_only':
      return 'WOD (Workout of the Day)'
    case 'strength_only':
      return 'Strength Training'
    case 'weightlifting_only':
      return 'Olympic Weightlifting'
    case 'full_session':
      return 'Complete Training Session'
    default:
      return 'Standard Workout'
  }
}

function getSessionTypeInstructions(sessionType: string): string {
  switch (sessionType) {
    case 'wod_only':
      return 'Erstelle NUR den Hauptworkout-Teil. Kein Warm-up oder Strength-Teil. Fokus auf intensive metabolische Konditionierung (AMRAP, For Time, EMOM).'
    case 'strength_only':
      return 'Erstelle NUR Krafttraining. Fokus auf schwere Compound-Bewegungen, Kraftaufbau und Power-Entwicklung. Schließe angemessene Pausen ein. Keine Konditionierung.'
    case 'weightlifting_only':
      return 'Erstelle NUR Olympic Weightlifting Session. Fokus auf Snatch, Clean & Jerk und deren Variationen. Schließe Technikarbeit und schweres Heben ein. Keine Konditionierung.'
    case 'full_session':
      return 'Erstelle eine komplette Session mit: 1) Warm-up (5-10 min), 2) Strength/Skill work (15-20 min), 3) Hauptworkout/Konditionierung (10-20 min), 4) Cool-down (5 min).'
    default:
      return 'Erstelle ein ausgewogenes Workout.'
  }
}

function getPartsStructure(sessionType: string, duration: number): string {
  switch (sessionType) {
    case 'wod_only':
      return `{
      "name": "WOD",
      "format": "AMRAP/For Time/EMOM",
      "duration": "${duration} min",
      "exercises": ["CrossFit Übungen mit Reps und Gewichten"],
      "notes": "WOD Anweisungen und Skalierung"
    }`
    case 'strength_only':
      return `{
      "name": "Strength Training",
      "duration": "${duration} min",
      "exercises": ["Schwere Compound-Bewegungen mit spezifischen Gewichten"],
      "notes": "Kraftaufbau fokussiert, basierend auf 1RM Werten"
    }`
    case 'weightlifting_only':
      return `{
      "name": "Olympic Weightlifting",
      "duration": "${duration} min",
      "exercises": ["Snatch, Clean & Jerk Variationen"],
      "notes": "Technik und schweres Heben kombiniert"
    }`
    case 'full_session':
      return `{
      "name": "Warm-Up",
      "duration": "5-8 min",
      "exercises": ["Dynamic Warm-Up Übungen"]
    },
    {
      "name": "Skill/Strength",
      "duration": "8-12 min", 
      "exercises": ["Kraftübung mit spezifischem Gewicht basierend auf 1RM"]
    },
    {
      "name": "WOD",
      "format": "AMRAP/For Time/EMOM",
      "duration": "12-15 min",
      "exercises": ["CrossFit Übungen mit Reps und Gewichten"],
      "notes": "WOD Anweisungen und Skalierung"
    },
    {
      "name": "Cool Down",
      "duration": "5 min",
      "exercises": ["Stretching und Mobility"]
    }`
    default:
      return `{
      "name": "Standard Workout",
      "duration": "${duration} min",
      "exercises": ["Ausgeglichene Übungsauswahl"],
      "notes": "Angepasst an Benutzerprofil"
    }`
  }
}

// Funktion zum Speichern des Workouts in der neuen Datenbankstruktur
async function saveWorkoutToDatabase(workout: any, userProfile: any): Promise<string> {
  try {
    // 1. Workout erstellen
    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        title: workout.name,
        workout_type: workout.type,
        session_type: mapSessionType(workout.type),
        duration_minutes: workout.duration,
        focus_area: mapFocusArea(workout.focus),
        difficulty_level: workout.difficulty || 'intermediate',
        notes: workout.notes,
        required_exercises: extractRequiredExercises(workout.parts)
      })
      .select('id')
      .single();

    if (workoutError) {
      console.error('Error creating workout:', workoutError);
      throw workoutError;
    }

    const workoutId = workoutData.id;
    console.log('Created workout with ID:', workoutId);

    // 2. Workout Parts erstellen
    for (let i = 0; i < workout.parts.length; i++) {
      const part = workout.parts[i];
      
      const { data: partData, error: partError } = await supabase
        .from('workout_parts')
        .insert({
          workout_id: workoutId,
          part_name: part.name,
          part_order: i + 1,
          description: part.description || formatPartDescription(part),
          duration_minutes: extractDurationMinutes(part.duration),
          duration_rounds: part.rounds,
          score_type: part.format || part.type,
          notes: part.notes
        })
        .select('id')
        .single();

      if (partError) {
        console.error('Error creating workout part:', partError);
        continue; // Continue with next part
      }

      // 3. Exercises für diesen Part erstellen
      if (part.exercises && Array.isArray(part.exercises)) {
        for (let j = 0; j < part.exercises.length; j++) {
          const exercise = part.exercises[j];
          const exerciseName = typeof exercise === 'string' ? exercise : exercise.name || exercise;
          
          const { error: exerciseError } = await supabase
            .from('workout_exercises')
            .insert({
              workout_part_id: partData.id,
              exercise_name: exerciseName,
              exercise_order: j + 1,
              reps: extractReps(exerciseName),
              weight_kg: extractWeight(exerciseName),
              notes: typeof exercise === 'object' ? exercise.notes : null
            });

          if (exerciseError) {
            console.error('Error creating exercise:', exerciseError);
          }
        }
      }
    }

    // 4. Training Session erstellen
    await saveTrainingSession(userProfile.user_id, workout);

    return workoutId;
  } catch (error) {
    console.error('Error saving workout to database:', error);
    throw error;
  }
}

// Helper Funktionen für Datenbank-Mapping
function mapSessionType(workoutType: string): string {
  if (workoutType === 'crossfit') return 'full_session';
  if (workoutType === 'bodybuilding') return 'full_session';
  return 'full_session';
}

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

function extractRequiredExercises(parts: any[]): string[] {
  const exercises: string[] = [];
  parts.forEach(part => {
    if (part.exercises && Array.isArray(part.exercises)) {
      part.exercises.forEach((exercise: any) => {
        const exerciseName = typeof exercise === 'string' ? exercise : exercise.name || exercise;
        if (exerciseName && !exercises.includes(exerciseName)) {
          exercises.push(exerciseName);
        }
      });
    }
  });
  return exercises;
}

function formatPartDescription(part: any): string {
  if (part.description) return part.description;
  
  let desc = '';
  if (part.format) desc += `${part.format}: `;
  if (part.duration) desc += `${part.duration} - `;
  if (part.exercises && Array.isArray(part.exercises)) {
    desc += part.exercises.join(', ');
  }
  return desc.trim().replace(/,$/, '');
}

function extractDurationMinutes(duration: string): number | null {
  if (!duration) return null;
  const match = duration.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1]) : null;
}

function extractReps(exerciseText: string): number | null {
  const match = exerciseText.match(/(\d+)\s*(reps?|wiederholungen?|x)/i);
  return match ? parseInt(match[1]) : null;
}

function extractWeight(exerciseText: string): number | null {
  const match = exerciseText.match(/(\d+(?:\.\d+)?)\s*kg/i);
  return match ? parseFloat(match[1]) : null;
}

// Funktion zum Speichern einer Training Session
async function saveTrainingSession(userId: string, workout: any) {
  try {
    const { error } = await supabase
      .from('training_sessions')
      .insert({
        user_id: userId,
        date: new Date().toISOString().split('T')[0], // Heute
        workout_type: workout.type,
        workout_data: workout,
        status: 'pending'
      });

    if (error) {
      console.error('Error saving training session:', error);
    } else {
      console.log('Training session saved successfully');
    }
  } catch (error) {
    console.error('Error in saveTrainingSession:', error);
  }
}