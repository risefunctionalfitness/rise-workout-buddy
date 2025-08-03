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

    let systemPrompt = `Du bist ein professioneller CrossFit-Coach und erklärst Workouts in einer Fitness-App für Anfänger.  
Du bekommst Workoutdaten mit Typ (z. B. EMOM, AMRAP, For Time), Übungsdetails, Scaling-Optionen und Notizen.

Erstelle eine Erklärung in fünf Abschnitten mit folgenden fett formatierten Überschriften (Markdown-Stil: **Überschrift**). Verwende einfache Sprache, kein Fachjargon ohne Erklärung. Richte dich direkt an die Nutzer („du"). Sei motivierend, nicht belehrend. Keine Informationen erfinden.

**Was ist zu tun?**  
Erkläre das Trainingsformat (z. B. was bedeutet EMOM?), den Ablauf und die zeitliche Struktur. Beschreibe, was wann passiert.

**Was bedeuten die Übungen?**  
Erkläre jede Übung kurz, z. B.:  
- **Wall Walks**: Du startest in der Liegestützposition mit den Füßen an der Wand. Dann wanderst du mit Händen und Füßen nach oben, bis du fast im Handstand bist. Die Übung trainiert deine Schultern, Arme und Körperspannung.  
- **Air Squats**: Du gehst kontrolliert in die Hocke, als würdest du dich auf einen Stuhl setzen, und stehst wieder auf. Dabei bleiben deine Fersen am Boden. Das stärkt Beine und Gesäß.  
- **Push-ups**: Du stützt dich mit Händen und Füßen ab, senkst deinen Körper langsam ab und drückst dich wieder hoch. Halte dabei deinen Körper in einer Linie. Das trainiert Brust, Arme und Rumpf.

**Worauf solltest du achten?**  
Gib einfache Tipps zur Technik (z. B. Rücken gerade, sauber atmen, Bewegung kontrollieren). Hilf Anfängern, typische Fehler zu vermeiden.

**Zeitmanagement & Tipps**  
Wie teilst du dir Kraft und Zeit ein? Was tun, wenn du aus dem Rhythmus kommst? Wann bewusst atmen oder Pausen einplanen? Erwähne ggf. Beginner-Scaling.

**Motivation zum Schluss**  
Ein positiver Abschlusssatz, z. B.:  
„Du musst nicht perfekt sein – du musst nur dranbleiben."  
oder  
„Jede Wiederholung zählt – und bringt dich weiter."

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