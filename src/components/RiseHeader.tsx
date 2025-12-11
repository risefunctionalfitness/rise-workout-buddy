import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { MoreVertical, Home, Users, Calendar, Newspaper, Dumbbell, LogOut, CreditCard, Moon, Sun, Trophy, Mail, Radio, ShoppingBag } from "lucide-react"
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
    <header className="relative z-50 flex justify-between items-center w-full p-6 border-b border-border">
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
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {dropdownOpen ? (
              <span className="text-xl">×</span>
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      
      {/* Navigation Overlay */}
      {dropdownOpen && (showAdminAccess && isAdmin) && (
        <div className="fixed inset-x-0 top-[88px] bottom-0 z-40 bg-background/95 backdrop-blur-sm flex flex-col items-center p-8 overflow-y-auto">
          <div className="grid grid-cols-3 gap-6 max-w-3xl w-full my-auto justify-items-center">
            <div 
              onClick={() => {
                onPageChange?.('home');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'home' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Home className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Home</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('members');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'members' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Users className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Mitglieder</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('courses');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'courses' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Calendar className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Kurse</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('templates');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'templates' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Dumbbell className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Vorlagen</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('news');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'news' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Newspaper className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">News</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('credits');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'credits' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <CreditCard className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Credits</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('workouts');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'workouts' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Dumbbell className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Workouts</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('codes');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'codes' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Users className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Codes</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('challenges');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'challenges' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Trophy className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Challenges</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('leaderboard');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'leaderboard' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Trophy className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Leaderboard</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('emails');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'emails' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Mail className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Emails</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('risk-radar');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'risk-radar' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <Radio className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Risk Radar</span>
            </div>
            <div 
              onClick={() => {
                onPageChange?.('orders');
                setDropdownOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-muted/50 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg ${activePage === 'orders' ? 'bg-primary/10 text-primary border-primary/50 shadow-md' : ''}`}
            >
              <ShoppingBag className="h-10 w-10 mb-3" />
              <span className="text-sm font-semibold">Bestellungen</span>
            </div>
            {onLogout && (
              <div 
                onClick={handleLogout}
                className="w-full flex flex-col items-center justify-center p-6 rounded-xl hover:bg-destructive/10 hover:scale-105 cursor-pointer transition-all duration-300 border border-border/50 hover:border-destructive/30 hover:shadow-lg"
              >
                <LogOut className="h-10 w-10 text-destructive mb-3" />
                <span className="text-sm font-semibold text-destructive">Abmelden</span>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}