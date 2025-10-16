import { useState } from "react"
import { FileText, Download, X } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface Attachment {
  name: string
  path: string
  type: string
  size: number
  url: string
}

interface NewsAttachmentsProps {
  attachments: Attachment[]
}

export const NewsAttachments = ({ attachments }: NewsAttachmentsProps) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  if (!attachments || attachments.length === 0) return null

  const images = attachments.filter(att => att.type.startsWith('image/'))
  const files = attachments.filter(att => !att.type.startsWith('image/'))

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Image Gallery */}
      {images.length > 0 && (
        <div className={`grid gap-3 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative group cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
              onClick={() => setLightboxImage(img.url)}
            >
              <img
                src={img.url}
                alt={img.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => (
            <a
              key={idx}
              href={file.url}
              download={file.name}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </a>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 border-0 bg-transparent">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Full size"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}