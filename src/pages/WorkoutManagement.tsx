import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Search, Timer } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { RiseHeader } from "@/components/RiseHeader"
import { WorkoutEditDialog } from "@/components/WorkoutEditDialog"
import { useNavigate } from "react-router-dom"
import { EXERCISES, ExerciseItem } from "@/data/exercises"

interface CrossfitWorkout {
  id: string
  title: string
  workout_type: string
  author_nickname: string
  workout_content: string
  notes?: string
  scaling_beginner?: string
  scaling_scaled?: string
  scaling_rx?: string
  required_exercises?: string[]
  created_at: string
}

interface BodybuildingWorkout {
  id: string
  title: string
  focus_area: string
  difficulty: string
  workout_content: string
  notes?: string
  created_at: string
}

interface WorkoutManagementProps { hideHeader?: boolean }

const WorkoutManagement: React.FC<WorkoutManagementProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate()
  const [crossfitWorkouts, setCrossfitWorkouts] = useState<CrossfitWorkout[]>([])
  const [bodybuildingWorkouts, setBodybuildingWorkouts] = useState<BodybuildingWorkout[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("crossfit")

  const groupedExercises = EXERCISES.reduce((acc, exercise) => {
    if (!acc[exercise.category]) acc[exercise.category] = []
    acc[exercise.category].push(exercise)
    return acc
  }, {} as Record<string, ExerciseItem[]>)

  const toggleExercise = (name: string) => {
    setNewWorkout(prev => {
      const current = Array.isArray(prev.required_exercises) ? prev.required_exercises : []
      const next = current.includes(name) ? current.filter(e => e !== name) : [...current, name]
      return { ...prev, required_exercises: next }
    })
  }

  // Form states for creating new workouts
  const [newWorkout, setNewWorkout] = useState({
    title: "",
    content: "",
    notes: "",
    type: "WOD" as "WOD" | "Weightlifting",
    focus: "Ganzkörper" as "Ganzkörper" | "Oberkörper" | "Unterkörper" | "Push" | "Pull" | "Beine",
    difficulty: "Leicht" as "Leicht" | "Mittel" | "Schwer",
    scaling_beginner: "",
    scaling_scaled: "",
    scaling_rx: "",
    required_exercises: [] as string[],
  })

  useEffect(() => {
    loadWorkouts()
  }, [])

  const loadWorkouts = async () => {
    setIsLoading(true)
    try {
      const [crossfitResult, bodybuildingResult] = await Promise.all([
        supabase.from('crossfit_workouts').select('*').order('created_at', { ascending: false }),
        supabase.from('bodybuilding_workouts').select('*').order('created_at', { ascending: false })
      ])

      if (crossfitResult.error) throw crossfitResult.error
      if (bodybuildingResult.error) throw bodybuildingResult.error

      setCrossfitWorkouts((crossfitResult.data || []).map(workout => ({
        ...workout,
        required_exercises: Array.isArray(workout.required_exercises) 
          ? workout.required_exercises.filter((ex): ex is string => typeof ex === 'string')
          : []
      })))
      setBodybuildingWorkouts(bodybuildingResult.data || [])
    } catch (error) {
      console.error('Error loading workouts:', error)
      toast.error("Fehler beim Laden der Workouts")
    } finally {
      setIsLoading(false)
    }
  }

  const createCrossfitWorkout = async () => {
    try {
      const { error } = await supabase
        .from('crossfit_workouts')
        .insert({
          title: newWorkout.title,
          workout_type: newWorkout.type,
          workout_content: newWorkout.content,
          notes: newWorkout.notes || null,
          author_nickname: "Admin",
          scaling_beginner: newWorkout.scaling_beginner || null,
          scaling_scaled: newWorkout.scaling_scaled || null,
          scaling_rx: newWorkout.scaling_rx || null,
          required_exercises: Array.isArray(newWorkout.required_exercises) ? newWorkout.required_exercises : []
        })

      if (error) throw error
      
      toast.success("Functional Fitness Workout erstellt!")
      setShowCreateDialog(false)
      resetForm()
      loadWorkouts()
    } catch (error) {
      console.error('Error creating crossfit workout:', error)
      toast.error("Fehler beim Erstellen des Functional Fitness Workouts")
    }
  }

  const createBodybuildingWorkout = async () => {
    try {
      const { error } = await supabase
        .from('bodybuilding_workouts')
        .insert({
          title: newWorkout.title,
          focus_area: newWorkout.focus,
          difficulty: newWorkout.difficulty,
          workout_content: newWorkout.content,
          notes: newWorkout.notes || null
        })

      if (error) throw error
      
      toast.success("Bodybuilding Workout erstellt!")
      setShowCreateDialog(false)
      resetForm()
      loadWorkouts()
    } catch (error) {
      console.error('Error creating bodybuilding workout:', error)
      toast.error("Fehler beim Erstellen des Bodybuilding Workouts")
    }
  }

  const deleteCrossfitWorkout = async (id: string) => {
    if (!confirm("Workout wirklich löschen?")) return

    try {
      const { error } = await supabase
        .from('crossfit_workouts')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success("Functional Fitness Workout gelöscht!")
      loadWorkouts()
    } catch (error) {
      console.error('Error deleting crossfit workout:', error)
      toast.error("Fehler beim Löschen des Functional Fitness Workouts")
    }
  }

  const deleteBodybuildingWorkout = async (id: string) => {
    if (!confirm("Workout wirklich löschen?")) return

    try {
      const { error } = await supabase
        .from('bodybuilding_workouts')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success("Bodybuilding Workout gelöscht!")
      loadWorkouts()
    } catch (error) {
      console.error('Error deleting bodybuilding workout:', error)
      toast.error("Fehler beim Löschen des Bodybuilding Workouts")
    }
  }

  const resetForm = () => {
    setNewWorkout({
      title: "",
      content: "",
      notes: "",
      type: "WOD",
      focus: "Ganzkörper",
      difficulty: "Leicht",
      scaling_beginner: "",
      scaling_scaled: "",
      scaling_rx: "",
      required_exercises: []
    })
  }

  const filteredCrossfitWorkouts = crossfitWorkouts.filter(workout =>
    workout.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workout.workout_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredBodybuildingWorkouts = bodybuildingWorkouts.filter(workout =>
    workout.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workout.focus_area.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-background">
      {!hideHeader && <RiseHeader showAdminAccess={true} onLogout={handleLogout} />}
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Workout Verwaltung</h1>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neues Workout
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Neues Workout erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="crossfit">Functional Fitness</TabsTrigger>
                    <TabsTrigger value="bodybuilding">Bodybuilding</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="crossfit" className="space-y-4">
                    <div>
                      <Label>Workout Type</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant={newWorkout.type === "WOD" ? "default" : "outline"}
                          onClick={() => setNewWorkout(prev => ({ ...prev, type: "WOD" }))}
                        >
                          WOD
                        </Button>
                        <Button
                          type="button"
                          variant={newWorkout.type === "Weightlifting" ? "default" : "outline"}
                          onClick={() => setNewWorkout(prev => ({ ...prev, type: "Weightlifting" }))}
                        >
                          Weightlifting
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="bodybuilding" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Fokusbereich</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["Ganzkörper", "Oberkörper", "Unterkörper", "Push", "Pull", "Beine"].map(focus => (
                            <Button
                              key={focus}
                              type="button"
                              size="sm"
                              variant={newWorkout.focus === focus ? "default" : "outline"}
                              onClick={() => setNewWorkout(prev => ({ ...prev, focus: focus as any }))}
                            >
                              {focus}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Schwierigkeit</Label>
                        <div className="flex gap-2 mt-2">
                          {["Leicht", "Mittel", "Schwer"].map(difficulty => (
                            <Button
                              key={difficulty}
                              type="button"
                              size="sm"
                              variant={newWorkout.difficulty === difficulty ? "default" : "outline"}
                              onClick={() => setNewWorkout(prev => ({ ...prev, difficulty: difficulty as any }))}
                            >
                              {difficulty}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div>
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    id="title"
                    value={newWorkout.title}
                    onChange={(e) => setNewWorkout(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Workout Titel..."
                  />
                </div>

                <div>
                  <Label htmlFor="content">Workout Inhalt</Label>
                  <Textarea
                    id="content"
                    value={newWorkout.content}
                    onChange={(e) => setNewWorkout(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Beschreibe das Workout..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notizen (optional)</Label>
                  <Textarea
                    id="notes"
                    value={newWorkout.notes}
                    onChange={(e) => setNewWorkout(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Zusätzliche Hinweise..."
                    rows={3}
                  />
                </div>

                {activeTab === "crossfit" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="beginner">Beginner</Label>
                        <Textarea
                          id="beginner"
                          value={newWorkout.scaling_beginner}
                          onChange={(e) => setNewWorkout(prev => ({ ...prev, scaling_beginner: e.target.value }))}
                          placeholder="Beginner Scaling..."
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="scaled">Scaled</Label>
                        <Textarea
                          id="scaled"
                          value={newWorkout.scaling_scaled}
                          onChange={(e) => setNewWorkout(prev => ({ ...prev, scaling_scaled: e.target.value }))}
                          placeholder="Scaled Scaling..."
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="rx">RX</Label>
                        <Textarea
                          id="rx"
                          value={newWorkout.scaling_rx}
                          onChange={(e) => setNewWorkout(prev => ({ ...prev, scaling_rx: e.target.value }))}
                          placeholder="RX Scaling..."
                          rows={4}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Verwendete Übungen</Label>
                      <div className="mt-2 space-y-4">
                        {Object.entries(groupedExercises).map(([category, exercises]) => (
                          <div key={category}>
                            <h4 className="font-medium text-sm text-muted-foreground mb-2">{category}</h4>
                            <div className="flex flex-wrap gap-2">
                              {exercises.map((exercise) => (
                                <Badge
                                  key={exercise.name}
                                  variant={(newWorkout.required_exercises || []).includes(exercise.name) ? "default" : "secondary"}
                                  className="cursor-pointer hover:bg-primary/20"
                                  onClick={() => toggleExercise(exercise.name)}
                                >
                                  {exercise.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={activeTab === "crossfit" ? createCrossfitWorkout : createBodybuildingWorkout}
                    disabled={!newWorkout.title || !newWorkout.content}
                  >
                    Workout erstellen
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Workouts suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="crossfit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="crossfit">
              Functional Fitness Workouts ({filteredCrossfitWorkouts.length})
            </TabsTrigger>
            <TabsTrigger value="bodybuilding">
              Bodybuilding Workouts ({filteredBodybuildingWorkouts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crossfit">
            <div className="grid gap-4">
              {filteredCrossfitWorkouts.map((workout) => (
                <Card key={workout.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{workout.title}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{workout.workout_type}</Badge>
                          <Badge variant="outline">von {workout.author_nickname}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <WorkoutEditDialog 
                          workout={workout}
                          workoutType="crossfit"
                          onWorkoutUpdated={loadWorkouts}
                        />
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteCrossfitWorkout(workout.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded text-sm">
                      <pre className="whitespace-pre-wrap">{workout.workout_content}</pre>
                    </div>
                    {workout.notes && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        <strong>Notizen:</strong> {workout.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bodybuilding">
            <div className="grid gap-4">
              {filteredBodybuildingWorkouts.map((workout) => (
                <Card key={workout.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{workout.title}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{workout.focus_area}</Badge>
                          <Badge variant="outline">{workout.difficulty}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <WorkoutEditDialog 
                          workout={workout}
                          workoutType="bodybuilding"
                          onWorkoutUpdated={loadWorkouts}
                        />
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteBodybuildingWorkout(workout.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded text-sm">
                      <pre className="whitespace-pre-wrap">{workout.workout_content}</pre>
                    </div>
                    {workout.notes && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        <strong>Notizen:</strong> {workout.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* WOD Timer Button - Bottom right */}
        <div className="fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => navigate("/workout-timer")}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 dark:from-gray-700 dark:to-gray-800 light:from-[#B81243] light:to-[#9A0F39] border border-border shadow-lg flex items-center justify-center text-gray-100 dark:text-gray-100 light:text-white hover:scale-105 transition-transform"
            title="WOD Timer"
          >
            <Timer className="h-6 w-6 text-gray-100 dark:text-gray-100 light:text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorkoutManagement