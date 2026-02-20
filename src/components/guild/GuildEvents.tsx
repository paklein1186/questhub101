import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, CalendarDays, MapPin, Video, Users, ExternalLink, X, Euro, Repeat, Coffee } from "lucide-react";
import { format, isPast } from "date-fns";
import { RITUAL_SESSION_TYPES, type RitualSessionTypeKey } from "@/lib/ritualConfig";

interface GuildEventsProps {
  guildId: string;
  isMember: boolean;
  isAdmin: boolean;
}

interface UnifiedItem {
  id: string;
  kind: "event" | "ritual";
  title: string;
  description?: string | null;
  startAt: string;
  locationType?: string;
  callUrl?: string | null;
  locationText?: string | null;
  isCancelled?: boolean;
  isPaid?: boolean;
  pricePerTicket?: number;
  currency?: string;
  maxAttendees?: number | null;
  attendeeCount: number;
  createdByUserId?: string;
  acceptanceMode?: string;
  // event-specific
  eventData?: any;
  // ritual-specific
  ritualLabel?: string;
  ritualSessionType?: string;
  ritualId?: string;
  visioLink?: string | null;
  occurrenceId?: string;
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
  const [isPaid, setIsPaid] = useState(false);
  const [pricePerTicket, setPricePerTicket] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [acceptanceMode, setAcceptanceMode] = useState("AUTO");

