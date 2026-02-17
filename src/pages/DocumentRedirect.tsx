import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileX } from "lucide-react";

/**
 * Public route that resolves an attachment ID to its storage URL
 * and redirects the browser there. This lets document links use
 * the branded changethegame.xyz domain instead of raw storage URLs.
 */
export default function DocumentRedirect() {
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setError(true); return; }

    (async () => {
      const { data, error: fetchErr } = await supabase
        .from("attachments")
        .select("file_url")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !data?.file_url) {
        setError(true);
        return;
      }

      window.location.replace(data.file_url);
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

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
