import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { LogOut, ChevronDown, ChevronUp } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const EXERCISES = [
  // Langhantel
  { category: "Langhantel", name: "Back Squat" },
  { category: "Langhantel", name: "Front Squat" },
  { category: "Langhantel", name: "Overhead Squat" },
  { category: "Langhantel", name: "Deadlift" },
  { category: "Langhantel", name: "Bench Press" },
  { category: "Langhantel", name: "Strict Press" },
  { category: "Langhantel", name: "Push Press" },
  { category: "Langhantel", name: "Push Jerk" },
  { category: "Langhantel", name: "Split Jerk" },
  { category: "Langhantel", name: "Thruster" },

  // Olympic Lifts
  { category: "Olympic Lifts", name: "Power Snatch" },
  { category: "Olympic Lifts", name: "Squat Snatch" },
  { category: "Olympic Lifts", name: "Power Clean" },
  { category: "Olympic Lifts", name: "Squat Clean" },
  { category: "Olympic Lifts", name: "Clean & Jerk" },

  // Gymnastics – Pull
  { category: "Gymnastics – Pull", name: "Strict Pull-Up" },
  { category: "Gymnastics – Pull", name: "Kipping Pull-Up" },
  { category: "Gymnastics – Pull", name: "Butterfly Pull-Up" },
  { category: "Gymnastics – Pull", name: "Chest-to-Bar Pull-Up" },
  { category: "Gymnastics – Pull", name: "Bar Muscle-Up" },
  { category: "Gymnastics – Pull", name: "Ring Muscle-Up" },
  { category: "Gymnastics – Pull", name: "Rope Climb" },

  // Gymnastics – Push
  { category: "Gymnastics – Push", name: "Handstand Push-Up" },
  { category: "Gymnastics – Push", name: "Handstand Walk" },
  { category: "Gymnastics – Push", name: "Ring Dip" },

  // Gymnastics – Core
  { category: "Gymnastics – Core", name: "Toes-to-Bar" },
  { category: "Gymnastics – Core", name: "Knees-to-Elbows" },
  { category: "Gymnastics – Core", name: "GHD Sit-Up" },
  { category: "Gymnastics – Core", name: "V-Ups" },
  { category: "Gymnastics – Core", name: "Hollow Rock" },
  { category: "Gymnastics – Core", name: "L-Sit" },
  { category: "Gymnastics – Core", name: "Plank" },

  // Lower Body
  { category: "Lower Body", name: "Pistol Squat" },
  { category: "Lower Body", name: "Lunges" },
  { category: "Lower Body", name: "Overhead Lunges" },
  { category: "Lower Body", name: "Box Step-Ups" },
  { category: "Lower Body", name: "Bulgarian Split Squat" },

  // Cardio
  { category: "Cardio", name: "Run" },
  { category: "Cardio", name: "Row" },
  { category: "Cardio", name: "SkiErg" },
  { category: "Cardio", name: "BikeErg" },
  { category: "Cardio", name: "Assault Bike" },
  { category: "Cardio", name: "Double Unders" },
  { category: "Cardio", name: "Single Unders" },
  { category: "Cardio", name: "Box Jump" },
  { category: "Cardio", name: "Box Jump Over" },
  { category: "Cardio", name: "Burpee" },
  { category: "Cardio", name: "Burpee Box Jump Over" },

  // Dumbbell Movements
  { category: "Dumbbell Movements", name: "DB Snatch" },
  { category: "Dumbbell Movements", name: "DB Clean" },
  { category: "Dumbbell Movements", name: "DB Clean & Jerk" },
  { category: "Dumbbell Movements", name: "DB Thruster" },
  { category: "Dumbbell Movements", name: "DB Push Press" },
  { category: "Dumbbell Movements", name: "DB Lunges" },
  { category: "Dumbbell Movements", name: "DB Bench Press" },
  { category: "Dumbbell Movements", name: "DB Row" },
  { category: "Dumbbell Movements", name: "DB Devil Press" },
  { category: "Dumbbell Movements", name: "DB Overhead Squat" },

  // Kettlebell Movements
  { category: "Kettlebell Movements", name: "KB Swing" },
  { category: "Kettlebell Movements", name: "KB Snatch" },
  { category: "Kettlebell Movements", name: "KB Clean & Jerk" },
  { category: "Kettlebell Movements", name: "KB Goblet Squat" },
  { category: "Kettlebell Movements", name: "KB Lunges" },
  { category: "Kettlebell Movements", name: "KB Turkish Get-Up" },

  // Weitere
  { category: "Weitere", name: "Wall Ball" },
  { category: "Weitere", name: "Sandbag Clean" },
  { category: "Weitere", name: "Sandbag Carry" },
  { category: "Weitere", name: "Farmer's Carry" },
  { category: "Weitere", name: "Sled Push" },
  { category: "Weitere", name: "Sled Pull" },
  { category: "Weitere", name: "D-Ball Over Shoulder" }
]

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' }
]

