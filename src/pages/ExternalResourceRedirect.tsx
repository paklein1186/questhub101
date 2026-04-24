import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink, ShieldAlert, Link as LinkIcon, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";

function isValidHttpUrl(value: string | null): value is string {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ExternalResourceRedirect() {
  const [searchParams] = useSearchParams();
  const rawUrl = searchParams.get("url");
  const label = searchParams.get("label") || "External resource";

  const resourceUrl = useMemo(() => {
    if (!isValidHttpUrl(rawUrl)) return null;
    return rawUrl;
  }, [rawUrl]);

  if (!resourceUrl) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileX className="h-10 w-10" />
        <p className="text-sm">This external resource link is invalid.</p>
      </div>
    );
  }

  let hostname = resourceUrl;
  try {
    hostname = new URL(resourceUrl).hostname.replace("www.", "");
  } catch {
    hostname = resourceUrl;
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-4 px-4 py-8">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              <h1 className="truncate font-display text-lg font-semibold">{label}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{hostname}</p>
          </div>

          <Button asChild size="sm" className="shrink-0">
            <a href={resourceUrl} target="_top" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open resource
            </a>
          </Button>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Some providers like Google Drive can block direct opening from inside the preview.
            Use <strong>Open resource</strong> to launch it from the top page.
          </p>
        </div>
      </div>
    </div>
  );
}