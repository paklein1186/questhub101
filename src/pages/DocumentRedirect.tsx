import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileX } from "lucide-react";

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

  // Hand the attachment off to the universal external-resource page, which
  // performs an immediate top-level navigation. This keeps Brave/uBlock from
  // ever seeing a *.supabase.co URL embedded in our own DOM (which they
  // block as ERR_BLOCKED_BY_CLIENT).
  const fileName = att.file_name || "document";
  const target = `/external-resource?url=${encodeURIComponent(att.file_url)}&label=${encodeURIComponent(fileName)}`;
  return <Navigate to={target} replace />;
}
