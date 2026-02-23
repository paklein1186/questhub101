import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Copy, RefreshCw, Loader2, Eye, EyeOff, Rss, Check, Info,
  ShieldAlert, Calendar, Briefcase, Users,
} from "lucide-react";

type FeedType = "PERSONAL_ALL" | "PERSONAL_ONLY_BOOKINGS" | "PERSONAL_ONLY_RITUALS";

interface IcsFeed {
  id: string;
  owner_user_id: string;
  type: FeedType;
  token: string;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const FEED_CONFIGS: { type: FeedType; label: string; description: string; icon: typeof Calendar }[] = [
  {
    type: "PERSONAL_ALL",
    label: "All my CTG events",
    description: "Bookings, rituals, and guild events you attend",
    icon: Calendar,
  },
  {
    type: "PERSONAL_ONLY_BOOKINGS",
    label: "Only my bookings",
    description: "Service bookings where you are provider or client",
    icon: Briefcase,
  },
  {
    type: "PERSONAL_ONLY_RITUALS",
    label: "Only rituals & events",
    description: "Ritual sessions and guild events you attend",
    icon: Users,
  },
];

function buildIcsUrl(feedId: string, token: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ics-feed?feedId=${feedId}&token=${token}`;
}

interface IcsFeedsManagerProps {
  /** Compact mode for use in modals */
  compact?: boolean;
}

export function IcsFeedsManager({ compact = false }: IcsFeedsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [revealedFeeds, setRevealedFeeds] = useState<Set<string>>(new Set());
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null);
  const [regeneratingFeed, setRegeneratingFeed] = useState<string | null>(null);

  // Fetch existing feeds
  const { data: feeds = [], isLoading, refetch } = useQuery({
    queryKey: ["ics-feeds", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ics_feeds")
        .select("*")
        .eq("owner_user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return (data || []) as IcsFeed[];
    },
    enabled: !!user?.id,
  });

  // Auto-create default feeds on first load if none exist
  useEffect(() => {
    if (!user?.id || isLoading || feeds.length > 0) return;
    const createDefaults = async () => {
      const defaults = FEED_CONFIGS.map((c) => ({
        owner_user_id: user.id,
        type: c.type,
        label: c.label,
        is_active: true,
      }));
      await supabase.from("ics_feeds").insert(defaults);
      refetch();
    };
    createDefaults();
  }, [user?.id, isLoading, feeds.length, refetch]);

  const handleCopy = async (feed: IcsFeed) => {
    const url = buildIcsUrl(feed.id, feed.token);
    await navigator.clipboard.writeText(url);
    setCopiedFeed(feed.id);
    toast({ title: "ICS URL copied to clipboard" });
    setTimeout(() => setCopiedFeed(null), 2000);
  };

  const handleRegenerate = async (feed: IcsFeed) => {
    setRegeneratingFeed(feed.id);
    // Generate new token client-side (64 hex chars)
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const newToken = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");

    await supabase
      .from("ics_feeds")
      .update({ token: newToken })
      .eq("id", feed.id);

    setRegeneratingFeed(null);
    setRevealedFeeds((prev) => { const n = new Set(prev); n.delete(feed.id); return n; });
    refetch();
    toast({ title: "URL regenerated", description: "The old URL is now invalid." });
  };

  const handleToggleActive = async (feed: IcsFeed, active: boolean) => {
    await supabase.from("ics_feeds").update({ is_active: active }).eq("id", feed.id);
    refetch();
  };

  const toggleReveal = (feedId: string) => {
    setRevealedFeeds((prev) => {
      const n = new Set(prev);
      if (n.has(feedId)) n.delete(feedId); else n.add(feedId);
      return n;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {!compact && (
        <>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Rss className="h-5 w-5 text-primary" />
              ICS Calendar Feeds
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Subscribe to your changethegame events in Google Calendar, Apple Calendar, Outlook, or any tool that supports ICS feeds. These feeds are read-only and automatically refresh.
            </p>
          </div>
          <Separator />
        </>
      )}

      {compact && (
        <p className="text-xs text-muted-foreground">
          Use these ICS links to subscribe from Google Calendar, Apple Calendar, or Outlook.
        </p>
      )}

      <div className="space-y-3">
        {feeds.map((feed) => {
          const config = FEED_CONFIGS.find((c) => c.type === feed.type);
          const Icon = config?.icon || Calendar;
          const isRevealed = revealedFeeds.has(feed.id);
          const isCopied = copiedFeed === feed.id;
          const isRegenerating = regeneratingFeed === feed.id;

          return (
            <div
              key={feed.id}
              className={`rounded-xl border border-border p-3 ${compact ? "p-2.5" : "p-3"} ${
                !feed.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{feed.label || config?.label}</p>
                    {!compact && (
                      <p className="text-xs text-muted-foreground">{config?.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => handleCopy(feed)}
                    disabled={!feed.is_active}
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {isCopied ? "Copied" : "Copy URL"}
                  </Button>
                  {!compact && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleReveal(feed.id)}
                        title={isRevealed ? "Hide URL" : "Reveal URL"}
                      >
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleRegenerate(feed)}
                        disabled={isRegenerating}
                        title="Regenerate URL (invalidates old one)"
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Switch
                        checked={feed.is_active}
                        onCheckedChange={(v) => handleToggleActive(feed, v)}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Revealed URL */}
              {isRevealed && !compact && (
                <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2">
                  <code className="text-[11px] text-muted-foreground break-all select-all">
                    {buildIcsUrl(feed.id, feed.token)}
                  </code>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help text */}
      {!compact && (
        <>
          <Separator />
          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              How to subscribe
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li><strong>Google Calendar:</strong> Settings → Add calendar → From URL → paste your ICS URL → Add calendar.</li>
              <li><strong>Apple Calendar:</strong> File → New Calendar Subscription → paste your ICS URL.</li>
              <li><strong>Outlook:</strong> Add calendar → Subscribe from web → paste your ICS URL.</li>
              <li><strong>Infomaniak:</strong> Other calendars → Subscribe → paste your ICS URL.</li>
            </ul>
            <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view your exported events. If a link is compromised, click the regenerate button to revoke it and create a new one.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
