import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

export const StrengthValues = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const handleBack = () => {
    navigate('/pro?openProfile=true')
  }
  
  // Standard 1RM Werte
  const [frontSquat1rm, setFrontSquat1rm] = useState("")
  const [backSquat1rm, setBackSquat1rm] = useState("")
  const [deadlift1rm, setDeadlift1rm] = useState("")
  const [benchPress1rm, setBenchPress1rm] = useState("")
  const [snatch1rm, setSnatch1rm] = useState("")
  const [cleanAndJerk1rm, setCleanAndJerk1rm] = useState("")
  
  // Zusätzliche Übungen
  const [extraLifts, setExtraLifts] = useState<{name: string, weight: string}[]>([])

  useEffect(() => {
    loadStrengthValues()
  }, [])

  const loadStrengthValues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('front_squat_1rm, back_squat_1rm, deadlift_1rm, bench_press_1rm, snatch_1rm, clean_and_jerk_1rm, extra_lifts')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        setFrontSquat1rm(profile.front_squat_1rm?.toString() || "")
        setBackSquat1rm(profile.back_squat_1rm?.toString() || "")
        setDeadlift1rm(profile.deadlift_1rm?.toString() || "")
        setBenchPress1rm(profile.bench_press_1rm?.toString() || "")
        setSnatch1rm(profile.snatch_1rm?.toString() || "")
        setCleanAndJerk1rm(profile.clean_and_jerk_1rm?.toString() || "")
        setExtraLifts((profile.extra_lifts as {name: string, weight: string}[]) || [])
      }
    } catch (error) {
      console.error('Error loading strength values:', error)
    }
  }

  const saveStrengthValues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          front_squat_1rm: frontSquat1rm ? parseFloat(frontSquat1rm) : null,
          back_squat_1rm: backSquat1rm ? parseFloat(backSquat1rm) : null,
          deadlift_1rm: deadlift1rm ? parseFloat(deadlift1rm) : null,
          bench_press_1rm: benchPress1rm ? parseFloat(benchPress1rm) : null,
          snatch_1rm: snatch1rm ? parseFloat(snatch1rm) : null,
          clean_and_jerk_1rm: cleanAndJerk1rm ? parseFloat(cleanAndJerk1rm) : null,
          extra_lifts: extraLifts
        })
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Kraftwerte gespeichert",
        description: "Deine Kraftwerte wurden erfolgreich gespeichert."
      })
    } catch (error) {
      console.error('Error saving strength values:', error)
      toast({
        title: "Fehler",
        description: "Kraftwerte konnten nicht gespeichert werden.",
        variant: "destructive"
      })
    }
  }

  const addExtraLift = () => {
    setExtraLifts([...extraLifts, { name: "", weight: "" }])
  }

  const removeExtraLift = (index: number) => {
    setExtraLifts(extraLifts.filter((_, i) => i !== index))
  }

  const updateExtraLift = (index: number, field: 'name' | 'weight', value: string) => {
    const newLifts = [...extraLifts]
    newLifts[index][field] = value
    setExtraLifts(newLifts)
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Kraftwerte</h1>
          </div>
        </div>

        {/* Standard Kraftwerte */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>1RM Grundübungen</CardTitle>
            <p className="text-sm text-muted-foreground">
              Gib deine 1 rep max ein, damit dein Training individualisiert werden kann.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex gap-2">
                <Label className="min-w-24 pt-2">Front Squat:</Label>
                <Input type="number" step="0.5" value={frontSquat1rm} onChange={(e) => setFrontSquat1rm(e.target.value)} placeholder="kg" className="w-20" />
              </div>
              
              <div className="flex gap-2">
                <Label className="min-w-24 pt-2">Back Squat:</Label>
                <Input type="number" step="0.5" value={backSquat1rm} onChange={(e) => setBackSquat1rm(e.target.value)} placeholder="kg" className="w-20" />
              </div>

              <div className="flex gap-2">
                <Label className="min-w-24 pt-2">Deadlift:</Label>
                <Input type="number" step="0.5" value={deadlift1rm} onChange={(e) => setDeadlift1rm(e.target.value)} placeholder="kg" className="w-20" />
              </div>

              <div className="flex gap-2">
                <Label className="min-w-24 pt-2">Bench Press:</Label>
                <Input type="number" step="0.5" value={benchPress1rm} onChange={(e) => setBenchPress1rm(e.target.value)} placeholder="kg" className="w-20" />
              </div>

              <div className="flex gap-2">
                <Label className="min-w-24 pt-2">Snatch:</Label>
                <Input type="number" step="0.5" value={snatch1rm} onChange={(e) => setSnatch1rm(e.target.value)} placeholder="kg" className="w-20" />
              </div>

              <div className="flex gap-2">
                <Label className="min-w-24 pt-2">Clean & Jerk:</Label>
                <Input type="number" step="0.5" value={cleanAndJerk1rm} onChange={(e) => setCleanAndJerk1rm(e.target.value)} placeholder="kg" className="w-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zusätzliche Übungen */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Weitere Übungen</CardTitle>
            <p className="text-sm text-muted-foreground">
              Füge beliebige weitere Übungen und deren Werte hinzu.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {extraLifts.map((lift, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Übungsname</Label>
                  <Input
                    placeholder="z.B. Overhead Press"
                    value={lift.name}
                    onChange={(e) => updateExtraLift(index, 'name', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>Gewicht/Reps</Label>
                  <Input
                    placeholder="z.B. 60kg oder 15 reps"
                    type="text"
                    value={lift.weight}
                    onChange={(e) => updateExtraLift(index, 'weight', e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeExtraLift(index)}
                  className="mb-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button variant="outline" onClick={addExtraLift} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Übung hinzufügen
            </Button>
          </CardContent>
        </Card>

        <Button onClick={saveStrengthValues} className="w-full bg-rise-accent hover:bg-rise-accent-dark text-white">
          Kraftwerte speichern
        </Button>
      </div>
    </div>
  )
}