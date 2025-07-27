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
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-32 h-80">
        {/* Body SVG */}
        <svg 
          viewBox="0 0 100 200" 
          className="w-full h-full"
          style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))' }}
        >
          {/* Head */}
          <circle 
            cx="50" 
            cy="20" 
            r="12" 
            fill={selectedPart === "ganzkörper" ? "hsl(var(--primary))" : "#f1f5f9"}
            stroke="#64748b" 
            strokeWidth="1"
          />
          
          {/* Upper Body */}
          <rect 
            x="35" 
            y="32" 
            width="30" 
            height="45" 
            rx="8"
            fill={selectedPart === "oberkörper" || selectedPart === "ganzkörper" ? "hsl(var(--primary))" : "#f1f5f9"}
            stroke="#64748b" 
            strokeWidth="1"
            className="cursor-pointer transition-colors"
            onClick={() => onPartSelect("oberkörper")}
          />
          
          {/* Arms */}
          <rect 
            x="20" 
            y="35" 
            width="10" 
            height="35" 
            rx="5"
            fill={selectedPart === "oberkörper" || selectedPart === "ganzkörper" ? "hsl(var(--primary))" : "#f1f5f9"}
            stroke="#64748b" 
            strokeWidth="1"
            className="cursor-pointer transition-colors"
            onClick={() => onPartSelect("oberkörper")}
          />
          <rect 
            x="70" 
            y="35" 
            width="10" 
            height="35" 
            rx="5"
            fill={selectedPart === "oberkörper" || selectedPart === "ganzkörper" ? "hsl(var(--primary))" : "#f1f5f9"}
            stroke="#64748b" 
            strokeWidth="1"
            className="cursor-pointer transition-colors"
            onClick={() => onPartSelect("oberkörper")}
          />
          
          {/* Core/Waist */}
          <rect 
            x="38" 
            y="77" 
            width="24" 
            height="25" 
            rx="6"
            fill={selectedPart === "ganzkörper" ? "hsl(var(--primary))" : "#f1f5f9"}
            stroke="#64748b" 
            strokeWidth="1"
          />
          
          {/* Lower Body */}
          <rect 
            x="35" 
            y="102" 
            width="30" 
            height="50" 
            rx="8"
            fill={selectedPart === "unterkörper" || selectedPart === "ganzkörper" ? "hsl(var(--primary))" : "#f1f5f9"}
            stroke="#64748b" 
            strokeWidth="1"
            className="cursor-pointer transition-colors"
            onClick={() => onPartSelect("unterkörper")}
          />
          
          {/* Legs */}
          <rect 
            x="38" 
            y="152" 
            width="10" 
            height="40" 
            rx="5"
            fill={selectedPart === "unterkörper" || selectedPart === "ganzkörper" ? "hsl(var(--primary))" : "#f1f5f9"}
            stroke="#64748b" 
            strokeWidth="1"
            className="cursor-pointer transition-colors"
            onClick={() => onPartSelect("unterkörper")}
          />
          <rect 
            x="52" 
            y="152" 
            width="10" 
            height="40" 
            rx="5"
            fill={selectedPart === "unterkörper" || selectedPart === "ganzkörper" ? "hsl(var(--primary))" : "#f1f5f9"}
            stroke="#64748b" 
            strokeWidth="1"
            className="cursor-pointer transition-colors"
            onClick={() => onPartSelect("unterkörper")}
          />
        </svg>
      </div>
      
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          variant={selectedPart === "ganzkörper" ? "default" : "outline"}
          onClick={() => onPartSelect("ganzkörper")}
          className="w-full"
        >
          Ganzkörper
        </Button>
        <Button
          variant={selectedPart === "oberkörper" ? "default" : "outline"}
          onClick={() => onPartSelect("oberkörper")}
          className="w-full"
        >
          Oberkörper
        </Button>
        <Button
          variant={selectedPart === "unterkörper" ? "default" : "outline"}
          onClick={() => onPartSelect("unterkörper")}
          className="w-full"
        >
          Unterkörper
        </Button>
      </div>
    </div>
  )
}