interface UserProfileProps {
  onClose: () => void
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // Section states
  const [basicDataOpen, setBasicDataOpen] = useState(false)
  const [strengthDataOpen, setStrengthDataOpen] = useState(false)
  const [exercisesOpen, setExercisesOpen] = useState(false)

  // Form states
  const [displayName, setDisplayName] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [gender, setGender] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [fitnessLevel, setFitnessLevel] = useState([0])
  
  // Strength values
  const [frontSquat1rm, setFrontSquat1rm] = useState("")
  const [backSquat1rm, setBackSquat1rm] = useState("")
  const [deadlift1rm, setDeadlift1rm] = useState("")
  const [benchPress1rm, setBenchPress1rm] = useState("")
  const [snatch1rm, setSnatch1rm] = useState("")
  const [cleanAndJerk1rm, setCleanAndJerk1rm] = useState("")
  const [extraLifts, setExtraLifts] = useState<{name: string, weight: string}[]>([])
  
  // Preferred exercises (all selected by default)
  const [preferredExercises, setPreferredExercises] = useState<string[]>(
    EXERCISES.map(ex => ex.name)
  )

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setDisplayName(profile.display_name || "")
        setBirthYear(profile.birth_year?.toString() || "")
        setGender(profile.gender || "")
        setWeightKg(profile.weight_kg?.toString() || "")
        
        const levelMap = { 'beginner': 0, 'intermediate': 1, 'advanced': 2, 'elite': 3 }
        setFitnessLevel([levelMap[profile.fitness_level as keyof typeof levelMap] || 0])
        
        setFrontSquat1rm(profile.front_squat_1rm?.toString() || "")
        setBackSquat1rm(profile.back_squat_1rm?.toString() || "")
        setDeadlift1rm(profile.deadlift_1rm?.toString() || "")
        setBenchPress1rm(profile.bench_press_1rm?.toString() || "")
        setSnatch1rm(profile.snatch_1rm?.toString() || "")
        setCleanAndJerk1rm(profile.clean_and_jerk_1rm?.toString() || "")
        setExtraLifts((profile.extra_lifts as {name: string, weight: string}[]) || [])
        setPreferredExercises((profile.preferred_exercises as string[]) || EXERCISES.map(ex => ex.name))
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const saveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const levelLabels = ['beginner', 'intermediate', 'advanced', 'elite']
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName,
          birth_year: birthYear ? parseInt(birthYear) : null,
          gender,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          fitness_level: levelLabels[fitnessLevel[0]],
          front_squat_1rm: frontSquat1rm ? parseFloat(frontSquat1rm) : null,
          back_squat_1rm: backSquat1rm ? parseFloat(backSquat1rm) : null,
          deadlift_1rm: deadlift1rm ? parseFloat(deadlift1rm) : null,
          bench_press_1rm: benchPress1rm ? parseFloat(benchPress1rm) : null,
          snatch_1rm: snatch1rm ? parseFloat(snatch1rm) : null,
          clean_and_jerk_1rm: cleanAndJerk1rm ? parseFloat(cleanAndJerk1rm) : null,
          extra_lifts: extraLifts,
          preferred_exercises: preferredExercises
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      toast({
        title: "Profil gespeichert",
        description: "Deine Änderungen wurden erfolgreich gespeichert."
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Fehler",
        description: "Profil konnte nicht gespeichert werden.",
        variant: "destructive"
      })
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('mockUser')
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const toggleExercise = (exerciseName: string) => {
    setPreferredExercises(prev => 
      prev.includes(exerciseName)
        ? prev.filter(name => name !== exerciseName)
        : [...prev, exerciseName]
    )
  }

