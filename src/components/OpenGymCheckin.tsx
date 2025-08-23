import { useState } from "react"
import { QRCodeScanner } from "./QRCodeScanner"

interface OpenGymCheckinProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCheckinComplete: () => void
  date?: Date
}

export const OpenGymCheckin: React.FC<OpenGymCheckinProps> = ({
  open,
  onOpenChange,
  onCheckinComplete,
  date
}) => {
  const handleScanSuccess = (result: string) => {
    // QR-Code wurde erfolgreich gescannt
    onCheckinComplete()
    
    // Event mit Datum-Information für lokale State-Update
    const eventDetail = date ? { date: date.toISOString(), type: 'free_training' } : {}
    window.dispatchEvent(new CustomEvent("open-gym-checkin-success", { detail: eventDetail }))
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