  // ── Fetch guild events ──
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["guild-events", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_events" as any)
        .select("*")
        .eq("guild_id", guildId)
        .order("start_at", { ascending: true });
      if (error) throw error;
      const eventIds = (data || []).map((e: any) => e.id);
      let attendeeCounts: Record<string, number> = {};
      if (eventIds.length > 0) {
        const { data: attendees } = await supabase
          .from("guild_event_attendees" as any)
          .select("event_id, status")
          .in("event_id", eventIds)
          .in("status", ["REGISTERED", "ACCEPTED"]);
        for (const a of (attendees || []) as any[]) {
          attendeeCounts[a.event_id] = (attendeeCounts[a.event_id] || 0) + 1;
        }
      }
      return (data || []).map((e: any) => ({ ...e, attendeeCount: attendeeCounts[e.id] || 0 }));
    },
  });

  // ── Fetch rituals and upcoming occurrences ──
  const { data: rituals = [] } = useQuery({
    queryKey: ["rituals", guildId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("rituals")
        .select("*")
        .eq("is_active", true)
        .order("next_occurrence", { ascending: true }) as any)
        .eq("guild_id", guildId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ritualOccurrences = [] } = useQuery({
    queryKey: ["ritual-occurrences", guildId],
    queryFn: async () => {
      const ritualIds = rituals.map((r: any) => r.id);
      if (!ritualIds.length) return [];
      const { data, error } = await supabase
        .from("ritual_occurrences")
        .select("*, ritual_attendees(id, user_id, status)")
        .in("ritual_id", ritualIds)
        .order("scheduled_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: rituals.length > 0,
  });

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
  const ritualMap = new Map(rituals.map((r: any) => [r.id, r]));

  // ── Build unified items ──
  const unifiedItems = useMemo(() => {
    const items: UnifiedItem[] = [];

    // Add events
    for (const e of events as any[]) {
      items.push({
        id: e.id,
        kind: "event",
        title: e.title,
        description: e.description,
        startAt: e.start_at,
        locationType: e.location_type,
        callUrl: e.call_url,
        locationText: e.location_text,
        isCancelled: e.is_cancelled,
        isPaid: e.is_paid,
        pricePerTicket: e.price_per_ticket,
        currency: e.currency,
        maxAttendees: e.max_attendees,
        attendeeCount: e.attendeeCount || 0,
        createdByUserId: e.created_by_user_id,
        acceptanceMode: e.acceptance_mode,
        eventData: e,
      });
    }

    // Add ritual occurrences
    for (const occ of ritualOccurrences as any[]) {
      const ritual = ritualMap.get(occ.ritual_id) as any;
      if (!ritual) continue;
      const config = RITUAL_SESSION_TYPES[ritual.session_type as RitualSessionTypeKey];
      const attendees = (occ.ritual_attendees || []).filter((a: any) => a.status !== "CANCELLED");
      items.push({
        id: `ritual-${occ.id}`,
        kind: "ritual",
        title: ritual.title || config?.label || "Ritual",
        description: ritual.description,
        startAt: occ.scheduled_at,
        locationType: "ONLINE",
        callUrl: occ.visio_link || ritual.default_visio_link,
        attendeeCount: attendees.length,
        maxAttendees: ritual.max_participants,
        ritualLabel: config?.label,
        ritualSessionType: ritual.session_type,
        ritualId: ritual.id,
        occurrenceId: occ.id,
        visioLink: occ.visio_link || ritual.default_visio_link,
        isCancelled: occ.status === "CANCELLED",
      });
    }

    return items;
  }, [events, ritualOccurrences, rituals]);

  const upcomingItems = unifiedItems.filter(i => !isPast(new Date(i.startAt)) && !i.isCancelled);
  const pastItems = unifiedItems.filter(i => isPast(new Date(i.startAt)) || i.isCancelled);

  // Sort by start date
  upcomingItems.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  pastItems.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  // ── Event CRUD ──
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
      is_paid: isPaid,
      price_per_ticket: isPaid ? Number(pricePerTicket) || 0 : null,
      currency: isPaid ? currency : "EUR",
      acceptance_mode: acceptanceMode,
      status: "PUBLISHED",
    } as any);
    if (error) { toast({ title: "Failed to create event", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["guild-events", guildId] });
    setTitle(""); setDescription(""); setStartAt(""); setEndAt("");
    setLocationType("ONLINE"); setLocationText(""); setCallUrl("");
    setVisibility("GUILD_MEMBERS"); setMaxAttendees("");
    setIsPaid(false); setPricePerTicket(""); setCurrency("EUR"); setAcceptanceMode("AUTO");
    setCreateOpen(false);
    toast({ title: "Event created!" });
  };

  const registerForEvent = async (eventId: string) => {
    const event = events.find((e: any) => e.id === eventId);
    if (event?.is_paid) {
      const { data, error } = await supabase.functions.invoke("event-checkout", { body: { eventId } });
      if (error || !data?.url) { toast({ title: "Payment error", variant: "destructive" }); return; }
      window.open(data.url, "_blank");
      return;
    }
    const autoAccept = event?.acceptance_mode === "AUTO";
    const isFull = event?.max_attendees && event.attendeeCount >= event.max_attendees;
    const { error } = await supabase.from("guild_event_attendees" as any).insert({
      event_id: eventId,
      user_id: currentUser.id,
      status: isFull ? "WAITLIST" : autoAccept ? "ACCEPTED" : "PENDING",
      payment_status: "NONE",
      accepted_at: autoAccept && !isFull ? new Date().toISOString() : null,
    } as any);
    if (error) { toast({ title: "Failed to register", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["guild-events", guildId] });
    qc.invalidateQueries({ queryKey: ["my-event-registrations", guildId, currentUser.id] });
    toast({ title: isFull ? "Added to waitlist" : autoAccept ? "Registered!" : "Registration submitted" });
  };

  const cancelRegistration = async (eventId: string) => {
    const reg = myRegMap.get(eventId);
    if (!reg) return;
    await supabase.from("guild_event_attendees" as any).update({ status: "CANCELLED", cancelled_at: new Date().toISOString() } as any).eq("id", (reg as any).id);
    qc.invalidateQueries({ queryKey: ["guild-events", guildId] });
    qc.invalidateQueries({ queryKey: ["my-event-registrations", guildId, currentUser.id] });
    toast({ title: "Registration cancelled" });
  };

  const cancelEvent = async (eventId: string) => {
    await supabase.from("guild_events" as any).update({ is_cancelled: true, status: "CANCELLED" } as any).eq("id", eventId);
    qc.invalidateQueries({ queryKey: ["guild-events", guildId] });
    toast({ title: "Event cancelled" });
  };

  const locationIcon = (type?: string) => {
    if (type === "ONLINE") return <Video className="h-3.5 w-3.5" />;
    if (type === "OFFLINE") return <MapPin className="h-3.5 w-3.5" />;
    if (type === "HYBRID") return <><Video className="h-3 w-3" /><MapPin className="h-3 w-3" /></>;
    return <Video className="h-3.5 w-3.5" />;
  };

  const renderItem = (item: UnifiedItem) => {
    const eventPast = isPast(new Date(item.startAt));

    if (item.kind === "ritual") {
      return (
        <div key={item.id} className={`rounded-lg border border-border bg-card p-4 transition-all ${item.isCancelled ? "opacity-60" : "hover:border-primary/30"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Repeat className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-display font-semibold text-sm truncate">{item.title}</span>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary shrink-0">
                  Ritual
                </Badge>
                {item.ritualLabel && item.ritualLabel !== item.title && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">{item.ritualLabel}</Badge>
                )}
                {item.isCancelled && <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(item.startAt), "MMM d, yyyy · HH:mm")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {item.attendeeCount}{item.maxAttendees ? `/${item.maxAttendees}` : ""}
                </span>
              </div>
              {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {!item.isCancelled && !eventPast && item.visioLink && (
                <Button size="sm" variant="default" asChild>
                  <a href={item.visioLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Join
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Regular event
    const myReg = myRegMap.get(item.id);
    const isRegistered = myReg && !["CANCELLED", "REFUSED", "REFUNDED"].includes((myReg as any).status);

    return (
      <div key={item.id} className={`rounded-lg border border-border bg-card p-4 transition-all ${item.isCancelled ? "opacity-60" : "hover:border-primary/30"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link to={`/events/${item.id}`} className="font-display font-semibold text-sm truncate hover:text-primary transition-colors">{item.title}</Link>
              {item.isCancelled && <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>}
              {item.isPaid && <Badge className="bg-primary/10 text-primary border-0 text-[10px]"><Euro className="h-2.5 w-2.5 mr-0.5" />{item.pricePerTicket} {item.currency}</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {format(new Date(item.startAt), "MMM d, yyyy · HH:mm")}
              </span>
              <span className="flex items-center gap-1">
                {locationIcon(item.locationType)}
                {item.locationType}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {item.attendeeCount}{item.maxAttendees ? `/${item.maxAttendees}` : ""}
              </span>
            </div>
            {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {!item.isCancelled && !eventPast && (
              <>
                {isRegistered ? (
                  <>
                    <Badge variant="secondary" className="text-[10px] capitalize">{(myReg as any).status.toLowerCase()}</Badge>
                    {item.callUrl && (
                      <Button size="sm" variant="default" asChild>
                        <a href={item.callUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Join
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => cancelRegistration(item.id)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => registerForEvent(item.id)}>
                    {item.isPaid ? <><Euro className="h-3.5 w-3.5 mr-1" />Buy Ticket</> : "Register"}
                  </Button>
                )}
              </>
            )}
            {(isAdmin || item.createdByUserId === currentUser.id) && !item.isCancelled && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelEvent(item.id)}>Cancel Event</Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (eventsLoading) return <p className="text-sm text-muted-foreground">Loading events…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">Events & Rituals</h3>
        {isMember && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Event
          </Button>
        )}
      </div>

      {upcomingItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Upcoming</h4>
          {upcomingItems.map(renderItem)}
        </div>
      )}

      {pastItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Past</h4>
          {pastItems.map(renderItem)}
        </div>
      )}

      {unifiedItems.length === 0 && <p className="text-muted-foreground text-sm">No events or rituals scheduled yet.</p>}

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
              <label className="text-sm font-medium mb-1 block">Acceptance Mode</label>
              <Select value={acceptanceMode} onValueChange={setAcceptanceMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">Automatic (first-come, first-served)</SelectItem>
                  <SelectItem value="MANUAL">Manual (review & accept)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Paid Event</label>
              <Switch checked={isPaid} onCheckedChange={setIsPaid} />
            </div>
            {isPaid && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Price per ticket</label>
                  <Input type="number" value={pricePerTicket} onChange={(e) => setPricePerTicket(e.target.value)} placeholder="0" min={0} step={0.01} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Currency</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
