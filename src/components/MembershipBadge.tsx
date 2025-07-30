import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type MembershipType = 'Member' | 'Trainer' | 'Open Gym' | 'Wellpass' | '10er Karte'

interface MembershipBadgeProps {
  type: MembershipType
  className?: string
}

const getMembershipColor = (type: MembershipType) => {
  switch (type) {
    case 'Member':
      return 'hsl(334, 87%, 40%)' // #bd114a
    case 'Trainer':
      return 'hsl(271, 100%, 40%)' // Purple for trainers
    case 'Open Gym':
      return 'hsl(0, 0%, 85%)' // #d9d9d9
    case 'Wellpass':
      return 'hsl(185, 100%, 33%)' // #00a8b5
    case '10er Karte':
      return 'hsl(0, 0%, 0%)' // #000000
    default:
      return 'hsl(334, 87%, 40%)'
  }
}

const getTextColor = (type: MembershipType) => {
  // Use white text for dark backgrounds, dark text for light backgrounds
  switch (type) {
    case 'Open Gym':
      return 'hsl(0, 0%, 20%)'
    default:
      return 'hsl(0, 0%, 100%)'
  }
}

export const MembershipBadge: React.FC<MembershipBadgeProps> = ({ type, className }) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border-0",
        className
      )}
      style={{
        backgroundColor: getMembershipColor(type),
        color: getTextColor(type)
      }}
    >
      {type}
    </Badge>
  )
}