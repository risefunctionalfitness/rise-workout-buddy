import { useState, useRef, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, Upload, Crop as CropIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

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
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>("")
  const [crop, setCrop] = useState<Crop>({ 
    unit: '%', 
    width: 90, 
    height: 90, 
    x: 5, 
    y: 5 
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20"
  }

  const getCroppedImg = useCallback((image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('No 2d context')
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const pixelRatio = window.devicePixelRatio

    canvas.width = crop.width * pixelRatio * scaleX
    canvas.height = crop.height * pixelRatio * scaleY

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    )

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95)
    })
  }, [])

  const uploadAvatar = async (imageBlob: Blob) => {
    try {
      setUploading(true)

      // Create a unique filename with user ID
      const fileName = `${userId}/avatar.jpg`

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
        .upload(fileName, imageBlob, { upsert: true })

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
      setCropDialogOpen(false)
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

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return

    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop)
      if (croppedImageBlob) {
        await uploadAvatar(croppedImageBlob)
      }
    } catch (error) {
      console.error('Error cropping image:', error)
      toast({
        title: "Fehler beim Zuschneiden",
        description: "Das Bild konnte nicht zugeschnitten werden.",
        variant: "destructive"
      })
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

      // Create object URL and open crop dialog
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || '')
        setCropDialogOpen(true)
      })
      reader.readAsDataURL(file)
    }
  }

  return (
    <>
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

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="h-5 w-5" />
              Bildausschnitt wählen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {imageSrc && (
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imageSrc}
                    style={{ maxHeight: '400px', maxWidth: '100%' }}
                  />
                </ReactCrop>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCropDialogOpen(false)}
                disabled={uploading}
              >
                Abbrechen
              </Button>
              <Button 
                onClick={handleCropComplete}
                disabled={uploading || !completedCrop}
              >
                {uploading ? "Hochladen..." : "Speichern"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}