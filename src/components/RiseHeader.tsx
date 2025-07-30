import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

interface RiseHeaderProps {
  onProVersionClick?: () => void
}

export const RiseHeader: React.FC<RiseHeaderProps> = ({ 
  onProVersionClick 
}) => {
  const navigate = useNavigate()
  return (
    <header className="flex justify-between items-center w-full p-6 border-b border-border">
      <div className="flex items-center gap-4">
        <img 
          src="/lovable-uploads/c96a74cb-c5bf-4636-97c3-b28e0057849e.png" 
          alt="RISE Functional Fitness Logo" 
          className="h-12 cursor-pointer"
          onClick={() => navigate('/')}
        />
      </div>
      <Button 
        onClick={onProVersionClick}
        variant="outline"
        size="lg"
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
      >
        Zur Pro-Version
      </Button>
    </header>
  )
}