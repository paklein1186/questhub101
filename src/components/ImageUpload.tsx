import { useRef, useState } from "react";
import { ImagePlus, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  label: string;
  currentImageUrl?: string;
  onChange: (url: string | undefined) => void;
  aspectRatio?: string; // e.g. "1/1", "16/9", "4/3"
  description?: string;
  className?: string;
}

export function ImageUpload({
  label,
  currentImageUrl,
  onChange,
  aspectRatio = "1/1",
  description,
  className,
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState(currentImageUrl ?? "");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Create object URL for local preview (mock — in production use storage upload)
    const objectUrl = URL.createObjectURL(file);
    onChange(objectUrl);
    setUrlValue(objectUrl);
  };

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      onChange(urlValue.trim());
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    setUrlValue("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium block">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {currentImageUrl ? (
        <div className="relative group inline-block">
          <div
            className="overflow-hidden rounded-lg border border-border bg-muted"
            style={{ aspectRatio, maxWidth: aspectRatio === "16/9" ? "100%" : "160px" }}
          >
            <img
              src={currentImageUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer w-full"
          style={{ aspectRatio, maxWidth: aspectRatio === "16/9" ? "100%" : "160px" }}
        >
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Click to upload</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        {currentImageUrl && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3 w-3 mr-1" /> Replace
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-xs h-7"
          onClick={() => setUrlMode(!urlMode)}
        >
          {urlMode ? "Hide URL" : "Use URL"}
        </Button>
      </div>

      {urlMode && (
        <div className="flex gap-2">
          <Input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://…"
            className="text-sm h-8 flex-1"
          />
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={handleUrlSubmit}
            disabled={!urlValue.trim()}
          >
            Set
          </Button>
        </div>
      )}
    </div>
  );
}
