import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileX, Download, ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Public route that resolves an attachment ID to its storage URL.
 *
 * We previously auto-redirected with `window.location.href`, but
 * privacy-focused browsers (Brave Shields, uBlock, etc.) sometimes block
 * direct `*.supabase.co` storage URLs with ERR_BLOCKED_BY_CLIENT, leaving
 * the user on a blank/broken page. Instead we now render a small landing
 * page with explicit Open / Download buttons (real user-initiated
 * top-level navigation that ad-blockers allow) plus a preview iframe.
 */
export default function DocumentRedirect() {
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState(false);
  const [att, setAtt] = useState<{
    file_url: string;
    file_name: string | null;
    mime_type: string | null;
  } | null>(null);

  useEffect(() => {
    if (!id) { setError(true); return; }

    (async () => {
      const { data, error: fetchErr } = await supabase
        .from("attachments")
        .select("file_url, file_name, mime_type")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !data?.file_url) {
        setError(true);
        return;
      }

      setAtt(data);
    })();
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <FileX className="h-10 w-10" />
        <p className="text-sm">Document not found or has been deleted.</p>
      </div>
    );
  }

  if (!att) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading document…</p>
      </div>
    );
  }

  const fileName = att.file_name || "document";
  const isImage = att.mime_type?.startsWith("image/");
  const isPdf = att.mime_type === "application/pdf";
  const canPreview = isImage || isPdf;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-lg truncate">{fileName}</h1>
            {att.mime_type && (
              <p className="text-xs text-muted-foreground mt-1">{att.mime_type}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm">
              <a href={att.file_url} download={fileName} rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" /> Download
              </a>
            </Button>
            <Button asChild size="sm">
              <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Open in new tab
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md p-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            If the file doesn't open, your browser's ad-blocker or privacy
            shield (e.g. Brave Shields) may be blocking the storage domain.
            Use the <strong>Download</strong> button or temporarily disable
            shields for this site.
          </p>
        </div>
      </div>

      {canPreview && (
        <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
          {isImage ? (
            <img
              src={att.file_url}
              alt={fileName}
              className="w-full h-auto max-h-[80vh] object-contain mx-auto"
            />
          ) : (
            <iframe
              src={att.file_url}
              title={fileName}
              className="w-full h-[80vh] border-0"
            />
          )}
        </div>
      )}
    </div>
  );
}
