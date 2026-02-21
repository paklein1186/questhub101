import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, XCircle, CheckCircle, Globe, Key, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type OwnerType = "user" | "guild" | "territory" | "program" | "company";

interface Props {
  ownerType: OwnerType;
  ownerId: string;
}

function generateCode(ownerType: string, ownerId: string): string {
  const short = ownerId.slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 6);
  return `ctg:${ownerType}:${short}:${rand}`;
}

export function SiteCodeManager({ ownerType, ownerId }: Props) {
  const [siteCode, setSiteCode] = useState<{
    id: string;
    code: string;
    revoked: boolean;
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchCode = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_codes" as any)
      .select("*")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId)
      .maybeSingle();
    setSiteCode(data as any);
    setLoading(false);
  }, [ownerType, ownerId]);

  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  const createCode = async () => {
    setActing(true);
    const code = generateCode(ownerType, ownerId);
    const { error } = await supabase.from("site_codes" as any).insert({
      code,
      owner_type: ownerType,
      owner_id: ownerId,
    } as any);
    setActing(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Site code generated!");
      fetchCode();
    }
  };

  const regenerateCode = async () => {
    if (!siteCode) return;
    setActing(true);
    const newCode = generateCode(ownerType, ownerId);
    const { error } = await supabase
      .from("site_codes" as any)
      .update({ code: newCode, revoked: false } as any)
      .eq("id", siteCode.id);
    setActing(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Site code regenerated!");
      fetchCode();
    }
  };

  const revokeCode = async () => {
    if (!siteCode) return;
    setActing(true);
    const { error } = await supabase
      .from("site_codes" as any)
      .update({ revoked: true } as any)
      .eq("id", siteCode.id);
    setActing(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Site code revoked");
      fetchCode();
    }
  };

  const copyCode = () => {
    if (!siteCode) return;
    navigator.clipboard.writeText(siteCode.code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const feedUrl = siteCode && !siteCode.revoked
    ? `https://${projectId}.supabase.co/functions/v1/site-feed?code=${siteCode.code}`
    : null;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-32" />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div>
        <h3 className="font-display font-semibold flex items-center gap-2 text-base">
          <Key className="h-4 w-4 text-primary" /> Site Code
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a code that external websites (like Lovable) can use to fetch your public content feed.
        </p>
      </div>

      {!siteCode ? (
        <Button onClick={createCode} disabled={acting} variant="outline" size="sm">
          <Globe className="h-3.5 w-3.5 mr-1" />
          {acting ? "Generating…" : "Generate Site Code"}
        </Button>
      ) : (
        <div className="space-y-4">
          {/* Code display */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your Site Code</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={siteCode.code}
                className="font-mono text-sm max-w-md"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
                title="Copy code"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {siteCode.revoked ? (
                <Badge variant="destructive" className="text-xs">Revoked</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Active</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Created {new Date(siteCode.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Feed URL preview */}
          {feedUrl && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">Feed Endpoint</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded break-all max-w-lg block">
                  {feedUrl}
                </code>
                <a href={feedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this URL with your website builder (e.g. Lovable) to pull your public content.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={regenerateCode}
              disabled={acting}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              {acting ? "…" : "Regenerate"}
            </Button>
            {!siteCode.revoked && (
              <Button
                variant="destructive"
                size="sm"
                onClick={revokeCode}
                disabled={acting}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Revoke
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
