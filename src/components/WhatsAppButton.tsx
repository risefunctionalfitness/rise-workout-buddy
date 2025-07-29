import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const WhatsAppButton = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/4915730440756', '_blank')
  }

  return (
    <Button
      onClick={handleWhatsAppClick}
      className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg p-0"
      aria-label="WhatsApp kontaktieren"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  )
}