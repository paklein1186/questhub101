import { useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import {
  Calendar, Clock, Video, Users, CalendarPlus,
  Coffee, Heart, Landmark, Brain, GraduationCap, Zap, Scale,
  Telescope, Network, PartyPopper, Shield, Compass, Globe,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  addMonths, subMonths, addDays, subDays, addWeeks, subWeeks, startOfWeek, endOfWeek,
} from "date-fns";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RITUAL_SESSION_TYPES, type RitualSessionTypeKey } from "@/lib/ritualConfig";
import { CalendarSyncTab } from "@/components/CalendarSyncTab";
import { IcsFeedsManager } from "@/components/IcsFeedsManager";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const SESSION_ICONS: Record<string, any> = {
  Coffee, Heart, Landmark, Brain, GraduationCap, Zap, Scale, Telescope, Network, PartyPopper,
};

function getSessionIcon(sessionType: string) {
  const config = RITUAL_SESSION_TYPES[sessionType as RitualSessionTypeKey];
  if (!config) return Calendar;
  return SESSION_ICONS[config.icon] || Calendar;
}

function generateIcs(title: string, start: string, durationMin: number, location?: string) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const toIcs = (iso: string) => { const d = new Date(iso); return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
  const s = new Date(start);
  const e = new Date(s.getTime() + durationMin * 60000);
  const blob = new Blob([[
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CTG//Calendar//EN","BEGIN:VEVENT",
    `UID:ctg-${Date.now()}@${window.location.hostname}`,
    `DTSTAMP:${toIcs(new Date().toISOString())}`,
    `DTSTART:${toIcs(s.toISOString())}`,`DTEND:${toIcs(e.toISOString())}`,
    `SUMMARY:${title.replace(/,/g,"\\,")}`,
    location ? `LOCATION:${location.replace(/,/g,"\\,")}` : "",
    "END:VEVENT","END:VCALENDAR"
  ].filter(Boolean).join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "event.ics";
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

interface CalendarEvent {
  id: string;
  occurrenceId?: string;
  title: string;
  date: string;
  endDate?: string;
  durationMinutes: number;
  type: "event" | "ritual" | "external";
  entityType: "guild" | "quest" | "external";
  entityId: string;
  entityName: string;
  visioLink?: string;
  sessionType?: string;
  sourceCalendarId?: string;
  sourceCalendarName?: string;
}

export function WorkCalendarTab() {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("ctg-hidden-calendars");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  type ViewMode = "day" | "3day" | "week" | "month";
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem("ctg-calendar-view-mode");
      if (stored && ["day", "3day", "week", "month"].includes(stored)) return stored as ViewMode;
    } catch {}
    return "month";
  });

  const handleSetViewMode = useCallback((v: ViewMode) => {
    setViewMode(v);
    try { localStorage.setItem("ctg-calendar-view-mode", v); } catch {}
  }, []);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  // Fetch guild events user is attending
  const { data: myEventAttendances = [] } = useQuery({
    queryKey: ["my-event-attendances", currentUser.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_event_attendees")
        .select("event_id, guild_events(id, title, start_date, end_date, duration_minutes, call_url, guild_id, guilds(name))")
        .eq("user_id", currentUser.id!)
        .in("status", ["registered", "accepted"]);
      return data || [];
    },
    enabled: !!currentUser.id,
  });

  // Fetch ritual occurrences user is attending
  const { data: myRitualAttendances = [] } = useQuery({
    queryKey: ["my-ritual-attendances", currentUser.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ritual_attendees")
        .select("occurrence_id, status, ritual_occurrences(id, scheduled_at, visio_link, ritual_id, rituals(id, title, duration_minutes, session_type, guild_id, quest_id, guilds(name), quests(title)))")
        .eq("user_id", currentUser.id!)
        .neq("status", "declined");
      return data || [];
    },
    enabled: !!currentUser.id,
  });

  // Fetch synced external calendar events (Google / Outlook)
  const { data: externalEvents = [] } = useQuery({
    queryKey: ["my-external-calendar-events", currentUser.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("calendar_busy_events")
        .select("id, summary, start_at, end_at, connection_id, source_calendar_id, source_calendar_name, calendar_connections(provider)")
        .eq("user_id", currentUser.id!);
      return data || [];
    },
    enabled: !!currentUser.id,
  });

  // Normalize into CalendarEvent[]
  const events: CalendarEvent[] = useMemo(() => {
    const items: CalendarEvent[] = [];

    myEventAttendances.forEach((att: any) => {
      const evt = att.guild_events;
      if (!evt || !evt.start_date) return;
      items.push({
        id: `event-${evt.id}`,
        title: evt.title,
        date: evt.start_date,
        durationMinutes: evt.duration_minutes || 60,
        type: "event",
        entityType: "guild",
        entityId: evt.guild_id,
        entityName: evt.guilds?.name || "Guild",
        visioLink: evt.call_url,
      });
    });

    myRitualAttendances.forEach((att: any) => {
      const occ = att.ritual_occurrences;
      if (!occ?.scheduled_at) return;
      const ritual = occ.rituals;
      if (!ritual) return;
      const isQuest = !!ritual.quest_id;
      items.push({
        id: `ritual-${occ.id}`,
        occurrenceId: occ.id,
        title: ritual.title,
        date: occ.scheduled_at,
        durationMinutes: ritual.duration_minutes || 60,
        type: "ritual",
        entityType: isQuest ? "quest" : "guild",
        entityId: isQuest ? ritual.quest_id : ritual.guild_id,
        entityName: isQuest ? ritual.quests?.title || "Quest" : ritual.guilds?.name || "Guild",
        visioLink: occ.visio_link,
        sessionType: ritual.session_type,
      });
    });

    externalEvents.forEach((ext: any) => {
      if (!ext.start_at || !ext.end_at) return;
      const start = new Date(ext.start_at).getTime();
      const end = new Date(ext.end_at).getTime();
      const durationMin = Math.max(Math.round((end - start) / 60000), 1);
      const provider = (ext.calendar_connections as any)?.provider || "google";
      items.push({
        id: `ext-${ext.id}`,
        title: ext.summary || "(No title)",
        date: ext.start_at,
        endDate: ext.end_at,
        durationMinutes: durationMin,
        type: "external",
        entityType: "external",
        entityId: "",
        entityName: provider === "outlook" ? "Outlook" : "Google Calendar",
        sourceCalendarId: ext.source_calendar_id || undefined,
        sourceCalendarName: ext.source_calendar_name || undefined,
      });
    });

    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [myEventAttendances, myRitualAttendances, externalEvents]);

  // Derive unique source calendars for filter UI
  const sourceCalendars = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((e) => {
      if (e.sourceCalendarId) {
        map.set(e.sourceCalendarId, e.sourceCalendarName || e.sourceCalendarId);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  const toggleCalendar = (calId: string) => {
    setHiddenCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(calId)) next.delete(calId);
      else next.add(calId);
      localStorage.setItem("ctg-hidden-calendars", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // Filtered events (hide toggled-off calendars)
  const filteredEvents = useMemo(() =>
    events.filter((e) => !e.sourceCalendarId || !hiddenCalendars.has(e.sourceCalendarId)),
    [events, hiddenCalendars]
  );

  // Compute visible days based on view mode
  const visibleDays = useMemo(() => {
    if (viewMode === "month") {
      return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    }
    if (viewMode === "week") {
      const ws = startOfWeek(currentMonth, { weekStartsOn: 1 });
      const we = endOfWeek(currentMonth, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: ws, end: we });
    }
    if (viewMode === "3day") {
      return eachDayOfInterval({ start: currentMonth, end: addDays(currentMonth, 2) });
    }
    return [currentMonth];
  }, [currentMonth, viewMode]);

  const gridCols = viewMode === "month" || viewMode === "week" ? 7 : viewMode === "3day" ? 3 : 1;

  const navigateBack = () => {
    if (viewMode === "month") setCurrentMonth(subMonths(currentMonth, 1));
    else if (viewMode === "week") setCurrentMonth(subWeeks(currentMonth, 1));
    else if (viewMode === "3day") setCurrentMonth(subDays(currentMonth, 3));
    else setCurrentMonth(subDays(currentMonth, 1));
  };
  const navigateForward = () => {
    if (viewMode === "month") setCurrentMonth(addMonths(currentMonth, 1));
    else if (viewMode === "week") setCurrentMonth(addWeeks(currentMonth, 1));
    else if (viewMode === "3day") setCurrentMonth(addDays(currentMonth, 3));
    else setCurrentMonth(addDays(currentMonth, 1));
  };

  const headerLabel = viewMode === "month"
    ? format(currentMonth, "MMMM yyyy")
    : viewMode === "week"
      ? `${format(visibleDays[0], "MMM d")} – ${format(visibleDays[6], "MMM d, yyyy")}`
      : viewMode === "3day"
        ? `${format(visibleDays[0], "MMM d")} – ${format(visibleDays[2], "MMM d")}`
        : format(currentMonth, "EEEE, MMMM d, yyyy");

  const eventsForDay = (day: Date) => filteredEvents.filter((e) => isSameDay(new Date(e.date), day));

  const monthStartOffset = viewMode === "month" ? (startOfMonth(currentMonth).getDay() + 6) % 7 : 0;
  const showWeekdayHeaders = viewMode === "month" || viewMode === "week";
  const minCellH = viewMode === "month" ? "min-h-[80px]" : viewMode === "day" ? "min-h-[200px]" : "min-h-[120px]";
  const maxVisible = viewMode === "month" ? 3 : 10;

  return (
    <div className="space-y-6">
      {/* Navigation + View Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={navigateBack}>← Previous</Button>
          <h3 className="font-display font-semibold text-lg whitespace-nowrap">{headerLabel}</h3>
          <Button variant="ghost" size="sm" onClick={navigateForward}>Next →</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setSyncModalOpen(true)}>
            <CalendarPlus className="h-3.5 w-3.5" /> Sync
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentMonth(new Date())}>Today</Button>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && handleSetViewMode(v as ViewMode)} size="sm">
            <ToggleGroupItem value="day" className="text-xs h-7 px-2.5">Day</ToggleGroupItem>
            <ToggleGroupItem value="3day" className="text-xs h-7 px-2.5">3 Days</ToggleGroupItem>
            <ToggleGroupItem value="week" className="text-xs h-7 px-2.5">Week</ToggleGroupItem>
            <ToggleGroupItem value="month" className="text-xs h-7 px-2.5">Month</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Source calendar filters */}
      {sourceCalendars.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Calendars:</span>
          {sourceCalendars.map((cal) => {
            const isHidden = hiddenCalendars.has(cal.id);
            return (
              <Button
                key={cal.id}
                size="sm"
                variant={isHidden ? "outline" : "secondary"}
                className={`h-7 text-xs gap-1.5 ${isHidden ? "opacity-50" : ""}`}
                onClick={() => toggleCalendar(cal.id)}
              >
                <div className={`h-2 w-2 rounded-full ${isHidden ? "bg-muted-foreground" : "bg-primary"}`} />
                {cal.name}
              </Button>
            );
          })}
        </div>
      )}

      {/* Calendar grid */}
      <div className="grid gap-px bg-border rounded-xl overflow-hidden" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
        {/* Day headers */}
        {showWeekdayHeaders && (viewMode === "week"
          ? visibleDays.map((d) => (
              <div key={`hdr-${d.toISOString()}`} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{format(d, "EEE d")}</div>
            ))
          : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))
        )}
        {viewMode === "3day" && visibleDays.map((d) => (
          <div key={`hdr-${d.toISOString()}`} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{format(d, "EEE, MMM d")}</div>
        ))}
        {viewMode === "day" && (
          <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{format(currentMonth, "EEEE, MMM d")}</div>
        )}
        {/* Month view offset */}
        {viewMode === "month" && Array.from({ length: monthStartOffset }).map((_, i) => (
          <div key={`empty-${i}`} className={`bg-card p-2 ${minCellH}`} />
        ))}
        {visibleDays.map((day) => {
          const dayEvents = eventsForDay(day);
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className={`bg-card p-1.5 ${minCellH} ${today ? "ring-2 ring-primary ring-inset" : ""}`}>
              {viewMode === "month" && (
                <span className={`text-xs font-medium ${today ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</span>
              )}
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, maxVisible).map((evt) => {
                  const Icon = evt.type === "external" ? Globe : evt.type === "ritual" && evt.sessionType ? getSessionIcon(evt.sessionType) : Calendar;
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => setSelectedEvent(evt)}
                      className={`text-[10px] rounded px-1 py-0.5 truncate cursor-pointer flex items-center gap-0.5 text-left w-full hover:opacity-80 transition-opacity ${
                        evt.type === "external" ? "bg-secondary/60 text-secondary-foreground" : evt.type === "ritual" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
                      }`}
                      title={`${evt.title} — ${format(new Date(evt.date), "HH:mm")} (${evt.entityName})`}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{viewMode !== "month" ? `${format(new Date(evt.date), "HH:mm")} ${evt.title}` : evt.title}</span>
                    </button>
                  );
                })}
                {dayEvents.length > maxVisible && (
                  <span className="text-[9px] text-muted-foreground">+{dayEvents.length - maxVisible} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming event tiles */}
      <div>
        <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Upcoming
        </h4>
        {filteredEvents.filter((e) => new Date(e.date) >= new Date()).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No upcoming events or rituals you're attending.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEvents.filter((e) => new Date(e.date) >= new Date()).slice(0, 12).map((evt) => {
              const Icon = evt.type === "external"
                ? Globe
                : evt.type === "ritual" && evt.sessionType
                  ? getSessionIcon(evt.sessionType)
                  : Calendar;
              const route = evt.entityType === "external" ? "" : evt.entityType === "guild" ? `/guilds/${evt.entityId}` : `/quests/${evt.entityId}`;
              return (
                <Card key={evt.id} className="group hover:scale-[1.01] transition-transform">
                  <CardContent className="p-4 flex flex-col gap-3">
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${evt.type === "external" ? "bg-secondary/60" : evt.type === "ritual" ? "bg-primary/10" : "bg-accent"}`}>
                        <Icon className={`h-5 w-5 ${evt.type === "external" ? "text-secondary-foreground" : evt.type === "ritual" ? "text-primary" : "text-accent-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{evt.title}</p>
                        {evt.entityType !== "external" ? (
                          <Link to={route} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5">
                            {evt.entityType === "guild" ? <Shield className="h-3 w-3" /> : <Compass className="h-3 w-3" />}
                            {evt.entityName}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5 mt-0.5">
                            <Globe className="h-3 w-3" />
                            {evt.entityName}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                        {evt.type === "external" ? evt.entityName : evt.type}
                      </Badge>
                    </div>

                    {/* Date & duration */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{format(new Date(evt.date), "EEE, MMM d · HH:mm")}</span>
                      <span className="text-muted-foreground/60">·</span>
                      <span>{evt.durationMinutes} min</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-border">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={() => generateIcs(evt.title, evt.date, evt.durationMinutes, evt.visioLink)}
                      >
                        <CalendarPlus className="h-3 w-3" /> Export
                      </Button>
                      <div className="flex-1" />
                      {evt.type === "ritual" && evt.occurrenceId ? (
                        <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => navigate(`/ritual-call/${evt.occurrenceId}`)}>
                          <Video className="h-3 w-3" /> Join
                        </Button>
                      ) : evt.visioLink ? (
                        <Button size="sm" variant="default" className="h-7 text-xs gap-1" asChild>
                          <a href={evt.visioLink} target="_blank" rel="noopener noreferrer">
                            <Video className="h-3 w-3" /> Join
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar Sync (Google / Outlook) */}
      <Separator />
      <CalendarSyncTab />

      {/* Event detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          {selectedEvent && (() => {
            const evt = selectedEvent;
            const Icon = evt.type === "external" ? Globe : evt.type === "ritual" && evt.sessionType ? getSessionIcon(evt.sessionType) : Calendar;
            const route = evt.entityType === "external" ? "" : evt.entityType === "guild" ? `/guilds/${evt.entityId}` : `/quests/${evt.entityId}`;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${evt.type === "external" ? "bg-secondary/60" : evt.type === "ritual" ? "bg-primary/10" : "bg-accent"}`}>
                      <Icon className={`h-5 w-5 ${evt.type === "external" ? "text-secondary-foreground" : evt.type === "ritual" ? "text-primary" : "text-accent-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-base">{evt.title}</DialogTitle>
                      <DialogDescription className="mt-0.5">
                        {evt.entityType !== "external" ? evt.entityName : (evt.sourceCalendarName || evt.entityName)}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-3 mt-2">
                  {/* Date & time */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{format(new Date(evt.date), "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>
                      {format(new Date(evt.date), "HH:mm")}
                      {evt.endDate ? ` – ${format(new Date(evt.endDate), "HH:mm")}` : ` (${evt.durationMinutes} min)`}
                    </span>
                  </div>

                  {/* Source calendar */}
                  {evt.sourceCalendarName && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{evt.sourceCalendarName}</span>
                    </div>
                  )}

                  {/* Type badge */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {evt.type === "external" ? evt.entityName : evt.type}
                    </Badge>
                    {evt.sessionType && (
                      <Badge variant="secondary" className="text-xs capitalize">{evt.sessionType.replace(/_/g, " ")}</Badge>
                    )}
                  </div>

                  {/* Entity link */}
                  {evt.entityType !== "external" && route && (
                    <Link
                      to={route}
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      onClick={() => setSelectedEvent(null)}
                    >
                      {evt.entityType === "guild" ? <Shield className="h-3.5 w-3.5" /> : <Compass className="h-3.5 w-3.5" />}
                      Go to {evt.entityName}
                    </Link>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    onClick={() => generateIcs(evt.title, evt.date, evt.durationMinutes, evt.visioLink)}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" /> Export .ics
                  </Button>
                  <div className="flex-1" />
                  {evt.type === "ritual" && evt.occurrenceId ? (
                    <Button size="sm" variant="default" className="text-xs gap-1" onClick={() => { setSelectedEvent(null); navigate(`/ritual-call/${evt.occurrenceId}`); }}>
                      <Video className="h-3.5 w-3.5" /> Join call
                    </Button>
                  ) : evt.visioLink ? (
                    <Button size="sm" variant="default" className="text-xs gap-1" asChild>
                      <a href={evt.visioLink} target="_blank" rel="noopener noreferrer">
                        <Video className="h-3.5 w-3.5" /> Join call
                      </a>
                    </Button>
                  ) : null}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Sync modal */}
      <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Sync with your calendar
            </DialogTitle>
            <DialogDescription>
              Import events from your external calendars, or export your CTG events via ICS feeds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Existing Google/Outlook sync */}
            <div>
              <h4 className="text-sm font-medium mb-2">Import from external calendar</h4>
              <CalendarSyncTab />
            </div>

            <Separator />

            {/* ICS export feeds */}
            <div>
              <h4 className="text-sm font-medium mb-2">Subscribe from your calendar (ICS)</h4>
              <IcsFeedsManager compact />
              <Link
                to="/me?tab=calendar"
                className="text-xs text-primary hover:underline mt-2 inline-block"
                onClick={() => setSyncModalOpen(false)}
              >
                Advanced options → Settings
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
