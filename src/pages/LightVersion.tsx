import { RiseHeader } from "@/components/RiseHeader"
import { WorkoutGenerator } from "@/components/WorkoutGenerator"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

const LightVersion = () => {
  const navigate = useNavigate()

  const handleProClick = () => {
    navigate("/pro")
  }

  return (
    <div className="min-h-screen bg-background relative">
      <RiseHeader onProVersionClick={() => navigate("/auth")} />
      
      <main className="container mx-auto px-6 py-8 pt-20">
        <WorkoutGenerator user={{ id: 'demo-user' } as any} />
      </main>
    </div>
  )
}

export default LightVersion