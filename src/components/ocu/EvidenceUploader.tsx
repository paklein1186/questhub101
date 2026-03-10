import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

interface Props {
  onUpload: (url: string) => void;
  questId: string;
  accept?: string;
  maxSizeMb?: number;
}

export function EvidenceUploader({ onUpload, questId, accept = "image/*,application/pdf", maxSizeMb = 10 }: Props) {
  const currentUser = useCurrentUser();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!currentUser.id) return;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File too large (max ${maxSizeMb}MB)`);
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${questId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("contribution-evidence")
      .upload(path, file, { upsert: false });

    if (uploadErr) {
      setError("Upload failed — please try again");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("contribution-evidence")
      .getPublicUrl(path);

    onUpload(data.publicUrl);
    setUploading(false);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? "Uploading…" : "Upload receipt / evidence"}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
