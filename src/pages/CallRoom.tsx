import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ArrowLeft, Video, ExternalLink, Clock, Users, FileText,
  ShieldAlert, FileQuestion, AlertTriangle, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useBookingById, usePublicProfile } from "@/hooks/useEntityQueries";
import { useUserRoles } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

// ─── Jitsi Embed (JaaS – 8x8.vc) ────────────────────────────

function normalizeRoomName(raw: string): string {
  const stripped = raw
    .replace(/^https?:\/\/(?:meet\.jit\.si|8x8\.vc)\//i, "")
    .trim();
  const parts = stripped.split("/").filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : (parts[0] ?? "");
}

function normalizeAppId(raw: string): string {
  return raw
    .replace(/^https?:\/\/8x8\.vc\//i, "")
    .replace(/\/+$/, "")
    .trim();
}

function buildRoomPath(appId: string, roomName: string): string {
  const safeAppId = normalizeAppId(appId);
  const safeRoom = normalizeRoomName(roomName);
  return `${safeAppId}/${safeRoom}`;
}

function JitsiEmbed({
  roomName,
  displayName,
  avatarUrl,
  onError,
}: {
  roomName: string;
  displayName: string;
  avatarUrl?: string;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [directUrl, setDirectUrl] = useState(`https://8x8.vc/${roomName}`);

  useEffect(() => {
    if (!containerRef.current || apiRef.current) return;
    let cancelled = false;

    async function init() {
      try {
        // 1. Fetch JaaS JWT from edge function
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) throw new Error("Not authenticated");

        const res = await supabase.functions.invoke("jaas-token", {
          body: { roomName },
        });
        if (res.error || !res.data?.jwt) throw new Error(res.error?.message || "No JWT returned");

        const { jwt, appId } = res.data;
        const roomPath = typeof res.data?.roomPath === "string"
          ? res.data.roomPath
          : buildRoomPath(String(appId || ""), roomName);
        setDirectUrl(`https://8x8.vc/${roomPath}`);
        if (cancelled) return;

        // 2. Load JaaS External API script
        const script = document.createElement("script");
        script.src = "https://8x8.vc/external_api.js";
        script.async = true;
        script.onload = () => {
          if (cancelled) return;
          try {
            const api = new (window as any).JitsiMeetExternalAPI("8x8.vc", {
              roomName: roomPath,
              parentNode: containerRef.current!,
              width: "100%",
              height: "100%",
              jwt,
              configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: false,
                prejoinPageEnabled: false,
                disableDeepLinking: true,
              },
              interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                TOOLBAR_BUTTONS: [
                  "microphone", "camera", "desktop", "chat",
                  "raisehand", "tileview", "fullscreen",
                  "hangup", "settings",
                ],
              },
            });
            apiRef.current = api;
            setLoaded(true);
          } catch {
            setFailed(true);
            onError();
          }
        };
        script.onerror = () => { setFailed(true); onError(); };
        document.head.appendChild(script);
      } catch (e) {
        logger.error("JaaS init error:", e);
        if (!cancelled) { setFailed(true); onError(); }
      }
    }

    init();
    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [roomName, displayName, avatarUrl, onError]);

  const jitsiUrl = directUrl;

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-xl p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-warning mb-4" />
        <h3 className="font-display text-lg font-semibold mb-2">Couldn't load the call</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The video call couldn't be initialized. Try joining directly:
        </p>
        <Button asChild>
          <a href={jitsiUrl} target="_blank" rel="noopener noreferrer">
            <Video className="h-4 w-4 mr-2" /> Open call room <ExternalLink className="h-3.5 w-3.5 ml-1" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden bg-black/5">
      {!loaded && (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground text-sm animate-pulse">Loading call…</p>
        </div>
      )}
    </div>
  );
}

// ─── Session Status ────────────────────────────────────────────

function getSessionStatus(booking: any): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  canJoin: boolean;
  message?: string;
} {
  const now = new Date();
  const start = booking.start_date_time ? new Date(booking.start_date_time) : null;
  const end = booking.end_date_time ? new Date(booking.end_date_time) : null;

  const isConfirmed = booking.status === "CONFIRMED" || booking.status === "ACCEPTED";
  if (!isConfirmed) {
    return { label: "Not active", variant: "destructive", canJoin: false, message: "This session is not confirmed yet." };
  }

  if (start && now < start) {
    const diffMin = Math.round((start.getTime() - now.getTime()) / 60000);
    return {
      label: "Not started",
      variant: "secondary",
      canJoin: true,
      message: diffMin > 60
        ? `Starts in ${Math.round(diffMin / 60)}h ${diffMin % 60}m`
        : `Starts in ${diffMin} minute${diffMin !== 1 ? "s" : ""}`,
    };
  }

  if (end && now > end) {
    return { label: "Finished", variant: "outline", canJoin: true, message: "This session has ended. Notes are still accessible." };
  }

  return { label: "Live now", variant: "default", canJoin: true };
}

// ─── Main Component ────────────────────────────────────────────

