import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar, Dumbbell, FileText } from "lucide-react"
import { OpenGymCheckin } from "./OpenGymCheckin"

interface TrainingSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  dayNumber: number
  onSelectType: (type: 'course' | 'free_training' | 'plan' | 'remove') => void
  hasExistingSession?: boolean
  userMembershipType?: string
}

export const TrainingSessionDialog: React.FC<TrainingSessionDialogProps> = ({
  open,
  onOpenChange,
  date,
  dayNumber,
  onSelectType,
  hasExistingSession,
  userMembershipType
}) => {
  const [showQRScanner, setShowQRScanner] = useState(false)

  const handleSelectType = (type: 'course' | 'free_training' | 'plan' | 'remove') => {
    if (type === 'free_training') {
      // Für Open Gym direkt QR-Scanner öffnen
      onOpenChange(false)
      setShowQRScanner(true)
    } else {
      onSelectType(type)
      onOpenChange(false)
    }
  }

  const handleQRCheckinComplete = () => {
    // Nach erfolgreichem QR-Scan das Training speichern
    onSelectType('free_training')
    setShowQRScanner(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {hasExistingSession ? 'Training ändern' : 'Training hinzufügen'}
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} (Tag {dayNumber})
          </p>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {userMembershipType !== '10er Karte' && (
            <Button
              variant="outline"
              onClick={() => handleSelectType('free_training')}
              className="w-full h-16 flex items-center gap-4 justify-start"
            >
              <Dumbbell className="h-6 w-6 text-primary" />
              <div className="text-left">
                <div className="font-medium">Open Gym</div>
                <div className="text-sm text-muted-foreground">
                  QR Code scannen fürs Leaderboard
                </div>
              </div>
            </Button>
          )}
          
          {hasExistingSession && (
            <Button
              variant="ghost"
              onClick={() => handleSelectType('remove')}
              className="w-full text-destructive hover:text-destructive"
            >
              Training entfernen
            </Button>
          )}
        </div>
      </DialogContent>
      
      <OpenGymCheckin
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        onCheckinComplete={handleQRCheckinComplete}
        date={date}
      />
    </Dialog>
  )
}