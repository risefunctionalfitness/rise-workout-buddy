import { PercentageCalculator } from "@/components/PercentageCalculator"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { MemberBottomNavigation } from "@/components/MemberBottomNavigation"

const PercentageCalculatorPage = () => {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Back Button */}
      <div className="px-4 pt-4 pb-2">
        <Button 
          variant="ghost" 
          onClick={() => {
            navigate('/pro')
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('changeTab', { detail: 'wod' }))
            }, 100)
          }}
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>
      
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-foreground">Prozentrechner</h1>
      </div>
      
      {/* Calculator */}
      <div className="flex-1">
        <PercentageCalculator />
      </div>
      
      {/* Bottom Navigation */}
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

export default PercentageCalculatorPage
