import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { MoreVertical, Home, Users, Calendar, Newspaper, Dumbbell, LogOut } from "lucide-react"
import { useTheme } from "next-themes"

interface RiseHeaderProps {
  onProVersionClick?: () => void
  showNavigation?: boolean
  onLogout?: () => void
}

export const RiseHeader: React.FC<RiseHeaderProps> = ({ 
  onProVersionClick,
  showNavigation = false,
  onLogout
}) => {
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { theme } = useTheme()

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
          src={theme === 'dark' ? "/src/assets/rise-logo-dark.png" : "/lovable-uploads/c96a74cb-c5bf-4636-97c3-b28e0057849e.png"}
          alt="RISE Functional Fitness Logo" 
          className="h-12 cursor-pointer"
          onClick={() => navigate('/')}
        />
      </div>
      
      {showNavigation && (
        <>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setDropdownOpen(true)}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          
          {/* Navigation Overlay */}
          {dropdownOpen && (
            <div className="fixed inset-0 z-50 bg-white flex flex-col justify-center items-center p-8">
              <div className="grid grid-cols-2 gap-8 max-w-md w-full">
                <div 
                  onClick={() => {
                    navigate('/admin');
                    setDropdownOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <Home className="h-12 w-12 text-gray-600 mb-3" />
                  <span className="text-lg font-medium">Home</span>
                </div>
                <div 
                  onClick={() => {
                    navigate('/admin');
                    setDropdownOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <Users className="h-12 w-12 text-gray-600 mb-3" />
                  <span className="text-lg font-medium">Mitglieder</span>
                </div>
                <div 
                  onClick={() => {
                    navigate('/admin?tab=courses');
                    setDropdownOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <Calendar className="h-12 w-12 text-gray-600 mb-3" />
                  <span className="text-lg font-medium">Kurse</span>
                </div>
                <div 
                  onClick={() => {
                    navigate('/admin?tab=templates');
                    setDropdownOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <Calendar className="h-12 w-12 text-gray-600 mb-3" />
                  <span className="text-lg font-medium">Vorlagen</span>
                </div>
                <div 
                  onClick={() => {
                    navigate('/admin?tab=news');
                    setDropdownOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <Newspaper className="h-12 w-12 text-gray-600 mb-3" />
                  <span className="text-lg font-medium">News</span>
                </div>
                <div 
                  onClick={() => {
                    navigate('/workout-management');
                    setDropdownOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <Dumbbell className="h-12 w-12 text-gray-600 mb-3" />
                  <span className="text-lg font-medium">Workouts</span>
                </div>
                <div 
                  onClick={() => {
                    navigate('/admin?tab=codes');
                    setDropdownOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <Users className="h-12 w-12 text-gray-600 mb-3" />
                  <span className="text-lg font-medium">Codes</span>
                </div>
              </div>
              <div className="mt-12">
                <div 
                  onClick={handleLogout}
                  className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                >
                  <LogOut className="h-12 w-12 text-red-600 mb-3" />
                  <span className="text-lg font-medium text-red-600">Abmelden</span>
                </div>
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
        </>
      )}
    </header>
  )
}