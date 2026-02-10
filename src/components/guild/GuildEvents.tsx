import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, CalendarDays, MapPin, Video, Users, ExternalLink, X, Clock } from "lucide-react";
import { format, isPast } from "date-fns";

interface GuildEventsProps {
  guildId: string;
  isMember: boolean;
  isAdmin: boolean;
}

export function GuildEvents({ guildId, isMember, isAdmin }: GuildEventsProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [locationType, setLocationType] = useState("ONLINE");
  const [locationText, setLocationText] = useState("");
  const [callUrl, setCallUrl] = useState("");
  const [visibility, setVisibility] = useState("GUILD_MEMBERS");
  const [maxAttendees, setMaxAttendees] = useState("");

  const [viewingEvent, setViewingEvent] = useState<any>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["guild-events", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_events" as any)
        .select("*")
        .eq("guild_id", guildId)
        .order("start_at", { ascending: true });
      if (error) throw error;
      // Fetch attendee counts
      const eventIds = (data || []).map((e: any) => e.id);
      let attendeeCounts: Record<string, number> = {};
      if (eventIds.length > 0) {
        const { data: attendees } = await supabase
          .from("guild_event_attendees" as any)
          .select("event_id, status")
          .in("event_id", eventIds)
          .eq("status", "REGISTERED");
        for (const a of (attendees || []) as any[]) {
          attendeeCounts[a.event_id] = (attendeeCounts[a.event_id] || 0) + 1;
        }
      }
      return (data || []).map((e: any) => ({ ...e, attendeeCount: attendeeCounts[e.id] || 0 }));
    },
  });

  // Fetch user's registrations
  const { data: myRegistrations = [] } = useQuery({
    queryKey: ["my-event-registrations", guildId, currentUser.id],
    queryFn: async () => {
      const eventIds = events.map((e: any) => e.id);
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("guild_event_attendees" as any)
        .select("*")
        .eq("user_id", currentUser.id)
        .in("event_id", eventIds);
      if (error) throw error;
      return data || [];
    },
    enabled: events.length > 0 && !!currentUser.id,
  });

  const myRegMap = new Map((myRegistrations as any[]).map(r => [r.event_id, r]));

  const createEvent = async () => {
    if (!title.trim() || !startAt) return;
    const { error } = await supabase.from("guild_events" as any).insert({
      guild_id: guildId,
      title: title.trim(),
      description: description.trim() || null,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      location_type: locationType,
      location_text: locationText.trim() || null,
      call_url: callUrl.trim() || null,
      created_by_user_id: currentUser.id,
      visibility,
      max_attendees: maxAttendees ? Number(maxAttendees) : null,
    } as any);
    if (error) { toast({ title: "Failed to create event", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["guild-events", guildId] });
    setTitle(""); setDescription(""); setStartAt(""); setEndAt("");
    setLocationType("ONLINE"); setLocationText(""); setCallUrl("");
    setVisibility("GUILD_MEMBERS"); setMaxAttendees("");
    setCreateOpen(false);
    toast({ title: "Event created!" });
  };

  const registerForEvent = async (eventId: string) => {
    const event = events.find((e: any) => e.id === eventId);
    const isFull = event?.max_attendees && event.attendeeCount >= event.max_attendees;
    const { error } = await supabase.from("guild_event_attendees" as any).insert({
      event_id: eventId,
      user_id: currentUser.id,
      status: isFull ? "WAITLIST" : "REGISTERED",
    } as any);
    if (error) { toast({ title: "Failed to register", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["guild-events", guildId] });
    qc.invalidateQueries({ queryKey: ["my-event-registrations", guildId, currentUser.id] });
    toast({ title: isFull ? "Added to waitlist" : "Registered!" });
  };

  const cancelRegistration = async (eventId: string) => {
    const reg = myRegMap.get(eventId);
    if (!reg) return;
    await supabase.from("guild_event_attendees" as any).delete().eq("id", (reg as any).id);
    qc.invalidateQueries({ queryKey: ["guild-events", guildId] });
    qc.invalidateQueries({ queryKey: ["my-event-registrations", guildId, currentUser.id] });
    toast({ title: "Registration cancelled" });
  };

  const cancelEvent = async (eventId: string) => {
    await supabase.from("guild_events" as any).update({ is_cancelled: true } as any).eq("id", eventId);
    qc.invalidateQueries({ queryKey: ["guild-events", guildId] });
    toast({ title: "Event cancelled" });
  };

  const upcomingEvents = events.filter((e: any) => !isPast(new Date(e.start_at)) && !e.is_cancelled);
  const pastEvents = events.filter((e: any) => isPast(new Date(e.start_at)) || e.is_cancelled);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading events…</p>;

  const locationIcon = (type: string) => {
    if (type === "ONLINE") return <Video className="h-3.5 w-3.5" />;
    if (type === "OFFLINE") return <MapPin className="h-3.5 w-3.5" />;
    return <><Video className="h-3 w-3" /><MapPin className="h-3 w-3" /></>;
  };

  const renderEventCard = (event: any) => {
    const myReg = myRegMap.get(event.id);
    const isRegistered = myReg && (myReg as any).status !== "CANCELLED";
    const eventPast = isPast(new Date(event.start_at));

    return (
      <div key={event.id} className={`rounded-lg border border-border bg-card p-4 transition-all ${event.is_cancelled ? "opacity-60" : "hover:border-primary/30"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-display font-semibold text-sm truncate">{event.title}</h4>
              {event.is_cancelled && <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {format(new Date(event.start_at), "MMM d, yyyy · HH:mm")}
              </span>
              <span className="flex items-center gap-1">
                {locationIcon(event.location_type)}
                {event.location_type}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.attendeeCount}{event.max_attendees ? `/${event.max_attendees}` : ""}
              </span>
            </div>
            {event.description && <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>}
            {event.location_text && <p className="text-xs text-muted-foreground mt-1">📍 {event.location_text}</p>}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {!event.is_cancelled && !eventPast && (
              <>
                {isRegistered ? (
                  <>
                    {event.call_url && (
                      <Button size="sm" variant="default" asChild>
                        <a href={event.call_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Join
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => cancelRegistration(event.id)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => registerForEvent(event.id)}>Register</Button>
                )}
              </>
            )}
            {(isAdmin || event.created_by_user_id === currentUser.id) && !event.is_cancelled && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelEvent(event.id)}>Cancel Event</Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">Events</h3>
        {isMember && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Event
          </Button>
        )}
      </div>

      {upcomingEvents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Upcoming</h4>
          {upcomingEvents.map(renderEventCard)}
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Past</h4>
          {pastEvents.map(renderEventCard)}
        </div>
      )}

      {events.length === 0 && <p className="text-muted-foreground text-sm">No events yet.</p>}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Start</label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End</label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Location Type</label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(locationType === "ONLINE" || locationType === "HYBRID") && (
              <div>
                <label className="text-sm font-medium mb-1 block">Call URL</label>
                <Input value={callUrl} onChange={(e) => setCallUrl(e.target.value)} placeholder="https://meet.jit.si/..." />
              </div>
            )}
            {(locationType === "OFFLINE" || locationType === "HYBRID") && (
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Address or place name" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Visibility</label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GUILD_MEMBERS">Guild Members Only</SelectItem>
                  <SelectItem value="PUBLIC_LINK">Public (anyone with link)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Max Attendees (optional)</label>
              <Input type="number" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} placeholder="Unlimited" min={1} />
            </div>
            <Button onClick={createEvent} disabled={!title.trim() || !startAt} className="w-full">Create Event</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
