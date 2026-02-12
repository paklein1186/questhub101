import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  CalendarSync, RefreshCw, Loader2, CheckCircle, AlertTriangle,
  Unplug, ExternalLink, Calendar,
} from "lucide-react";
import { format } from "date-fns";

const PROVIDERS = [
  {
    id: "google" as const,
    name: "Google Calendar",
    icon: "📅",
    description: "Sync events from your Google Calendar to block availability and push new bookings.",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  {
    id: "outlook" as const,
    name: "Microsoft Outlook",
    icon: "📧",
    description: "Sync events from your Outlook calendar to block availability and push new bookings.",
    color: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
];

interface CalendarConnection {
  id: string;
  provider: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
  sync_error: string | null;
  created_at: string;
}

export function CalendarSyncTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["calendar-connections", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_connections")
        .select("id, provider, sync_enabled, last_synced_at, sync_error, created_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as CalendarConnection[];
    },
    enabled: !!user?.id,
  });

  const { data: busyCount = 0 } = useQuery({
    queryKey: ["calendar-busy-count", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("calendar_busy_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const getConnection = (provider: string) =>
    connections.find((c) => c.provider === provider);

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in first", variant: "destructive" });
        return;
      }

      const redirectUri = `${window.location.origin}/me?tab=calendar`;
      const res = await supabase.functions.invoke("calendar-oauth", {
        body: null,
        headers: {},
      });

      // Use GET with query params for auth-url
      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-oauth?action=auth-url&provider=${provider}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const response = await fetch(funcUrl, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      const data = await response.json();
      if (data.error) {
        toast({ title: "Connection failed", description: data.error, variant: "destructive" });
        return;
      }

      // Redirect to OAuth provider
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-oauth?action=disconnect`;
      await fetch(funcUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider }),
      });

      qc.invalidateQueries({ queryKey: ["calendar-connections"] });
      qc.invalidateQueries({ queryKey: ["calendar-busy-count"] });
      toast({ title: `${provider === "google" ? "Google Calendar" : "Outlook"} disconnected` });
    } catch (err: any) {
      toast({ title: "Error disconnecting", description: err.message, variant: "destructive" });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`;
      const response = await fetch(funcUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "pull" }),
      });

      const data = await response.json();
      qc.invalidateQueries({ queryKey: ["calendar-connections"] });
      qc.invalidateQueries({ queryKey: ["calendar-busy-count"] });
      toast({ title: "Calendar synced", description: `${data.synced || 0} events imported` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleSync = async (connectionId: string, enabled: boolean) => {
    await (supabase as any)
      .from("calendar_connections")
      .update({ sync_enabled: enabled })
      .eq("id", connectionId);
    qc.invalidateQueries({ queryKey: ["calendar-connections"] });
  };

  const hasAnyConnection = connections.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Calendar Sync
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your external calendars to automatically block busy times in your service availability
            and push new bookings to your calendar.
          </p>
        </div>
        {hasAnyConnection && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
            Sync now
          </Button>
        )}
      </div>

      {/* Stats */}
      {hasAnyConnection && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{connections.length} calendar{connections.length > 1 ? "s" : ""} connected</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{busyCount} upcoming event{busyCount !== 1 ? "s" : ""} blocking slots</span>
          </div>
        </div>
      )}

      <Separator />

      {/* Provider cards */}
      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const conn = getConnection(provider.id);
          const isConnected = !!conn;

          return (
            <div
              key={provider.id}
              className="rounded-xl border border-border p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{provider.name}</h3>
                      {isConnected && (
                        <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400 border-0">
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                  </div>
                </div>

                {isConnected ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnect(provider.id)}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Unplug className="h-4 w-4 mr-1" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(provider.id)}
                    disabled={connecting === provider.id}
                    className="shrink-0"
                  >
                    {connecting === provider.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                    )}
                    Connect
                  </Button>
                )}
              </div>

              {/* Connected details */}
              {conn && (
                <div className="pl-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Two-way sync</span>
                    <Switch
                      checked={conn.sync_enabled}
                      onCheckedChange={(v) => handleToggleSync(conn.id, v)}
                    />
                  </div>

                  {conn.last_synced_at && (
                    <p className="text-xs text-muted-foreground">
                      Last synced: {format(new Date(conn.last_synced_at), "MMM d, yyyy 'at' HH:mm")}
                    </p>
                  )}

                  {conn.sync_error && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{conn.sync_error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Separator />

      {/* How it works */}
      <div className="rounded-xl bg-muted/50 p-4 space-y-2">
        <h4 className="text-sm font-medium">How Calendar Sync works</h4>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
          <li><strong>Read:</strong> External busy events are imported and automatically block matching time slots in your service availability.</li>
          <li><strong>Write:</strong> When a booking is confirmed for one of your services, it's automatically pushed to your connected calendar.</li>
          <li>Events are synced for the next 30 days and refreshed each time you sync.</li>
          <li>Your calendar data is securely stored and never shared with other users.</li>
        </ul>
      </div>
    </div>
  );
}
