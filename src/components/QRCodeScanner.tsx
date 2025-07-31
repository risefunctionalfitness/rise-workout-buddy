import { useState, useEffect } from "react"
import { BarcodeScanner } from "@capacitor-community/barcode-scanner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QRCodeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess: (result: string) => void
  expectedText?: string
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  open,
  onOpenChange,
  onScanSuccess,
  expectedText = "Open Gym Check-In"
}) => {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      startScan()
    } else {
      stopScan()
    }

    return () => {
      stopScan()
    }
  }, [open])

  const startScan = async () => {
    try {
      setError(null)
      setScanning(true)

      // Check permission
      const status = await BarcodeScanner.checkPermission({ force: true })
      
      if (status.granted) {
        // Make background of WebView transparent
        BarcodeScanner.hideBackground()
        
        const result = await BarcodeScanner.startScan()
        
        if (result.hasContent) {
          handleScanResult(result.content)
        }
      } else {
        setError("Kamera-Berechtigung erforderlich")
        toast({
          title: "Berechtigung erforderlich",
          description: "Bitte erlaube den Zugriff auf die Kamera für QR-Code-Scanning.",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error("Error starting scan:", err)
      setError("Scanner konnte nicht gestartet werden")
      toast({
        title: "Scanner-Fehler",
        description: "QR-Code-Scanner konnte nicht gestartet werden.",
        variant: "destructive"
      })
    } finally {
      setScanning(false)
    }
  }

  const stopScan = async () => {
    try {
      await BarcodeScanner.stopScan()
      BarcodeScanner.showBackground()
    } catch (err) {
      console.error("Error stopping scan:", err)
    }
  }

  const handleScanResult = (content: string) => {
    if (content.trim() === expectedText) {
      onScanSuccess(content)
      onOpenChange(false)
      toast({
        title: "QR-Code gescannt",
        description: "Open Gym Check-In erfolgreich!",
        variant: "default"
      })
    } else {
      toast({
        title: "Falscher QR-Code",
        description: "Bitte scanne den korrekten Open Gym QR-Code.",
        variant: "destructive"
      })
    }
  }

  const handleClose = () => {
    stopScan()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Camera className="h-5 w-5" />
            QR-Code Scanner
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Scanne den QR-Code am Empfang für deinen Open Gym Check-In
          </p>
          
          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          
          {scanning && (
            <div className="text-sm text-muted-foreground">
              Scanner läuft... Richte die Kamera auf den QR-Code.
            </div>
          )}
          
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </Button>
            
            {!scanning && (
              <Button 
                onClick={startScan}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Erneut scannen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}