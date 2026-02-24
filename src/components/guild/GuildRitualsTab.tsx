import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Plus, Calendar, Clock, Users, Video, Archive, CheckCircle,
  Coffee, Heart, Landmark, Brain, GraduationCap, Zap, Scale,
  Telescope, Network, PartyPopper, Play, XCircle, CalendarPlus,
  ThumbsUp, ThumbsDown, UserCheck, Share2, Check, Copy,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { RITUAL_SESSION_TYPES, RITUAL_FREQUENCIES, RITUAL_ACCESS_TYPES, GOVERNANCE_IMPACT_COLORS, type RitualSessionTypeKey } from "@/lib/ritualConfig";
import { CreateRitualDialog } from "./CreateRitualDialog";

const SESSION_ICONS: Record<string, any> = {
  Coffee, Heart, Landmark, Brain, GraduationCap, Zap, Scale, Telescope, Network, PartyPopper,
};

function getSessionIcon(sessionType: string) {
  const config = RITUAL_SESSION_TYPES[sessionType as RitualSessionTypeKey];
  if (!config) return Calendar;
  return SESSION_ICONS[config.icon] || Calendar;
}

function generateRitualIcs(title: string, scheduledAt: string, durationMinutes: number, visioLink?: string): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const toIcsDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return [
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
}

function downloadRitualIcs(title: string, scheduledAt: string, durationMinutes: number, visioLink?: string) {
  const content = generateRitualIcs(title, scheduledAt, durationMinutes, visioLink);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ritual-${Date.now()}.ics`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getJitsiUrl(occurrenceId: string, visioLink?: string): string {
  if (visioLink) {
    if (visioLink.startsWith("http")) return visioLink;
    return `https://meet.jit.si/${visioLink}`;
  }
  return `https://meet.jit.si/ctg-ritual-${occurrenceId}`;
}

