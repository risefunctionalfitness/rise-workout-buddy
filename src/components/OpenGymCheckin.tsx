import { useState } from "react"
import { QRCodeScanner } from "./QRCodeScanner"

interface OpenGymCheckinProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCheckinComplete: () => void
}

export const OpenGymCheckin: React.FC<OpenGymCheckinProps> = ({
  open,
  onOpenChange,
  onCheckinComplete
}) => {
  const handleScanSuccess = (result: string) => {
    // QR-Code wurde erfolgreich gescannt
    onCheckinComplete()
    window.dispatchEvent(new CustomEvent("open-gym-checkin-success"))
    onOpenChange(false)
  }

  return (
    <QRCodeScanner
      open={open}
      onOpenChange={onOpenChange}
      onScanSuccess={handleScanSuccess}
      expectedText="Open Gym Check-In"
    />
  )
}