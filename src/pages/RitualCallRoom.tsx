import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ArrowLeft, Video, ExternalLink, Clock, Users, FileText,
  ShieldAlert, FileQuestion, AlertTriangle, ChevronRight,
  Calendar, ThumbsUp, ThumbsDown, CalendarPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { RITUAL_SESSION_TYPES, type RitualSessionTypeKey } from "@/lib/ritualConfig";

// ─── Jitsi Embed (reused pattern from CallRoom) ──────────────

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

  useEffect(() => {
    if (!containerRef.current || apiRef.current) return;

    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => {
      try {
        const api = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
          roomName,
          parentNode: containerRef.current!,
          width: "100%",
          height: "100%",
          userInfo: { displayName, avatarURL: avatarUrl },
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
    script.onerror = () => {
      setFailed(true);
      onError();
    };
    document.head.appendChild(script);

    return () => {
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [roomName, displayName, avatarUrl, onError]);

  const jitsiUrl = `https://meet.jit.si/${roomName}`;

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-xl p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-warning mb-4" />
        <h3 className="font-display text-lg font-semibold mb-2">Couldn't load the call</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You can still join the Jitsi room directly:
        </p>
        <Button asChild>
          <a href={jitsiUrl} target="_blank" rel="noopener noreferrer">
            <Video className="h-4 w-4 mr-2" /> Open Jitsi room <ExternalLink className="h-3.5 w-3.5 ml-1" />
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

// ─── ICS helper ────────────────────────────────────────────────

function downloadRitualIcs(title: string, scheduledAt: string, durationMinutes: number, visioLink?: string) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const toIcsDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const content = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Changethegame//Ritual//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:ritual-${Date.now()}@${window.location.hostname}`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(start.toISOString())}`,
    `DTEND:${toIcsDate(end.toISOString())}`,
    `SUMMARY:${esc(title)}`,
    visioLink ? `LOCATION:${esc(visioLink)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ritual-${Date.now()}.ics`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main Component ────────────────────────────────────────────

export default function RitualCallRoom() {
  const { occurrenceId } = useParams<{ occurrenceId: string }>();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [jitsiError, setJitsiError] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch occurrence + ritual
  const { data: occurrence, isLoading, error } = useQuery({
    queryKey: ["ritual-occurrence", occurrenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ritual_occurrences")
        .select("*, rituals(*)")
        .eq("id", occurrenceId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!occurrenceId,
  });

  const ritual = (occurrence as any)?.rituals;
  const config = ritual ? RITUAL_SESSION_TYPES[ritual.session_type as RitualSessionTypeKey] : null;

  // Fetch attendees
  const { data: attendees = [] } = useQuery({
    queryKey: ["ritual-call-attendees", occurrenceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ritual_attendees")
        .select("id, user_id, role, status")
        .eq("occurrence_id", occurrenceId!);
      return data || [];
    },
    enabled: !!occurrenceId,
    refetchInterval: 15000, // refresh every 15s
  });

  const attendeeIds = attendees.map((a: any) => a.user_id);
  const { data: profiles = [] } = useQuery({
    queryKey: ["ritual-call-profiles", attendeeIds.sort().join(",")],
    queryFn: async () => {
      if (!attendeeIds.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", attendeeIds);
      return data || [];
    },
    enabled: attendeeIds.length > 0,
  });

  const profileMap = Object.fromEntries(profiles.map((p: any) => [p.user_id, p]));
  const attending = attendees.filter((a: any) => a.status !== "declined");
  const myRsvp = attendees.find((a: any) => a.user_id === currentUser.id);

  // Notes autosave
  useEffect(() => {
    if (occurrence?.notes) setNotes(occurrence.notes);
  }, [occurrence?.notes]);

  const saveNotes = useCallback(async (text: string) => {
    if (!occurrenceId) return;
    const { error } = await supabase
      .from("ritual_occurrences")
      .update({ notes: text })
      .eq("id", occurrenceId);
    if (!error) setNotesSaved(true);
  }, [occurrenceId]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNotes(value), 1500);
  };

  // RSVP
  const handleRsvp = async (status: "attending" | "declined") => {
    if (myRsvp) {
      await supabase.from("ritual_attendees")
        .update({ status } as any)
        .eq("id", myRsvp.id);
    } else {
      await supabase.from("ritual_attendees").insert({
        occurrence_id: occurrenceId,
        user_id: currentUser.id,
        role: "participant",
        status,
      } as any);
    }
    qc.invalidateQueries({ queryKey: ["ritual-call-attendees", occurrenceId] });
    toast({ title: status === "attending" ? "You're attending!" : "Declined" });
  };

  // Jitsi room name
  const roomName = useMemo(() => {
    if (!occurrence) return "";
    if (occurrence.visio_link) {
      const match = occurrence.visio_link.match(/meet\.jit\.si\/(.+)/);
      if (match) return match[1];
    }
    return `ctg-ritual-${occurrenceId}`;
  }, [occurrence, occurrenceId]);

  // Back link
  const backUrl = ritual?.guild_id
    ? `/guilds/${ritual.guild_id}?tab=rituals`
    : ritual?.quest_id
      ? `/quests/${ritual.quest_id}?tab=rituals`
      : "/work";

  // ─── Guards ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageShell>
        <p className="text-muted-foreground py-24 text-center">Loading ritual call…</p>
      </PageShell>
    );
  }

  if (!occurrence || error) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Ritual not found</h1>
          <p className="text-muted-foreground mb-6">This ritual occurrence doesn't exist or has been removed.</p>
          <Button variant="outline" asChild>
            <Link to="/work"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      {/* Breadcrumb bar */}
      <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-2 text-sm">
        <Link to={backUrl} className="text-muted-foreground hover:text-foreground transition-colors">
          {ritual?.guild_id ? "Guild" : ritual?.quest_id ? "Quest" : "Work"}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Rituals</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">{ritual?.title || "Call"}</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
            {occurrence.status === "scheduled" ? "Scheduled" : occurrence.status}
          </Badge>
          <Button variant="ghost" size="sm" asChild>
            <Link to={backUrl}><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back</Link>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Jitsi area */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 p-2">
          <JitsiEmbed
            roomName={roomName}
            displayName={currentUser.name || "Participant"}
            avatarUrl={currentUser.avatarUrl}
            onError={() => setJitsiError(true)}
          />
        </div>

        {/* Side panel */}
        <div className={`w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-border bg-card overflow-y-auto ${panelOpen ? "" : "hidden lg:block"}`}>
          <div className="p-4 space-y-5">

            {/* Session header */}
            <div>
              <h2 className="font-display text-lg font-semibold">{ritual?.title || "Ritual"}</h2>
              {config && (
                <p className="text-sm text-muted-foreground">{config.label} — {config.subtitle}</p>
              )}
            </div>

            {/* Date/time */}
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Schedule
              </h3>
              <p className="text-sm">
                {format(new Date(occurrence.scheduled_at), "EEEE, MMMM d · HH:mm")}
              </p>
              {ritual?.duration_minutes && (
                <p className="text-xs text-muted-foreground">{ritual.duration_minutes} min session</p>
              )}
            </div>

            {/* Calendar export */}
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => downloadRitualIcs(
                ritual?.title || "Ritual",
                occurrence.scheduled_at,
                ritual?.duration_minutes || 60,
                occurrence.visio_link,
              )}
            >
              <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Add to Calendar
            </Button>

            {/* RSVP */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Your RSVP</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={myRsvp?.status === "attending" ? "default" : "outline"}
                  className="flex-1 text-xs"
                  onClick={() => handleRsvp("attending")}
                >
                  <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                  {myRsvp?.status === "attending" ? "Attending" : "Attend"}
                </Button>
                <Button
                  size="sm"
                  variant={myRsvp?.status === "declined" ? "destructive" : "outline"}
                  className="flex-1 text-xs"
                  onClick={() => handleRsvp("declined")}
                >
                  <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                  {myRsvp?.status === "declined" ? "Declined" : "Decline"}
                </Button>
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Participants ({attending.length})
              </h3>
              <div className="space-y-1">
                {attending.map((a: any) => {
                  const profile = profileMap[a.user_id];
                  return (
                    <Link key={a.id} to={`/users/${a.user_id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {(profile?.name || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{profile?.name || "Member"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.role}</p>
                      </div>
                    </Link>
                  );
                })}
                {attending.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">No participants yet.</p>
                )}
              </div>
            </div>

            {/* Program */}
            {ritual?.program_segments && Array.isArray(ritual.program_segments) && (ritual.program_segments as any[]).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Program
                </h3>
                <div className="space-y-1">
                  {(ritual.program_segments as any[]).map((seg: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                      <span className="text-foreground/80">{seg.title}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{seg.minutes}′</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
          </div>
        </div>
      </div>
    </div>
  );
}
