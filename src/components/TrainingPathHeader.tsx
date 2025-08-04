import { Flame, User, Zap, Award, Crown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"

interface TrainingPathHeaderProps {
  trainingDaysThisMonth: number
  totalDaysInMonth: number
  userAvatar?: string | null
  onProfileClick: () => void
}

export const TrainingPathHeader: React.FC<TrainingPathHeaderProps> = ({
  trainingDaysThisMonth,
  totalDaysInMonth,
  userAvatar,
  onProfileClick
}) => {
  const { theme } = useTheme()
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      {/* Links: Nur Avatar anzeigen */}
      <div className="flex-1">
        <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={onProfileClick}>
          <AvatarImage src={userAvatar} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      </div>
      
      {/* Mitte: RISE Logo */}
      <div className="flex-1 flex justify-center">
        <img 
          src={theme === 'dark' ? "/src/assets/rise-logo-dark.png" : "/lovable-uploads/c96a74cb-c5bf-4636-97c3-b28e0057849e.png"}
          alt="RISE Functional Fitness Logo" 
          className="h-10 mt-1 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => window.location.href = '/pro'}
        />
      </div>
      
      {/* Rechts: Trainingstage */}
      <div className="flex items-center gap-2 text-primary flex-1 justify-end">
        {trainingDaysThisMonth >= 20 ? (
          <Crown className="h-6 w-6 text-yellow-500 animate-bounce" />
        ) : trainingDaysThisMonth >= 10 ? (
          <Award className="h-6 w-6 text-orange-500 animate-pulse" />
        ) : trainingDaysThisMonth >= 5 ? (
          <Zap className="h-6 w-6 text-blue-500" />
        ) : (
          <Flame className="h-6 w-6" />
        )}
        <span className="font-bold text-lg">
          {trainingDaysThisMonth} / {totalDaysInMonth}
        </span>
      </div>
    </div>
  )
}