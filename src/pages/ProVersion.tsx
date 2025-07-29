import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Dashboard } from "./Dashboard"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"

const ProVersion = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate("/auth")
        return
      }
      setUser(session.user)
      setLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth")
        return
      }
      setUser(session.user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to auth
  }

  // Show Dashboard when authenticated
  return (
    <div className="min-h-screen bg-background pb-20">
      <Dashboard user={user} />
    </div>
  )
}

export default ProVersion