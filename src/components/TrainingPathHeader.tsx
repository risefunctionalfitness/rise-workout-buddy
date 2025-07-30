import { Flame } from "lucide-react"
import { AvatarUpload } from "@/components/AvatarUpload"

interface TrainingPathHeaderProps {
  trainingDaysThisMonth: number
  totalDaysInMonth: number
  userAvatar?: string | null
  userId: string
  onProfileClick: () => void
  onAvatarUpdate?: (newAvatarUrl: string) => void
}

export const TrainingPathHeader: React.FC<TrainingPathHeaderProps> = ({
  trainingDaysThisMonth,
  totalDaysInMonth,
  userAvatar,
  userId,
  onProfileClick,
  onAvatarUpdate
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      {/* Links: Profilbild mit Upload */}
      <div className="flex-1">
        <div className="cursor-pointer" onClick={onProfileClick}>
          <AvatarUpload
            userId={userId}
            currentAvatarUrl={userAvatar}
            onAvatarUpdate={onAvatarUpdate}
            size="md"
            showUploadButton={true}
          />
        </div>
      </div>
      
      {/* Mitte: RISE Logo */}
      <div className="flex-1 flex justify-center">
        <img 
          src="/lovable-uploads/c96a74cb-c5bf-4636-97c3-b28e0057849e.png" 
          alt="RISE Functional Fitness Logo" 
          className="h-8"
        />
      </div>
      
      {/* Rechts: Trainingstage */}
      <div className="flex items-center gap-2 text-primary flex-1 justify-end">
        <Flame className="h-6 w-6" />
        <span className="font-bold text-lg">
          {trainingDaysThisMonth} / {totalDaysInMonth}
        </span>
      </div>
    </div>
  )
}