import { Flame, User, Zap, Award, Crown, MoreVertical, Home, Users, Calendar, Newspaper, Dumbbell, LogOut, CreditCard } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Logo } from "@/components/Logo"

interface TrainingPathHeaderProps {
  trainingDaysThisMonth: number
  totalDaysInMonth: number
  userAvatar?: string | null
  onProfileClick: () => void
  onLogout?: () => void
}

export const TrainingPathHeader: React.FC<TrainingPathHeaderProps> = ({
  trainingDaysThisMonth,
  totalDaysInMonth,
  userAvatar,
  onProfileClick,
  onLogout
}) => {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Special handling for admin email
        if (user.email === 'admin@rise-fitness.com') {
          setIsAdmin(true)
          return
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin role:', error)
          setIsAdmin(false)
        } else {
          setIsAdmin(!!data)
        }
      } catch (error) {
        console.error('Error checking admin role:', error)
        setIsAdmin(false)
      }
    }

    checkAdminRole()
  }, [])

  const handleLogout = async () => {
    if (onLogout) {
      onLogout()
    }
    setDropdownOpen(false)
  }
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
      
      {/* Rechts: Trainingstage und Admin-Zugang */}
      <div className="flex items-center gap-2 text-primary flex-1 justify-end">
        {trainingDaysThisMonth >= 20 ? (
          <Crown className="h-6 w-6 text-yellow-500 animate-bounce" />
        ) : trainingDaysThisMonth >= 10 ? (
          <Award className="h-6 w-6 text-orange-500 animate-pulse" />
        ) : trainingDaysThisMonth >= 5 ? (
          <Zap className="h-6 w-6 text-blue-500" />
        ) : (
          <Flame className="h-6 w-6 text-rise-accent" />
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