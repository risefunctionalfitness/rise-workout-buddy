import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Timer, Repeat } from "lucide-react"
import { useNavigate } from "react-router-dom"

export const WorkoutTimer: React.FC = () => {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const timerTypes = [
    {
      id: 'amrap',
      title: 'AMRAP',
      description: 'As Many Rounds As Possible',
      icon: Repeat,
      color: 'bg-blue-500'
    },
    {
      id: 'fortime',
      title: 'For Time',
      description: 'Complete the workout as fast as possible',
      icon: Timer,
      color: 'bg-green-500'
    },
    {
      id: 'emom',
      title: 'EMOM',
      description: 'Every Minute On the Minute',
      icon: Clock,
      color: 'bg-purple-500'
    }
  ]

  const handleStartTimer = (type: string) => {
    // Here you would implement the actual timer functionality
    console.log(`Starting ${type} timer`)
    setSelectedType(type)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/pro")}
            className="mb-4"
          >
            ← Zurück
          </Button>
          <h1 className="text-2xl font-bold text-center">Workout Timer</h1>
          <p className="text-muted-foreground text-center mt-2">
            Wähle deinen Timer-Typ
          </p>
        </div>

        <div className="space-y-4">
          {timerTypes.map((type) => {
            const Icon = type.icon
            return (
              <Card 
                key={type.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedType === type.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleStartTimer(type.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{type.title}</h3>
                      <p className="text-sm text-muted-foreground font-normal">
                        {type.description}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button className="w-full" variant="outline">
                    Timer starten
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {selectedType && (
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-center text-sm text-muted-foreground">
              Timer-Funktionalität wird hier implementiert
            </p>
          </div>
        )}
      </div>
    </div>
  )
}