import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { MoreVertical, Home, Users, Calendar, Newspaper, Dumbbell, LogOut, CreditCard, Moon, Sun, Trophy, Mail, Zap } from "lucide-react"
import { useTheme } from "next-themes"
import { supabase } from "@/integrations/supabase/client"
import { Logo } from "@/components/Logo"

interface RiseHeaderProps {
  showNavigation?: boolean
  onLogout?: () => void
  showAdminAccess?: boolean
  activePage?: string
  onPageChange?: (page: string) => void
}

export const RiseHeader: React.FC<RiseHeaderProps> = ({ 
  showNavigation = false,
  onLogout,
  showAdminAccess = false,
  activePage,
  onPageChange
}) => {
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { theme, setTheme } = useTheme()

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
          .maybeSingle()

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

    if (showAdminAccess) {
      checkAdminRole()
    }
  }, [showAdminAccess])

  const handleLogout = async () => {
    if (onLogout) {
      onLogout()
    }
    setDropdownOpen(false)
  }

  return (
    <header className="flex justify-between items-center w-full p-6 border-b border-border">
      <div className="flex items-center gap-4">
        <Logo 
          className="h-12"
          onClick={() => navigate('/')}
        />
      </div>
      
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        {(showNavigation || (showAdminAccess && isAdmin)) && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}
        
        
        {(showAdminAccess && isAdmin) && (
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setDropdownOpen(true)}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Navigation Overlay */}
      {dropdownOpen && (showAdminAccess && isAdmin) && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center p-8 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4 max-w-3xl w-full my-auto">
            <div 
              onClick={() => {
                onPageChange?.('home');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'home' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Home className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Home</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('members');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'members' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Users className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Mitglieder</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('courses');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'courses' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Calendar className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Kurse</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('templates');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'templates' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Dumbbell className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Vorlagen</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('news');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'news' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Newspaper className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">News</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('credits');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'credits' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <CreditCard className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Credits</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('workouts');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'workouts' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Dumbbell className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Workouts</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('codes');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'codes' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Users className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Codes</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('challenges');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'challenges' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Trophy className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Challenges</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('leaderboard');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'leaderboard' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Trophy className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Leaderboard</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('emails');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'emails' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Mail className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Emails</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('webhooks');
                setDropdownOpen(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors ${activePage === 'webhooks' ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Zap className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Webhooks</span>
            </div>
            {onLogout && (
              <div 
                onClick={handleLogout}
                className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-destructive/10 cursor-pointer transition-colors"
              >
                <LogOut className="h-8 w-8 text-destructive mb-2" />
                <span className="text-sm font-medium text-destructive">Abmelden</span>
              </div>
            )}
          </div>
          
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
    </header>
  )
}