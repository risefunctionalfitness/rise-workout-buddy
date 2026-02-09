import { useRef } from "react";
import { Upload, Check } from "lucide-react";

export type BackgroundOption = "dark" | "custom";

interface BackgroundSelectorProps {
  selected: BackgroundOption;
  onSelect: (option: BackgroundOption) => void;
  onCustomUpload: (file: File) => void;
  customUrl: string | null;
}

export const BackgroundSelector = ({
  selected,
  onSelect,
  onCustomUpload,
  customUrl,
}: BackgroundSelectorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }
      onCustomUpload(file);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Dark option */}
      <button
        onClick={() => onSelect("dark")}
        className={`relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
          selected === "dark"
            ? "border-primary ring-2 ring-primary/20"
            : "border-transparent hover:border-muted-foreground/30"
        }`}
      >
        <div className="absolute inset-0 bg-gray-950" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(139,30,30,0.4), transparent)' }} />
        {selected === "dark" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}
        <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-white font-medium drop-shadow">
          Dark
        </span>
      </button>

      {/* Custom Upload */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
          selected === "custom" 
            ? "border-primary ring-2 ring-primary/20" 
            : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
        }`}
      >
        {customUrl ? (
          <>
            <img src={customUrl} alt="Custom" className="absolute inset-0 w-full h-full object-cover" />
            {selected === "custom" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
            <Upload className="h-4 w-4 text-muted-foreground mb-1" />
          </div>
        )}
        <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-foreground font-medium">
          Upload
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
