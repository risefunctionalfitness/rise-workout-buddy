import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workout, workoutType, message = null } = await req.json();

    let systemPrompt = `Du bist ein erfahrener Fitness-Trainer bei RISE Functional Fitness. Deine Aufgabe ist es, Workouts zu erklären und Fragen dazu zu beantworten.

Hier ist das aktuelle Workout:
Titel: ${workout.title}
Type: ${workoutType === 'crossfit' ? 'CrossFit' : 'Bodybuilding'}
Inhalt: ${workout.workout_content}`;

    if (workout.notes) {
      systemPrompt += `\nNotizen: ${workout.notes}`;
    }

    if (workoutType === 'crossfit') {
      systemPrompt += `\nWorkout Type: ${workout.workout_type}`;
      if (workout.scaling_beginner) systemPrompt += `\nBeginner Scaling: ${workout.scaling_beginner}`;
      if (workout.scaling_scaled) systemPrompt += `\nScaled Scaling: ${workout.scaling_scaled}`;
      if (workout.scaling_rx) systemPrompt += `\nRX Scaling: ${workout.scaling_rx}`;
    } else {
      systemPrompt += `\nFokusbereich: ${workout.focus_area}`;
      systemPrompt += `\nSchwierigkeit: ${workout.difficulty}`;
    }

    systemPrompt += `

Erkläre das Workout detailliert auf Deutsch. Wenn der Nutzer eine Frage stellt, beantworte sie basierend auf dem Workout. Sei freundlich, motivierend und sachkundig. Verwende Fitness-Fachbegriffe, aber erkläre sie auch für Anfänger.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (message) {
      messages.push({ role: 'user', content: message });
    } else {
      messages.push({ 
        role: 'user', 
        content: 'Erkläre mir dieses Workout detailliert. Was sind die Ziele? Welche Muskeln werden trainiert? Worauf sollte ich achten?' 
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.choices[0].message.content;

    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in workout-explanation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});