function ShareCallButton({ occurrenceId, visioLink, ritualTitle }: { occurrenceId: string; visioLink?: string; ritualTitle?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const jitsiUrl = getJitsiUrl(occurrenceId, visioLink);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jitsiUrl);
      setCopied(true);
      toast({ title: "Call link copied!", description: "Anyone with this link can join the call — no account needed." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <Share2 className="h-3.5 w-3.5 mr-1" /> Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Share call link</p>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can join the call — no account needed.
            </p>
          </div>
          <div className="flex gap-2">
            <Input value={jitsiUrl} readOnly className="text-xs h-9" onClick={(e) => (e.target as HTMLInputElement).select()} />
            <Button size="sm" variant="secondary" className="shrink-0 h-9" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  guildId?: string;
  questId?: string;
  isAdmin: boolean;
  isMember: boolean;
}

export function GuildRitualsTab({ guildId, questId, isAdmin, isMember }: Props) {
  const entityId = guildId || questId || "";
  const entityType = questId ? "quest" : "guild";
  const entityFilterCol = questId ? "quest_id" : "guild_id";
  const { toast } = useToast();
  const qc = useQueryClient();
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [subTab, setSubTab] = useState<"upcoming" | "archive">("upcoming");
  const [scheduleRitualId, setScheduleRitualId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("18:00");

  const { data: rituals = [], isLoading } = useQuery({
    queryKey: ["rituals", entityId],
    queryFn: async () => {
      const filterCol = questId ? "quest_id" : "guild_id";
      const filterVal = questId || guildId;
      const { data, error } = await (supabase
        .from("rituals")
        .select("*")
        .eq("is_active", true)
        .order("next_occurrence", { ascending: true }) as any)
        .eq(filterCol, filterVal);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: occurrences = [] } = useQuery({
    queryKey: ["ritual-occurrences", entityId],
    queryFn: async () => {
      const ritualIds = rituals.map((r: any) => r.id);
      if (!ritualIds.length) return [];
      const { data, error } = await supabase
        .from("ritual_occurrences")
        .select("*, ritual_attendees(id, user_id, role, xp_granted, status)")
        .in("ritual_id", ritualIds)
        .order("scheduled_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: rituals.length > 0,
  });

  // Fetch profiles for attendees
  const allAttendeeIds = [...new Set(occurrences.flatMap((o: any) => (o.ritual_attendees || []).map((a: any) => a.user_id)))];
  const { data: attendeeProfiles = [] } = useQuery({
    queryKey: ["ritual-attendee-profiles", allAttendeeIds.sort().join(",")],
    queryFn: async () => {
      if (!allAttendeeIds.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", allAttendeeIds);
      return data || [];
    },
    enabled: allAttendeeIds.length > 0,
  });

  const profileMap = Object.fromEntries(attendeeProfiles.map((p: any) => [p.user_id, p]));

  const upcomingOccurrences = occurrences.filter((o: any) =>
    o.status === "scheduled" || o.status === "in_progress"
  );
  const pastOccurrences = occurrences.filter((o: any) =>
    o.status === "completed" || o.status === "cancelled"
  );

  const handleRsvp = async (occurrenceId: string, rsvpStatus: "attending" | "declined") => {
    // Try upsert: check if already registered
    const { data: existing } = await supabase
      .from("ritual_attendees")
      .select("id")
      .eq("occurrence_id", occurrenceId)
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("ritual_attendees")
        .update({ status: rsvpStatus } as any)
        .eq("id", existing.id);
    } else {
      const { error } = await supabase.from("ritual_attendees").insert({
        occurrence_id: occurrenceId,
        user_id: currentUser.id,
        role: "participant",
        status: rsvpStatus,
      } as any);
      if (error && error.code !== "23505") {
        toast({ title: "Failed to respond", variant: "destructive" });
        return;
      }
    }
    qc.invalidateQueries({ queryKey: ["ritual-occurrences", entityId] });
    toast({ title: rsvpStatus === "attending" ? "You're attending!" : "Declined" });
  };

  const handleCreateOccurrence = async (ritualId: string) => {
    if (!scheduleDate || !scheduleTime) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    const ritual = rituals.find((r: any) => r.id === ritualId);
    const visioLink = (ritual as any)?.default_visio_link ||
      `https://meet.jit.si/ctg-ritual-${ritualId.slice(0, 8)}-${Date.now()}`;

    const { error } = await supabase.from("ritual_occurrences").insert({
      ritual_id: ritualId,
      scheduled_at: scheduledAt,
      visio_link: visioLink,
      status: "scheduled",
    });
    if (error) {
      toast({ title: "Failed to schedule", variant: "destructive" });
      return;
    }
    setScheduleRitualId(null);
    setScheduleDate(""); setScheduleTime("18:00");
    qc.invalidateQueries({ queryKey: ["ritual-occurrences", entityId] });
    toast({ title: "Ritual occurrence scheduled" });
  };

  const handleCompleteOccurrence = async (occurrenceId: string) => {
    await supabase.from("ritual_occurrences")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", occurrenceId);
    qc.invalidateQueries({ queryKey: ["ritual-occurrences", entityId] });
    toast({ title: "Ritual marked as completed" });
  };

  if (isLoading) return <p className="text-muted-foreground p-4">Loading rituals…</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Rituals
          </h3>
          <p className="text-sm text-muted-foreground">
            Periodic collective synchronization — governance, culture, and coordination cadence.
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Ritual
          </Button>
        )}
      </div>

      {/* Active Ritual Definitions */}
      {rituals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {rituals.map((ritual: any) => {
            const config = RITUAL_SESSION_TYPES[ritual.session_type as RitualSessionTypeKey];
            const Icon = getSessionIcon(ritual.session_type);
            const impactClass = GOVERNANCE_IMPACT_COLORS[config?.governanceImpact || "low"] || "";
            return (
              <Card key={ritual.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{ritual.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {config?.label || ritual.session_type}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${impactClass}`}>
                      {config?.governanceImpact || "—"} impact
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ritual.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{ritual.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> {ritual.duration_minutes} min
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" /> {RITUAL_FREQUENCIES[ritual.frequency as keyof typeof RITUAL_FREQUENCIES]?.label || ritual.frequency}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" /> {RITUAL_ACCESS_TYPES[ritual.access_type as keyof typeof RITUAL_ACCESS_TYPES]?.label || ritual.access_type}
                    </Badge>
                    {ritual.xp_reward > 0 && (
                      <Badge variant="outline" className="gap-1 text-primary">
                        +{ritual.xp_reward} XP
                      </Badge>
                    )}
                  </div>
                  {/* Program segments preview */}
                  {ritual.program_segments && Array.isArray(ritual.program_segments) && (ritual.program_segments as any[]).length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Program</p>
                      <div className="space-y-0.5">
                        {(ritual.program_segments as any[]).slice(0, 4).map((seg: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground/80">{seg.title}</span>
                            <span className="text-muted-foreground">{seg.minutes}′</span>
                          </div>
                        ))}
                        {(ritual.program_segments as any[]).length > 4 && (
                          <p className="text-[10px] text-muted-foreground">+{(ritual.program_segments as any[]).length - 4} more segments</p>
                        )}
                      </div>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="pt-2 border-t border-border">
                      {scheduleRitualId === ritual.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Date</Label>
                              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-8 text-xs" />
                            </div>
                            <div>
                              <Label className="text-xs">Time</Label>
                              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="h-8 text-xs" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 text-xs" onClick={() => handleCreateOccurrence(ritual.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Confirm
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setScheduleRitualId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => setScheduleRitualId(ritual.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Schedule Next Occurrence
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {rituals.length === 0 && !isAdmin && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No rituals have been set up for this guild yet.</p>
        </div>
      )}

      {rituals.length === 0 && isAdmin && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">Create your first ritual to establish a collective cadence.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Ritual
          </Button>
        </div>
      )}

      {/* Occurrences */}
      {occurrences.length > 0 && (
        <div>
          <Tabs value={subTab} onValueChange={(v) => setSubTab(v as any)}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcomingOccurrences.length})</TabsTrigger>
              <TabsTrigger value="archive"><Archive className="h-3.5 w-3.5 mr-1" /> Archive ({pastOccurrences.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcomingOccurrences.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming rituals scheduled.</p>
              )}
              {upcomingOccurrences.map((occ: any) => {
                const ritual = rituals.find((r: any) => r.id === occ.ritual_id);
                const Icon = getSessionIcon(ritual?.session_type || "");
                const attendees = (occ.ritual_attendees || []) as any[];
                const attending = attendees.filter((a) => a.status !== "declined");
                const declined = attendees.filter((a) => a.status === "declined");
                const myRsvp = attendees.find((a: any) => a.user_id === currentUser.id);
                const myStatus = myRsvp?.status;
                return (
                  <Card key={occ.id}>
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{ritual?.title || "Ritual"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(occ.scheduled_at), "EEEE, MMMM d · HH:mm")}
                            {" · "}
                            {formatDistanceToNow(new Date(occ.scheduled_at), { addSuffix: true })}
                          </p>
                          {ritual?.duration_minutes && (
                            <p className="text-xs text-muted-foreground">
                              Duration: {ritual.duration_minutes} min
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Calendar export */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => downloadRitualIcs(
                                  ritual?.title || "Ritual",
                                  occ.scheduled_at,
                                  ritual?.duration_minutes || 60,
                                  occ.visio_link
                                )}
                              >
                                <CalendarPlus className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add to calendar (.ics)</TooltipContent>
                          </Tooltip>

                          {/* Join call (internal) */}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/ritual-call/${occ.id}`)}>
                            <Video className="h-3.5 w-3.5 mr-1" /> Join Call
                          </Button>

                          {/* Share call link for non-members */}
                          <ShareCallButton occurrenceId={occ.id} visioLink={occ.visio_link} ritualTitle={ritual?.title} />

                          {/* Admin complete */}
                          {isAdmin && occ.status === "scheduled" && (
                            <Button size="sm" variant="outline" onClick={() => handleCompleteOccurrence(occ.id)}>
                              <Play className="h-3.5 w-3.5 mr-1" /> Complete
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* RSVP buttons */}
                      {isMember && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant={myStatus === "attending" ? "default" : "outline"}
                            className="text-xs"
                            onClick={() => handleRsvp(occ.id, "attending")}
                          >
                            <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                            {myStatus === "attending" ? "Attending" : "Attend"}
                          </Button>
                          <Button
                            size="sm"
                            variant={myStatus === "declined" ? "destructive" : "outline"}
                            className="text-xs"
                            onClick={() => handleRsvp(occ.id, "declined")}
                          >
                            <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                            {myStatus === "declined" ? "Declined" : "Decline"}
                          </Button>
                        </div>
                      )}

                      {/* Participants */}
                      {attendees.length > 0 && (
                        <div className="border-t border-border pt-2 space-y-2">
                          {/* Attending */}
                          {attending.length > 0 && (
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-xs text-muted-foreground shrink-0">{attending.length} attending</span>
                              <div className="flex -space-x-1.5">
                                {attending.slice(0, 8).map((a: any) => {
                                  const profile = profileMap[a.user_id];
                                  return (
                                    <Tooltip key={a.id}>
                                      <TooltipTrigger asChild>
                                        <Avatar className="h-6 w-6 border-2 border-background">
                                          <AvatarImage src={profile?.avatar_url} />
                                          <AvatarFallback className="text-[9px]">
                                            {(profile?.name || "?").charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                      </TooltipTrigger>
                                      <TooltipContent>{profile?.name || "Member"}</TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                                {attending.length > 8 && (
                                  <span className="text-[10px] text-muted-foreground ml-1.5">+{attending.length - 8}</span>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Declined */}
                          {declined.length > 0 && (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground">{declined.length} declined</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="archive" className="mt-4 space-y-3">
              {pastOccurrences.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No completed rituals yet.</p>
              )}
              {pastOccurrences.map((occ: any) => {
                const ritual = rituals.find((r: any) => r.id === occ.ritual_id);
                const Icon = getSessionIcon(ritual?.session_type || "");
                const attendees = (occ.ritual_attendees || []).filter((a: any) => a.status !== "declined");
                return (
                  <Card key={occ.id} className="opacity-80">
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="p-2 rounded-lg bg-muted shrink-0">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{ritual?.title || "Ritual"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(occ.scheduled_at), "MMMM d, yyyy · HH:mm")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" /> {attendees.length} attended
                        </div>
                        <Badge variant={occ.status === "completed" ? "default" : "destructive"} className="text-xs">
                          {occ.status}
                        </Badge>
                      </div>
                      {/* Attendee avatars */}
                      {attendees.length > 0 && (
                        <div className="flex -space-x-1.5 pt-1">
                          {attendees.slice(0, 10).map((a: any) => {
                            const profile = profileMap[a.user_id];
                            return (
                              <Tooltip key={a.id}>
                                <TooltipTrigger asChild>
                                  <Avatar className="h-5 w-5 border border-background">
                                    <AvatarImage src={profile?.avatar_url} />
                                    <AvatarFallback className="text-[8px]">
                                      {(profile?.name || "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>{profile?.name || "Member"}</TooltipContent>
                              </Tooltip>
                            );
                          })}
                          {attendees.length > 10 && (
                            <span className="text-[10px] text-muted-foreground ml-1.5">+{attendees.length - 10}</span>
                          )}
                        </div>
                      )}
                      {occ.notes && (
                        <p className="text-xs text-muted-foreground border-t border-border pt-2 line-clamp-2">{occ.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      )}

      <CreateRitualDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        guildId={guildId}
        questId={questId}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["rituals", entityId] });
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
