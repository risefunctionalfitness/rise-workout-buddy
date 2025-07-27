import * as React from "react"
import { cn } from "@/lib/utils"

interface SelectButtonProps {
  children: React.ReactNode
  isSelected: boolean
  onClick: () => void
  className?: string
}

export const SelectButton: React.FC<SelectButtonProps> = ({
  children,
  isSelected,
  onClick,
  className
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-lg border-2 font-medium transition-all duration-200",
        isSelected
          ? "bg-primary text-primary-foreground border-primary shadow-lg"
          : "bg-background text-foreground border-border hover:border-primary hover:shadow-md",
        className
      )}
    >
      {children}
    </button>
  )
}