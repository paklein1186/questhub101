import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, List, MapPin, Video, Users, Euro, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isPast } from "date-fns";

export default function CalendarPage() {
  const currentUser = useCurrentUser();
  const { label } = usePersona();
  const [view, setView] = useState<"calendar" | "list">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMyGuildEvents, setShowMyGuildEvents] = useState(true);
  const [showRegisteredEvents, setShowRegisteredEvents] = useState(true);

  // Get guilds I'm a member of
  const { data: myGuildIds = [] } = useQuery({
    queryKey: ["my-guild-ids", currentUser.id],
    queryFn: async () => {
      const { data } = await supabase.from("guild_members").select("guild_id").eq("user_id", currentUser.id);
      return (data || []).map((g: any) => g.guild_id);
    },
    enabled: !!currentUser.id,
  });

  // Get events I'm registered for
  const { data: myRegisteredEventIds = [] } = useQuery({
    queryKey: ["my-registered-events", currentUser.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_event_attendees" as any)
        .select("event_id")
        .eq("user_id", currentUser.id)
        .in("status", ["REGISTERED", "ACCEPTED", "PENDING"]);
      return (data || []).map((r: any) => r.event_id);
    },
    enabled: !!currentUser.id,
  });

  // Get all relevant events
  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["calendar-events", myGuildIds, myRegisteredEventIds],
    queryFn: async () => {
      const eventIds = new Set<string>();
      const results: any[] = [];

      if (myGuildIds.length > 0) {
      const { data } = await supabase
        .from("guild_events" as any)
        .select("*")
        .in("guild_id", myGuildIds)
        .eq("is_cancelled", false)
        .order("start_at", { ascending: true });
      for (const e of (data || []) as any[]) {
        if (!eventIds.has(e.id)) { eventIds.add(e.id); results.push({ ...e, _source: "guild" }); }
      }
      }

      if (myRegisteredEventIds.length > 0) {
        const { data } = await supabase
          .from("guild_events" as any)
          .select("*")
          .in("id", myRegisteredEventIds)
          .eq("is_cancelled", false)
          .order("start_at", { ascending: true });
        for (const e of (data || []) as any[]) {
          if (!eventIds.has(e.id)) { eventIds.add(e.id); results.push({ ...e, _source: "registered" }); }
          else {
            const idx = results.findIndex((r: any) => r.id === e.id);
            if (idx >= 0) results[idx]._source = "both";
          }
        }
      }

      // Fetch guild names
      const guildIds = [...new Set(results.map((e: any) => e.guild_id))];
      if (guildIds.length > 0) {
        const { data: guilds } = await supabase.from("guilds").select("id, name").in("id", guildIds);
        const guildMap = new Map((guilds || []).map((g: any) => [g.id, g.name]));
        for (const e of results) e._guildName = guildMap.get(e.guild_id) || "Unknown";
      }

      return results;
    },
    enabled: myGuildIds.length > 0 || myRegisteredEventIds.length > 0,
  });

  const filteredEvents = useMemo(() => {
    return allEvents.filter((e: any) => {
      if (showMyGuildEvents && showRegisteredEvents) return true;
      if (showMyGuildEvents && (e._source === "guild" || e._source === "both")) return true;
      if (showRegisteredEvents && (e._source === "registered" || e._source === "both")) return true;
      return false;
    });
  }, [allEvents, showMyGuildEvents, showRegisteredEvents]);

  const upcomingEvents = filteredEvents.filter((e: any) => !isPast(new Date(e.start_at)));
  const pastEvents = filteredEvents.filter((e: any) => isPast(new Date(e.start_at)));

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay() || 7; // Mon=1
  const paddingDays = startDay - 1;

  const eventsOnDay = (day: Date) => filteredEvents.filter((e: any) => isSameDay(new Date(e.start_at), day));

  const locationIcon = (type: string) => type === "ONLINE" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />;

  const renderEventCard = (event: any) => (
    <Link key={event.id} to={`/events/${event.id}`} className="block rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold truncate">{event.title}</h4>
          <p className="text-xs text-muted-foreground">{event._guildName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-0.5"><CalendarDays className="h-3 w-3" />{format(new Date(event.start_at), "MMM d · HH:mm")}</span>
            <span className="flex items-center gap-0.5">{locationIcon(event.location_type)}{event.location_type}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {event.is_paid && <Badge className="bg-primary/10 text-primary border-0 text-[10px]"><Euro className="h-2.5 w-2.5 mr-0.5" />{event.price_per_ticket}</Badge>}
          {event._source === "registered" || event._source === "both" ? <Badge variant="secondary" className="text-[10px]">Registered</Badge> : null}
        </div>
      </div>
    </Link>
  );

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" /> Calendar
        </h1>
        <p className="text-muted-foreground mt-1">Events from your {label("guild.label_plural").toLowerCase()} and registrations.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showMyGuildEvents} onCheckedChange={(v) => setShowMyGuildEvents(!!v)} />
          Events from my {label("guild.label_plural").toLowerCase()}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showRegisteredEvents} onCheckedChange={(v) => setShowRegisteredEvents(!!v)} />
          Events I'm registered to
        </label>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
          <Button size="sm" variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")}><CalendarDays className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading events…</p>}

      {view === "list" ? (
        <div className="space-y-6">
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Upcoming</h3>
              <div className="space-y-2">{upcomingEvents.map(renderEventCard)}</div>
            </div>
          )}
          {pastEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Past</h3>
              <div className="space-y-2">{pastEvents.map(renderEventCard)}</div>
            </div>
          )}
          {filteredEvents.length === 0 && !isLoading && <p className="text-muted-foreground text-sm">No events found.</p>}
        </div>
      ) : (
        <div>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h3 className="font-display font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
            <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: paddingDays }).map((_, i) => <div key={`pad-${i}`} className="min-h-[80px]" />)}
            {daysInMonth.map(day => {
              const dayEvents = eventsOnDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={`min-h-[80px] border border-border rounded p-1 ${isToday ? "bg-primary/5 border-primary/30" : ""}`}>
                  <p className={`text-xs font-medium mb-0.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}>{format(day, "d")}</p>
                  {dayEvents.slice(0, 2).map((e: any) => (
                    <Link key={e.id} to={`/events/${e.id}`} className="block text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5 mb-0.5 truncate hover:bg-primary/20">
                      {format(new Date(e.start_at), "HH:mm")} {e.title}
                    </Link>
                  ))}
                  {dayEvents.length > 2 && <p className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
