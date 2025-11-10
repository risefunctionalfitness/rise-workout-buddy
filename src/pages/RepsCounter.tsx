import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TrainingPathHeader } from "@/components/TrainingPathHeader"
import { MemberBottomNavigation } from "@/components/MemberBottomNavigation"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"

const RepsCounter = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [trainingDaysThisMonth] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.avatar_url) {
              setUserAvatar(data.avatar_url)
            }
          })
      }
    })
  }, [])

  const modes = [
    {
      title: "Simple Mode",
      description: "Schnelles Zählen\nvon Runden",
      onClick: () => navigate('/rep-counter/simple')
    },
    {
      title: "Pro Mode",
      description: "Detailliertes Tracking\nmit Zielvorgaben",
      onClick: () => navigate('/rep-counter/pro')
    }
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      <TrainingPathHeader 
        user={user}
        userAvatar={userAvatar}
        onProfileClick={() => navigate('/pro')}
        onAdminClick={() => navigate('/admin')}
      />

      <div className="px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/pro')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>

      <div className="text-center px-4 mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Rep Counter</h1>
        <p className="text-sm text-muted-foreground">
          Zähle Runden und Wiederholungen
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-4">
        {modes.map((mode) => (
          <button
            key={mode.title}
            onClick={mode.onClick}
            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-150 dark:hover:bg-gray-700 rounded-2xl p-6 h-32 shadow-sm transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="flex flex-col justify-center h-full text-center">
              <h3 className="text-xl font-bold text-foreground">{mode.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line mt-2">
                {mode.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      <MemberBottomNavigation 
        activeTab="wod"
        showCoursesTab={true}
        onTabChange={(tab) => {
          navigate('/pro')
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('changeTab', { detail: tab }))
          }, 100)
        }}
      />
    </div>
  )
}

export default RepsCounter
