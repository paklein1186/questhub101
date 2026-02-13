import { useRef, useState, useEffect } from "react";
import { ImagePlus, X, Upload, Loader2, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  label: string;
  currentImageUrl?: string;
  onChange: (url: string | undefined) => void;
  onFocalPointChange?: (yPercent: number) => void;
  focalPoint?: number;
  aspectRatio?: string;
  description?: string;
  className?: string;
}

export function ImageUpload({
  label,
  currentImageUrl,
  onChange,
  onFocalPointChange,
  focalPoint = 50,
  aspectRatio = "1/1",
  description,
  className,
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState(currentImageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [showFocalEditor, setShowFocalEditor] = useState(false);
  const [localFocal, setLocalFocal] = useState(focalPoint);
  const { toast } = useToast();

  useEffect(() => {
    setLocalFocal(focalPoint);
  }, [focalPoint]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("entity-images")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("entity-images")
        .getPublicUrl(filePath);

      onChange(urlData.publicUrl);
      setUrlValue(urlData.publicUrl);
      setShowFocalEditor(true);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      onChange(urlValue.trim());
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    setUrlValue("");
    setShowFocalEditor(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFocalChange = (value: number[]) => {
    const y = value[0];
    setLocalFocal(y);
    onFocalPointChange?.(y);
  };

  // Check if URL is a broken blob URL
  const isValidUrl = currentImageUrl && !currentImageUrl.startsWith("blob:");

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium block">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {isValidUrl ? (
        <div className="space-y-2">
          <div className="relative group inline-block">
            <div
              className="overflow-hidden rounded-lg border border-border bg-muted"
              style={{ aspectRatio, maxWidth: aspectRatio === "16/9" ? "100%" : "160px" }}
            >
              <img
                src={currentImageUrl}
                alt={label}
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${localFocal}%` }}
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

          {/* Focal point adjuster */}
          {showFocalEditor && (
            <div className="flex items-center gap-3 p-2 rounded-md border border-border bg-muted/30 max-w-xs">
              <Focus className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 space-y-1">
                <span className="text-xs text-muted-foreground">Adjust focus</span>
                <Slider
                  value={[localFocal]}
                  onValueChange={handleFocalChange}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Top</span>
                  <span>Bottom</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !uploading && fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer w-full disabled:opacity-50"
          style={{ aspectRatio, maxWidth: aspectRatio === "16/9" ? "100%" : "160px" }}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {uploading ? "Uploading…" : "Click to upload"}
          </span>
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
        {isValidUrl && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />} Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant={showFocalEditor ? "secondary" : "outline"}
              className="text-xs h-7"
              onClick={() => setShowFocalEditor(!showFocalEditor)}
            >
              <Focus className="h-3 w-3 mr-1" /> Focus
            </Button>
          </>
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