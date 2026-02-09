import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, Upload, Check } from "lucide-react";
import { BackgroundSelector, BackgroundOption } from "@/components/highlights/BackgroundSelector";
import { generateShareImage } from "@/lib/shareImageGenerator";
import { useToast } from "@/hooks/use-toast";
import { UserStats } from "@/hooks/useUserAchievements";

interface ShareData {
  type: string;
  icon: string;
  value: string;
  label: string;
  sublabel?: string;
  stats?: UserStats;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareData: ShareData;
}

type ImageFormat = "story" | "square";

export const ShareDialog = ({ open, onOpenChange, shareData }: ShareDialogProps) => {
  const [selectedBackground, setSelectedBackground] = useState<BackgroundOption>("dark");
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string | null>(null);
  const [imageFormat, setImageFormat] = useState<ImageFormat>("story");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Generate preview when settings change
  useEffect(() => {
    if (open) {
      generatePreview();
    }
  }, [open, selectedBackground, customBackgroundUrl, imageFormat, shareData]);

  const generatePreview = async () => {
    try {
      const canvas = await generateShareImage({
        ...shareData,
        background: selectedBackground,
        customBackgroundUrl,
        format: imageFormat,
      });
      setPreviewUrl(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Error generating preview:", error);
    }
  };

  const handleCustomBackground = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCustomBackgroundUrl(reader.result as string);
      setSelectedBackground("custom");
    };
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateShareImage({
        ...shareData,
        background: selectedBackground,
        customBackgroundUrl,
        format: imageFormat,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("Failed to create image blob");
        }

        const file = new File([blob], "rise-highlight.png", { type: "image/png" });

        // Try Web Share API first
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Mein Training bei RISE",
            });
            toast({
              title: "Geteilt!",
              description: "Das Bild wurde erfolgreich geteilt.",
            });
            onOpenChange(false);
            return;
          } catch (shareError) {
            // User cancelled or share failed, fall back to download
            console.log("Share cancelled or failed, falling back to download");
          }
        }

        // Fallback: Download
        downloadImage(blob);
      }, "image/png");
    } catch (error) {
      console.error("Error sharing:", error);
      toast({
        title: "Fehler",
        description: "Das Bild konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rise-highlight.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Heruntergeladen!",
      description: "Das Bild wurde in deinen Downloads gespeichert.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bild erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div 
            className="relative rounded-lg overflow-hidden bg-muted flex items-center justify-center"
            style={{ aspectRatio: imageFormat === "story" ? "9/16" : "1/1", maxHeight: "320px" }}
          >
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Vorschau" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-muted-foreground text-sm">Lädt...</div>
            )}
          </div>

          {/* Background Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Hintergrund:</label>
            <BackgroundSelector
              selected={selectedBackground}
              onSelect={setSelectedBackground}
              onCustomUpload={handleCustomBackground}
              customUrl={customBackgroundUrl}
            />
          </div>

          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Format:</label>
            <div className="flex gap-2">
              <Button
                variant={imageFormat === "story" ? "default" : "outline"}
                size="sm"
                onClick={() => setImageFormat("story")}
                className="flex-1"
              >
                Story 9:16
              </Button>
              <Button
                variant={imageFormat === "square" ? "default" : "outline"}
                size="sm"
                onClick={() => setImageFormat("square")}
                className="flex-1"
              >
                Square 1:1
              </Button>
            </div>
          </div>

          {/* Share/Download Button */}
          <Button 
            onClick={handleShare} 
            className="w-full" 
            size="default"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>Wird erstellt...</>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Teilen / Speichern
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
