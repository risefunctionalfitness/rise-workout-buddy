import { useState, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Camera, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string | null
  onAvatarUpdate?: (newAvatarUrl: string) => void
  size?: "sm" | "md" | "lg"
  showUploadButton?: boolean
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  userId,
  currentAvatarUrl,
  onAvatarUpdate,
  size = "md",
  showUploadButton = true
}) => {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20"
  }

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true)

      // Create a unique filename with user ID
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/avatar.${fileExt}`

      // Delete existing avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${userId}/${oldPath}`])
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId)

      if (updateError) throw updateError

      onAvatarUpdate?.(publicUrl)
      toast({
        title: "Profilbild hochgeladen",
        description: "Ihr Profilbild wurde erfolgreich aktualisiert."
      })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Fehler beim Hochladen",
        description: "Das Profilbild konnte nicht hochgeladen werden.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Ungültiger Dateityp",
          description: "Bitte wählen Sie ein Bild aus.",
          variant: "destructive"
        })
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Datei zu groß",
          description: "Das Bild darf maximal 5MB groß sein.",
          variant: "destructive"
        })
        return
      }

      uploadAvatar(file)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Avatar Display */}
      <div className={cn("relative", sizeClasses[size])}>
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt="Profilbild"
            className="w-full h-full rounded-full object-cover border-2 border-border"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-muted border-2 border-border flex items-center justify-center">
            <Camera className={cn("text-muted-foreground", 
              size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-6 h-6"
            )} />
          </div>
        )}
        
        {showUploadButton && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button (alternative) */}
      {showUploadButton && size === "lg" && (
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Hochladen..." : "Bild ändern"}
        </Button>
      )}
    </div>
  )
}