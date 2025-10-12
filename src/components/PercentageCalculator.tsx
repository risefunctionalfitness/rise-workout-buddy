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
    <div className="mx-4 space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Prozentrechner</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {useSavedValues 
                    ? "Berechne mit gespeicherten Kraftwerten" 
                    : "Freie Berechnung mit eigenen Werten"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end space-x-3 bg-muted/30 rounded-lg p-3">
              <span className="text-sm font-medium">{useSavedValues ? "Gespeichert" : "Frei"}</span>
              <Switch 
                checked={!useSavedValues} 
                onCheckedChange={(checked) => setUseSavedValues(!checked)}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calculator Card */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          {/* Saved Values Mode */}
          {useSavedValues && !hasStrengthValues && (
            <div className="text-center py-12">
              <div className="p-4 bg-muted/30 rounded-2xl mb-4 inline-block">
                <Calculator className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Keine Kraftwerte gefunden
              </h3>
              <p className="text-sm text-muted-foreground">
                Trage deine 1RM Werte in den Kraftwerten ein, um den Prozentrechner zu nutzen.
              </p>
            </div>
          )}

          {/* Saved Values Mode - With Data */}
          {useSavedValues && hasStrengthValues && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lift Select */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Übung auswählen
                  </Label>
                  <Select value={selectedLift} onValueChange={setSelectedLift}>
                    <SelectTrigger className="h-12 text-lg border-primary/30 focus:border-primary">
                      <SelectValue placeholder="Wähle eine Übung" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {savedLifts.map((lift) => (
                        <SelectItem key={lift.name} value={lift.name} className="text-lg py-3">
                          <div className="flex justify-between items-center w-full">
                            <span>{lift.name}</span>
                            <span className="text-primary font-semibold ml-4">{lift.value}kg</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Percentage Input */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    Prozent (%)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="150"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder="z.B. 75"
                    className="h-12 text-lg border-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Result Display */}
              <div className="mt-8 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                <div className="text-center">
                  <span className="text-sm font-semibold text-muted-foreground mb-2 block">ERGEBNIS</span>
                  <div className="text-4xl font-bold text-primary mb-2">
                    {calculateResult() ? `${calculateResult()} kg` : '---'}
                  </div>
                  {calculateResult() && selectedLift && (
                    <p className="text-sm text-muted-foreground">
                      {percentage}% von {savedLifts.find(l => l.name === selectedLift)?.value}kg ({selectedLift})
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Free Mode */}
          {!useSavedValues && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weight Input */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Gewicht (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={freeWeight}
                    onChange={(e) => setFreeWeight(e.target.value)}
                    placeholder="z.B. 100"
                    className="h-12 text-lg border-primary/30 focus:border-primary"
                  />
                </div>

                {/* Percentage Input */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    Prozent (%)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="150"
                    value={freePercent}
                    onChange={(e) => setFreePercent(e.target.value)}
                    placeholder="z.B. 75"
                    className="h-12 text-lg border-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Result Display */}
              <div className="mt-8 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                <div className="text-center">
                  <span className="text-sm font-semibold text-muted-foreground mb-2 block">ERGEBNIS</span>
                  <div className="text-4xl font-bold text-primary mb-2">
                    {calculateResult() ? `${calculateResult()} kg` : '---'}
                  </div>
                  {calculateResult() && (
                    <p className="text-sm text-muted-foreground">
                      {freePercent}% von {freeWeight}kg
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}