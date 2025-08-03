import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb, X, ArrowLeft } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface WorkoutChatInterfaceProps {
  workout: any
  workoutType: 'crossfit' | 'bodybuilding'
  onClose: () => void
}

export const WorkoutChatInterface = ({ workout, workoutType, onClose }: WorkoutChatInterfaceProps) => {
  const [explanation, setExplanation] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadExplanation()
  }, [])

  const loadExplanation = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('workout-explanation', {
        body: { workout, workoutType }
      })

      if (error) throw error

      setExplanation(data.explanation)
    } catch (error) {
      console.error('Error loading explanation:', error)
      toast.error("Fehler beim Laden der Workout-Erklärung")
      setExplanation("Entschuldigung, die Erklärung konnte nicht geladen werden.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-20 px-4 pb-24">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                AI WOD Guide
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{workout.title}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground">Erklärung wird erstellt...</p>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <div 
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: explanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}