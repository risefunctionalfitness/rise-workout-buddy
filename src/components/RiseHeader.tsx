import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { MoreVertical, Home, Users, Calendar, Newspaper, Dumbbell, LogOut, CreditCard } from "lucide-react"
import { useTheme } from "next-themes"
import { supabase } from "@/integrations/supabase/client"

interface RiseHeaderProps {
  onProVersionClick?: () => void
  showNavigation?: boolean
  onLogout?: () => void
  showAdminAccess?: boolean
  activePage?: string
  onPageChange?: (page: string) => void
}

export const RiseHeader: React.FC<RiseHeaderProps> = ({ 
  onProVersionClick,
  showNavigation = false,
  onLogout,
  showAdminAccess = false,
  activePage,
  onPageChange
}) => {
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { theme } = useTheme()

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
        <img 
          src={theme === 'dark' ? "/lovable-uploads/b08fe6ce-59ea-452d-9cb8-67250112b558.png" : "/lovable-uploads/92ae5157-61ac-4a34-850f-7a1e0ebbabf7.png"}
          alt="RISE Functional Fitness Logo" 
          className="h-12 cursor-pointer"
          onClick={() => navigate('/')}
        />
      </div>
      
      <div className="flex items-center gap-2">
        {onProVersionClick && (
          <Button 
            onClick={onProVersionClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Zur Pro-Version
          </Button>
        )}
        
        {(showNavigation || (showAdminAccess && isAdmin)) && (
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
      {dropdownOpen && (showNavigation || (showAdminAccess && isAdmin)) && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col justify-center items-center p-8">
          <div className="grid grid-cols-2 gap-6 max-w-md w-full">
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
                navigate('/admin/workouts');
                setDropdownOpen(false);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-muted cursor-pointer transition-colors"
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
    </header>
  )
}