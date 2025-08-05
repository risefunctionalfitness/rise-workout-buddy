import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type MembershipType = 'Basic Member' | 'Premium Member' | 'Trainer' | 'Administrator' | 'Open Gym' | 'Wellpass' | '10er Karte'

interface MembershipBadgeProps {
  type: MembershipType
  className?: string
}

const getMembershipColor = (type: MembershipType) => {
  switch (type) {
    case 'Basic Member':
      return 'hsl(334, 87%, 40%)' // #bd114a - RISE Brand Color (rot)
    case 'Premium Member':
      return 'hsl(45, 93%, 47%)' // #f0ad00 - Gold für Premium
    case 'Trainer':
      return 'hsl(212, 100%, 34%)' // #004aad
    case 'Administrator':
      return 'hsl(212, 100%, 34%)' // #004aad
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