export default function CallRoom() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { data: booking, isLoading, error } = useBookingById(bookingId);
  const { isAdmin: userIsAdmin } = useUserRoles(currentUser.id);

  const isRequester = currentUser.id === booking?.requester_id;
  const isProvider = currentUser.id === booking?.provider_user_id;
  const hasAccess = isRequester || isProvider || userIsAdmin;

  // Profiles
  const otherUserId = isProvider ? booking?.requester_id : booking?.provider_user_id;
  const { data: otherProfile } = usePublicProfile(otherUserId ?? undefined);
  const { data: providerProfile } = usePublicProfile(booking?.provider_user_id ?? undefined);
  const { data: requesterProfile } = usePublicProfile(booking?.requester_id ?? undefined);

  // Notes autosave
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (booking?.notes) setNotes(booking.notes);
  }, [booking?.notes]);

  const saveNotes = useCallback(async (text: string) => {
    if (!bookingId) return;
    const { error } = await supabase
      .from("bookings")
      .update({ notes: text, updated_at: new Date().toISOString() })
      .eq("id", bookingId);
    if (!error) setNotesSaved(true);
  }, [bookingId]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNotes(value), 1500);
  };

  // Jitsi room name (stable, derived from booking ID)
  const roomName = useMemo(() => {
    if (!booking) return "";
    if (booking.call_url) {
      const normalized = normalizeRoomName(booking.call_url);
      if (normalized) return normalized;
    }
    return `gamechanger-${booking.id}`;
  }, [booking?.call_url, booking?.id]);

  const [jitsiError, setJitsiError] = useState(false);
  const handleJitsiError = useCallback(() => setJitsiError(true), []);

  // Panel collapsed on mobile
  const [panelOpen, setPanelOpen] = useState(true);

  // ─── Guards ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageShell>
        <p className="text-muted-foreground py-24 text-center">Loading session…</p>
      </PageShell>
    );
  }

  if (!booking || error) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Session not found</h1>
          <p className="text-muted-foreground mb-6">This booking doesn't exist or has been removed.</p>
          <Button variant="outline" asChild>
            <Link to="/work"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Work</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  if (!hasAccess) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Access denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to join this call.</p>
          <Button variant="outline" asChild>
            <Link to="/work"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Work</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const service = booking.services as any;
  const status = getSessionStatus(booking);

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      {/* Breadcrumb bar */}
      <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-2 text-sm">
        <Link to="/me/bookings" className="text-muted-foreground hover:text-foreground transition-colors">
          My bookings
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        {service && (
          <>
            <Link to={`/services/${service.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
              {service.title}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </>
        )}
        <span className="font-medium text-foreground">Call</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={status.variant} className="text-xs">
            {status.label === "Live now" && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />}
            {status.label}
          </Badge>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/bookings/${booking.id}`}><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back</Link>
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {status.message && (
        <div className={`px-4 py-2 text-sm text-center ${
          status.label === "Finished" ? "bg-muted text-muted-foreground" :
          status.label === "Not active" ? "bg-destructive/10 text-destructive" :
          "bg-primary/10 text-primary"
        }`}>
          {status.message}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Jitsi area */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 p-2">
          {status.canJoin ? (
            <JitsiEmbed
              roomName={roomName}
              displayName={currentUser.name || "Participant"}
              avatarUrl={currentUser.avatarUrl}
              onError={handleJitsiError}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-muted/20 rounded-xl p-8 text-center">
              <Video className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="font-display text-xl font-semibold mb-2">Call not available</h2>
              <p className="text-muted-foreground">{status.message}</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className={`w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-border bg-card overflow-y-auto ${panelOpen ? "" : "hidden lg:block"}`}>
          <div className="p-4 space-y-5">

            {/* Session header */}
            <div>
              <h2 className="font-display text-lg font-semibold">
                Session with {otherProfile?.name || "…"}
              </h2>
              {service && (
                <Link to={`/services/${service.id}`} className="text-sm text-primary hover:underline" target="_blank">
                  {service.title} <ExternalLink className="inline h-3 w-3" />
                </Link>
              )}
            </div>

            {/* Date/time */}
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Schedule
              </h3>
              {booking.start_date_time ? (
                <p className="text-sm">
                  {new Date(booking.start_date_time).toLocaleDateString(undefined, {
                    weekday: "long", month: "short", day: "numeric",
                  })}
                  {" · "}
                  {new Date(booking.start_date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {booking.end_date_time && (
                    <> – {new Date(booking.end_date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No time set</p>
              )}
              {service?.duration_minutes && (
                <p className="text-xs text-muted-foreground">{service.duration_minutes} min session</p>
              )}
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Participants
              </h3>

              {/* Provider */}
              <Link to={`/users/${booking.provider_user_id}`} target="_blank" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={providerProfile?.avatar_url ?? undefined} />
                  <AvatarFallback>{providerProfile?.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{providerProfile?.name || "Provider"}</p>
                  <p className="text-xs text-muted-foreground">Host</p>
                </div>
              </Link>

              {/* Requester */}
              <Link to={`/users/${booking.requester_id}`} target="_blank" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={requesterProfile?.avatar_url ?? undefined} />
                  <AvatarFallback>{requesterProfile?.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{requesterProfile?.name || "Guest"}</p>
                  <p className="text-xs text-muted-foreground">Guest</p>
                </div>
              </Link>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Session Notes
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {notesSaved ? "✓ Saved" : "Saving…"}
                </span>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Take notes during the session…"
                className="min-h-[120px] resize-none text-sm"
                maxLength={5000}
              />
            </div>

            {/* Links */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Links</h3>
              <div className="flex flex-col gap-1">
                <Link to={`/bookings/${booking.id}`} className="text-sm text-primary hover:underline">
                  Booking details
                </Link>
                {service && (
                  <a href={`/services/${service.id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    Service page <ExternalLink className="inline h-3 w-3" />
                  </a>
                )}
                {booking.call_url && (
                  <a href={booking.call_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    Direct Jitsi link <ExternalLink className="inline h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
