import { Calendar, Flame, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TrainingPathHeaderProps {
  trainingDaysThisMonth: number
  totalDaysInMonth: number
  currentDate: string
  userName: string
  userAvatar?: string
}

export const TrainingPathHeader: React.FC<TrainingPathHeaderProps> = ({
  trainingDaysThisMonth,
  totalDaysInMonth,
  currentDate,
  userName,
  userAvatar
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-primary">
          <Flame className="h-6 w-6" />
          <span className="font-bold text-lg">
            {trainingDaysThisMonth} / {totalDaysInMonth}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <span className="text-sm">{currentDate}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="font-medium text-foreground">{userName}</span>
        <Avatar className="h-10 w-10">
          <AvatarImage src={userAvatar} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}