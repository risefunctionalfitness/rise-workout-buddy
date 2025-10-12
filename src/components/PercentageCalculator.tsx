import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Calculator, TrendingUp } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const PercentageCalculator = () => {
  const navigate = useNavigate()
  
  const [useSavedValues, setUseSavedValues] = useState(true)
  const [hasStrengthValues, setHasStrengthValues] = useState(false)
  
  // Saved values mode
  const [selectedLift, setSelectedLift] = useState("")
  const [savedLifts, setSavedLifts] = useState<{name: string, value: string}[]>([])
  
  // Free values mode
  const [freeWeight, setFreeWeight] = useState("")
  const [freePercent, setFreePercent] = useState("")
  
  // Common
  const [percentage, setPercentage] = useState("")
  
  useEffect(() => {
    loadStrengthValues()
  }, [])

  const loadStrengthValues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('front_squat_1rm, back_squat_1rm, deadlift_1rm, bench_press_1rm, snatch_1rm, clean_1rm, jerk_1rm, clean_and_jerk_1rm')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        const lifts = [
          { name: "Front Squat", value: (profile as any).front_squat_1rm?.toString() },
          { name: "Back Squat", value: (profile as any).back_squat_1rm?.toString() },
          { name: "Deadlift", value: (profile as any).deadlift_1rm?.toString() },
          { name: "Bench Press", value: (profile as any).bench_press_1rm?.toString() },
          { name: "Snatch", value: (profile as any).snatch_1rm?.toString() },
          { name: "Clean", value: (profile as any).clean_1rm?.toString() },
          { name: "Jerk", value: (profile as any).jerk_1rm?.toString() },
          { name: "Clean & Jerk", value: (profile as any).clean_and_jerk_1rm?.toString() }
        ].filter(lift => lift.value && parseFloat(lift.value) > 0)
        
        setSavedLifts(lifts)
        setHasStrengthValues(lifts.length > 0)
      }
    } catch (error) {
      console.error('Error loading strength values:', error)
    }
  }

  const calculateResult = () => {
    if (useSavedValues) {
      // Saved mode calculation
      const selectedLiftData = savedLifts.find(lift => lift.name === selectedLift)
      if (!selectedLiftData || !percentage) return null
      
      const oneRm = parseFloat(selectedLiftData.value)
      const percentValue = parseFloat(percentage)
      
      if (isNaN(oneRm) || isNaN(percentValue)) return null
      
      return ((oneRm * percentValue) / 100).toFixed(1)
    } else {
      // Free mode calculation
      if (!freeWeight || !freePercent) return null
      
      const weight = parseFloat(freeWeight)
      const percent = parseFloat(freePercent)
      
      if (isNaN(weight) || isNaN(percent)) return null
      
      return ((weight * percent) / 100).toFixed(1)
    }
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/pro')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-6">Percentage Calculator</h1>

        {/* Mode Toggle Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold">Percentage Calculator</h3>
                  <p className="text-sm text-muted-foreground">
                    {useSavedValues 
                      ? "Berechnung mit gespeicherten Kraftwerten" 
                      : "Freie Berechnung mit eigenen Werten"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-medium">{useSavedValues ? "Gespeichert" : "Frei"}</span>
                <Switch 
                  checked={!useSavedValues} 
                  onCheckedChange={(checked) => setUseSavedValues(!checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saved Values Mode */}
        {useSavedValues && (
          <Card>
            <CardContent className="pt-6">
              {!hasStrengthValues ? (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Keine Kraftwerte gefunden</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Gib deine 1RM Werte in den Kraftwerten ein, um den Prozentrechner zu nutzen.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/pro/strength-values')}
                  >
                    Zu den Kraftwerten
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      Übung
                    </Label>
                    <Select value={selectedLift} onValueChange={setSelectedLift}>
                      <SelectTrigger>
                        <SelectValue placeholder="Übung wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedLifts.map((lift) => (
                          <SelectItem key={lift.name} value={lift.name}>
                            {lift.name} ({lift.value}kg)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4" />
                      Prozent (%)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="150"
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      placeholder="z.B. 75"
                    />
                  </div>

                  <div className="bg-primary/10 rounded-lg p-6 text-center">
                    <div className="text-sm text-muted-foreground mb-2">RESULT</div>
                    <div className="text-4xl font-bold text-primary">
                      {calculateResult() ? `${calculateResult()} kg` : '---'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Free Values Mode */}
        {!useSavedValues && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    Gewicht (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={freeWeight}
                    onChange={(e) => setFreeWeight(e.target.value)}
                    placeholder="z.B. 100"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4" />
                    Prozent (%)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="150"
                    value={freePercent}
                    onChange={(e) => setFreePercent(e.target.value)}
                    placeholder="z.B. 75"
                  />
                </div>

                <div className="bg-primary/10 rounded-lg p-6 text-center">
                  <div className="text-sm text-muted-foreground mb-2">RESULT</div>
                  <div className="text-4xl font-bold text-primary">
                    {calculateResult() ? `${calculateResult()} kg` : '---'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}