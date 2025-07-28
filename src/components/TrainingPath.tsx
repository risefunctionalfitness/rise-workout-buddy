import { TrainingPathNode } from "./TrainingPathNode"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface TrainingSession {
  id: string
  date: string
  status: 'completed' | 'current' | 'pending' | 'locked'
  workoutType?: 'course' | 'free_training' | 'plan'
}

interface TrainingPathProps {
  sessions: TrainingSession[]
  onSelectWorkout: (id: string) => void
  onSelectCurrentWorkout: () => void
}

export const TrainingPath: React.FC<TrainingPathProps> = ({
  sessions,
  onSelectWorkout,
  onSelectCurrentWorkout
}) => {
  const currentSession = sessions.find(s => s.status === 'current')

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex flex-col gap-6 max-w-md mx-auto">
        {sessions.map((session, index) => (
          <div key={session.id} className="flex flex-col items-center">
            <TrainingPathNode
              id={session.id}
              date={session.date}
              status={session.status}
              workoutType={session.workoutType}
              dayNumber={index + 1}
              onSelectWorkout={onSelectWorkout}
            />
            
            {/* Show workout selection buttons for current session */}
            {session.status === 'current' && (
              <div className="mt-4 space-y-2 w-full max-w-xs">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onSelectCurrentWorkout()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Kurs besuchen
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onSelectCurrentWorkout()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Freies Training
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onSelectCurrentWorkout()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Plan folgen
                </Button>
              </div>
            )}
            
            {/* Connection line to next node */}
            {index < sessions.length - 1 && (
              <div className="h-8 w-1 bg-border my-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}