  const groupedExercises = EXERCISES.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = []
    }
    acc[exercise.category].push(exercise)
    return acc
  }, {} as Record<string, typeof EXERCISES>)

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Profil</h1>
          <Button onClick={onClose} variant="outline">
            Schließen
          </Button>
        </div>

        {/* Abschnitt 1: Basisdaten */}
        <Card className="mb-4">
          <Collapsible open={basicDataOpen} onOpenChange={setBasicDataOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Basisdaten</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Diese Daten nützen der individuellen Workout-Erstellung.
                    </p>
                  </div>
                  {basicDataOpen ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Dein Name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="birthYear">Geburtsjahr *</Label>
                  <Input
                    id="birthYear"
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="z.B. 1990"
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Geschlecht *</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Geschlecht wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Männlich</SelectItem>
                      <SelectItem value="female">Weiblich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="weight">Körpergewicht (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="z.B. 75.5"
                  />
                </div>

                <div>
                  <Label>Fitnesslevel *</Label>
                  <div className="mt-2 mb-4">
                    <Slider
                      value={fitnessLevel}
                      onValueChange={setFitnessLevel}
                      max={3}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Beginner</span>
                      <span>Intermediate</span>
                      <span>Advanced</span>
                      <span>Elite</span>
                    </div>
                    <p className="text-sm font-medium mt-2">
                      Aktuell: {FITNESS_LEVELS[fitnessLevel[0]]?.label}
                    </p>
                  </div>
                </div>

                <Button onClick={saveProfile} className="w-full">
                  Basisdaten speichern
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Abschnitt 2: Kraftwerte */}
        <Card className="mb-4">
          <Collapsible open={strengthDataOpen} onOpenChange={setStrengthDataOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Deine Kraftwerte (1RM)</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gib deine 1 rep max ein, damit dein Training noch weiter individualisiert werden kann.
                    </p>
                  </div>
                  {strengthDataOpen ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frontSquat">Front Squat (kg)</Label>
                    <Input
                      id="frontSquat"
                      type="number"
                      step="0.5"
                      value={frontSquat1rm}
                      onChange={(e) => setFrontSquat1rm(e.target.value)}
                      placeholder="z.B. 100"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="backSquat">Back Squat (kg)</Label>
                    <Input
                      id="backSquat"
                      type="number"
                      step="0.5"
                      value={backSquat1rm}
                      onChange={(e) => setBackSquat1rm(e.target.value)}
                      placeholder="z.B. 120"
                    />
                  </div>

                  <div>
                    <Label htmlFor="deadlift">Deadlift (kg)</Label>
                    <Input
                      id="deadlift"
                      type="number"
                      step="0.5"
                      value={deadlift1rm}
                      onChange={(e) => setDeadlift1rm(e.target.value)}
                      placeholder="z.B. 140"
                    />
                  </div>

                  <div>
                    <Label htmlFor="benchPress">Bench Press (kg)</Label>
                    <Input
                      id="benchPress"
                      type="number"
                      step="0.5"
                      value={benchPress1rm}
                      onChange={(e) => setBenchPress1rm(e.target.value)}
                      placeholder="z.B. 80"
                    />
                  </div>

                  <div>
                    <Label htmlFor="snatch">Snatch (kg)</Label>
                    <Input
                      id="snatch"
                      type="number"
                      step="0.5"
                      value={snatch1rm}
                      onChange={(e) => setSnatch1rm(e.target.value)}
                      placeholder="z.B. 70"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cleanJerk">Clean & Jerk (kg)</Label>
                    <Input
                      id="cleanJerk"
                      type="number"
                      step="0.5"
                      value={cleanAndJerk1rm}
                      onChange={(e) => setCleanAndJerk1rm(e.target.value)}
                      placeholder="z.B. 90"
                    />
                  </div>
                </div>

                <Button onClick={saveProfile} className="w-full">
                  Kraftwerte speichern
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Abschnitt 3: Bevorzugte Übungen */}
        <Card className="mb-4">
          <Collapsible open={exercisesOpen} onOpenChange={setExercisesOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Deine bevorzugten Übungen</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wähle die Bewegungen, die in deinen Workouts vorkommen dürfen.
                    </p>
                  </div>
                  {exercisesOpen ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {Object.entries(groupedExercises).map(([category, exercises]) => (
                  <div key={category}>
                    <h4 className="font-semibold mb-3">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {exercises.map((exercise) => (
                        <Badge
                          key={exercise.name}
                          variant={preferredExercises.includes(exercise.name) ? "default" : "outline"}
                          className="cursor-pointer transition-colors"
                          onClick={() => toggleExercise(exercise.name)}
                        >
                          {exercise.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}

                <Button onClick={saveProfile} className="w-full">
                  Übungen speichern
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Abmelde Button */}
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto">
          <Button 
            onClick={handleLogout} 
            variant="destructive" 
            className="w-full"
            size="lg"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </div>
    </div>
  )
}