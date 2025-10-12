import { User, Grid3X3 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Logo } from "@/components/Logo"
import { LeaderboardPosition } from "@/components/LeaderboardPosition"

interface TrainingPathHeaderProps {
  user: any
  userAvatar?: string | null
  onProfileClick: () => void
  onAdminClick: () => void
}

export const TrainingPathHeader: React.FC<TrainingPathHeaderProps> = ({
  user,
  userAvatar,
  onProfileClick,
  onAdminClick
}) => {
  const [isAdmin, setIsAdmin] = useState(false)
  const [leaderboardVisible, setLeaderboardVisible] = useState(false)

  useEffect(() => {
    const checkRole = async () => {
      if (!user?.id) return
      
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle()
        
        setIsAdmin(!!roleData)
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('leaderboard_visible')
          .eq('user_id', user.id)
          .single()
        
        setLeaderboardVisible(profileData?.leaderboard_visible || false)
      } catch (error) {
        console.error('Error checking role:', error)
      }
    }
    
    checkRole()
  }, [user?.id])

  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      {/* Links: Avatar */}
      <div className="flex-1">
        <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={onProfileClick}>
          <AvatarImage src={userAvatar} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      </div>
      
      {/* Mitte: Logo */}
      <div className="flex-1 flex justify-center">
        <Logo 
          className="h-10 mt-1"
          onClick={() => window.location.href = '/pro'}
        />
      </div>
      
      {/* Rechts: Leaderboard Position + Admin Grid */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {leaderboardVisible && user && (
          <LeaderboardPosition user={user} />
        )}
        <span className="font-bold text-lg text-rise-accent">
          {trainingDaysThisMonth} / {totalDaysInMonth}
        </span>
        
        {/* Admin-Zugang Button */}
        {isAdmin && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setDropdownOpen(true)}
            className="h-8 w-8 ml-2"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Admin Navigation Overlay */}
      {dropdownOpen && isAdmin && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col justify-center items-center p-8">
          <div className="grid grid-cols-2 gap-6 max-w-md w-full">
            <div 
              onClick={() => {
                navigate('/admin');
                setDropdownOpen(false);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <Home className="h-8 w-8 text-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Home</span>
            </div>
            <div 
              onClick={() => {
                navigate('/admin');
                setDropdownOpen(false);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <Users className="h-8 w-8 text-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Mitglieder</span>
            </div>
            <div 
              onClick={() => {
                navigate('/admin');
                setDropdownOpen(false);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <Calendar className="h-8 w-8 text-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Kurse</span>
            </div>
            <div 
              onClick={() => {
                navigate('/admin');
                setDropdownOpen(false);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <Dumbbell className="h-8 w-8 text-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Vorlagen</span>
            </div>
            <div 
              onClick={() => {
                navigate('/admin');
                setDropdownOpen(false);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <Newspaper className="h-8 w-8 text-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">News</span>
            </div>
            <div 
              onClick={() => {
                navigate('/admin');
                setDropdownOpen(false);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <CreditCard className="h-8 w-8 text-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Credits</span>
            </div>
            <div 
              onClick={() => {
                navigate('/workout-management');
                setDropdownOpen(false);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <Dumbbell className="h-8 w-8 text-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Workouts</span>
            </div>
            <div 
              onClick={() => {
                navigate('/admin');
                setDropdownOpen(false);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <Users className="h-8 w-8 text-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Codes</span>
            </div>
          </div>
          
          {onLogout && (
            <div className="mt-8">
              <div 
                onClick={handleLogout}
                className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-destructive/10 cursor-pointer transition-colors"
              >
                <LogOut className="h-8 w-8 text-destructive mb-2" />
                <span className="text-sm font-medium text-destructive">Abmelden</span>
              </div>
            </div>
          )}
          
          {/* Close button */}
          <div className="absolute top-6 right-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDropdownOpen(false)}
            >
              <span className="text-xl">×</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}