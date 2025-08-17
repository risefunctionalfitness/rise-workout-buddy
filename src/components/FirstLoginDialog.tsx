import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Play } from "lucide-react"
// Using the uploaded thumbnail image

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
      <DialogContent className="max-w-sm mx-auto bg-black/95 border-gray-800 text-white">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <DialogTitle className="text-center pr-8 text-xl font-bold text-white">
            Willkommen im RISE!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <p className="text-center text-gray-300 text-sm leading-relaxed">
            Bitte schaue dir zu Beginn das kurze Erklärungsvideo zur App an
          </p>
          
          {/* Video Thumbnail */}
          <div className="relative rounded-lg overflow-hidden">
            <img 
              src="/lovable-uploads/04e0becf-e7d7-4124-b9fd-be009e142294.png" 
              alt="RISE App Erklärungsvideo" 
              className="w-full h-auto"
            />
          </div>
          
          {/* YouTube Button */}
          <Button 
            onClick={handleYouTubeClick}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-md transition-colors"
            size="lg"
          >
            <Play className="h-5 w-5 mr-2 fill-current" />
            Video ansehen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}