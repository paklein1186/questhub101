import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarSync, RefreshCw, Loader2, CheckCircle, AlertTriangle,
  Unplug, ExternalLink, Calendar, ChevronDown, ChevronUp,
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

interface SubCalendar {
  id: string;
  name: string;
  isEnabled: boolean;
}

export function CalendarSyncTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  const [loadingSubCals, setLoadingSubCals] = useState<Set<string>>(new Set());
  const [subCalendars, setSubCalendars] = useState<Record<string, SubCalendar[]>>({});
  const [togglingSubCal, setTogglingSubCal] = useState<string | null>(null);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["calendar-connections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_calendar_connections" as any);
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

  const fetchSubCalendars = async (connectionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setLoadingSubCals(prev => new Set(prev).add(connectionId));
    try {
      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`;
      const response = await fetch(funcUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "list-calendars", connectionId }),
      });
      const data = await response.json();
      if (data.calendars) {
        setSubCalendars(prev => ({ ...prev, [connectionId]: data.calendars }));
      }
    } catch (err: any) {
      toast({ title: "Failed to load subcalendars", description: err.message, variant: "destructive" });
    } finally {
      setLoadingSubCals(prev => { const n = new Set(prev); n.delete(connectionId); return n; });
    }
  };

  const toggleExpand = async (connectionId: string) => {
    setExpandedConnections(prev => {
      const next = new Set(prev);
      if (next.has(connectionId)) {
        next.delete(connectionId);
      } else {
        next.add(connectionId);
        // Fetch subcalendars if not loaded yet
        if (!subCalendars[connectionId]) {
          fetchSubCalendars(connectionId);
        }
      }
      return next;
    });
  };

  const handleToggleSubCalendar = async (connectionId: string, calId: string, enabled: boolean) => {
    const key = `${connectionId}::${calId}`;
    setTogglingSubCal(key);
    try {
      // Optimistic update
      setSubCalendars(prev => ({
        ...prev,
        [connectionId]: (prev[connectionId] || []).map(c =>
          c.id === calId ? { ...c, isEnabled: enabled } : c
        ),
      }));

      const currentSub = (subCalendars[connectionId] || []).find((c) => c.id === calId);
      await (supabase as any)
        .from("calendar_subcalendar_preferences")
        .upsert({
          user_id: user!.id,
          connection_id: connectionId,
          source_calendar_id: calId,
          source_calendar_name: currentSub?.name || calId,
          is_enabled: enabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,connection_id,source_calendar_id" });
    } catch (err: any) {
      toast({ title: "Failed to update preference", variant: "destructive" });
      // Revert
      setSubCalendars(prev => ({
        ...prev,
        [connectionId]: (prev[connectionId] || []).map(c =>
          c.id === calId ? { ...c, isEnabled: !enabled } : c
        ),
      }));
    } finally {
      setTogglingSubCal(null);
    }
  };

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in first", variant: "destructive" });
        return;
      }
      const redirectUri = `${window.location.origin}/me?tab=calendar`;
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
      qc.invalidateQueries({ queryKey: ["my-external-calendar-events"] });
      toast({ title: "Calendar synced", description: `${data.synced || 0} events imported (only from enabled subcalendars)` });
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
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="shrink-0">
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
          const isExpanded = conn ? expandedConnections.has(conn.id) : false;
          const isLoadingSubs = conn ? loadingSubCals.has(conn.id) : false;
          const subs = conn ? subCalendars[conn.id] || [] : [];

          return (
            <div key={provider.id} className="rounded-xl border border-border p-4 space-y-3">
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
                  <Button variant="ghost" size="sm" onClick={() => handleDisconnect(provider.id)} className="text-destructive hover:text-destructive shrink-0">
                    <Unplug className="h-4 w-4 mr-1" />
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect(provider.id)} disabled={connecting === provider.id} className="shrink-0">
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
                <div className="pl-10 space-y-3">
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

                  {/* Subcalendar selector */}
                  <button
                    onClick={() => toggleExpand(conn.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    Choose which subcalendars to sync
                  </button>

                  {isExpanded && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      {isLoadingSubs ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-5 w-9 rounded-full" />
                            </div>
                          ))}
                        </div>
                      ) : subs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No subcalendars found.</p>
                      ) : (
                        <>
                          <p className="text-[11px] text-muted-foreground mb-1">
                            Only enabled subcalendars will block your service availability and appear on your Work calendar.
                          </p>
                          {subs.map(sub => {
                            const key = `${conn.id}::${sub.id}`;
                            return (
                              <div key={sub.id} className="flex items-center justify-between py-1">
                                <span className="text-xs truncate max-w-[200px] sm:max-w-none">{sub.name}</span>
                                <Switch
                                  checked={sub.isEnabled}
                                  disabled={togglingSubCal === key}
                                  onCheckedChange={(v) => handleToggleSubCalendar(conn.id, sub.id, v)}
                                />
                              </div>
                            );
                          })}
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Changes take effect on next sync. Click "Sync now" to apply immediately.
                          </p>
                        </>
                      )}
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
          <li><strong>Read:</strong> External busy events from enabled subcalendars are imported and automatically block matching time slots in your service availability.</li>
          <li><strong>Write:</strong> When a booking is confirmed for one of your services, it's automatically pushed to your connected calendar.</li>
          <li>You can choose which subcalendars to sync — only enabled ones will block your availability.</li>
          <li>Events are synced for the next 30 days and refreshed each time you sync.</li>
          <li>Your calendar data is securely stored and never shared with other users.</li>
        </ul>
      </div>
    </div>
  );
}
