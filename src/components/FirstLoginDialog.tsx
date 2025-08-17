import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, ExternalLink } from "lucide-react"

interface FirstLoginDialogProps {
  open: boolean
  onClose: () => void
}

export const FirstLoginDialog = ({ open, onClose }: FirstLoginDialogProps) => {
  const handleYouTubeClick = () => {
    window.open("https://youtube.com/shorts/GXhPX6__sI4?feature=shared", "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-center pr-8">Willkommen!</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <p className="text-center text-muted-foreground">
            Hi, bitte schaue dir zu Beginn das kurze Erklärungsvideo an.
          </p>
          
          <Button 
            onClick={handleYouTubeClick}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Erklärungsvideo ansehen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}