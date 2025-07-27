import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BodyPart = "ganzkörper" | "oberkörper" | "unterkörper" | null

interface BodySelectorProps {
  selectedPart: BodyPart
  onPartSelect: (part: BodyPart) => void
}

export const BodySelector = ({ selectedPart, onPartSelect }: BodySelectorProps) => {
  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
      <Button
        variant={selectedPart === "ganzkörper" ? "default" : "outline"}
        onClick={() => onPartSelect("ganzkörper")}
        className="h-16 text-sm font-medium"
      >
        Ganzkörper
      </Button>
      <Button
        variant={selectedPart === "oberkörper" ? "default" : "outline"}
        onClick={() => onPartSelect("oberkörper")}
        className="h-16 text-sm font-medium"
      >
        Oberkörper
      </Button>
      <Button
        variant={selectedPart === "unterkörper" ? "default" : "outline"}
        onClick={() => onPartSelect("unterkörper")}
        className="h-16 text-sm font-medium"
      >
        Unterkörper
      </Button>
    </div>
  )
}