import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2, FileText, ImageIcon, X, ExternalLink } from "lucide-react";
import { compressImage } from "@/lib/compressImage";

export interface EvidenceFile {
  url: string;
  path: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
}

interface Props {
  milestoneId: string;
  evidence: EvidenceFile[];
  compact?: boolean;
}

const MAX_SIZE_MB = 10;
const ACCEPT = "image/*,application/pdf";

export function MilestoneEvidenceUploader({ milestoneId, evidence, compact }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["user-milestones", user?.id] });

  const persistEvidence = async (next: EvidenceFile[]) => {
    if (!user?.id) return;
    await (supabase.from("user_milestones") as any).upsert(
      {
        user_id: user.id,
        milestone_id: milestoneId,
        evidence: next,
      },
      { onConflict: "user_id,milestone_id" }
    );
    invalidate();
  };

  const handleFile = async (raw: File) => {
    if (!user?.id) return;
    if (raw.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ title: `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const file = raw.type.startsWith("image/") ? await compressImage(raw) : raw;
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${milestoneId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("milestone-evidence")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("milestone-evidence")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const next: EvidenceFile[] = [
        ...evidence,
        {
          url: signed?.signedUrl ?? "",
          path,
          name: raw.name,
          type: file.type,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        },
      ];
      await persistEvidence(next);
      toast({ title: "Justificatif ajouté" });
    } catch (e: any) {
      toast({ title: "Échec de l'upload", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (item: EvidenceFile) => {
    await supabase.storage.from("milestone-evidence").remove([item.path]);
    await persistEvidence(evidence.filter((e) => e.path !== item.path));
  };

  return (
    <div className="mt-2 space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {evidence.length > 0 && (
        <ul className="space-y-1">
          {evidence.map((f) => (
            <li
              key={f.path}
              className="flex items-center gap-1.5 text-[11px] bg-muted/40 rounded px-1.5 py-1"
            >
              {f.type.startsWith("image/") ? (
                <ImageIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate flex-1 hover:underline"
                title={f.name}
              >
                {f.name}
              </a>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => handleRemove(f)}
                className="text-muted-foreground hover:text-destructive"
                title="Supprimer"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-[11px] gap-1.5 px-2"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Paperclip className="h-3 w-3" />
        )}
        {uploading
          ? "Envoi…"
          : evidence.length === 0
          ? "Ajouter un justificatif (image / PDF)"
          : "Ajouter un autre fichier"}
      </Button>
    </div>
  );
}
