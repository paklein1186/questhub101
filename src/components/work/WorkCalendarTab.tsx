import { useMemo } from "react";
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
  Telescope, Network, PartyPopper, Shield, Compass,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { useState } from "react";
import { RITUAL_SESSION_TYPES, type RitualSessionTypeKey } from "@/lib/ritualConfig";
import { CalendarSyncTab } from "@/components/CalendarSyncTab";
import { Separator } from "@/components/ui/separator";

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
  durationMinutes: number;
  type: "event" | "ritual";
  entityType: "guild" | "quest";
  entityId: string;
  entityName: string;
  visioLink?: string;
  sessionType?: string;
}

export function WorkCalendarTab() {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [myEventAttendances, myRitualAttendances]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const eventsForDay = (day: Date) => events.filter((e) => isSameDay(new Date(e.date), day));

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          ← Previous
        </Button>
        <h3 className="font-display font-semibold text-lg">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          Next →
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {/* Offset for first day of month */}
        {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-card p-2 min-h-[80px]" />
        ))}
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className={`bg-card p-1.5 min-h-[80px] ${today ? "ring-2 ring-primary ring-inset" : ""}`}>
              <span className={`text-xs font-medium ${today ? "text-primary" : "text-foreground"}`}>
                {format(day, "d")}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((evt) => {
                  const Icon = evt.type === "ritual" && evt.sessionType
                    ? getSessionIcon(evt.sessionType)
                    : evt.type === "event" ? Calendar : Calendar;
                  return (
                    <div
                      key={evt.id}
                      className={`text-[10px] rounded px-1 py-0.5 truncate cursor-default flex items-center gap-0.5 ${
                        evt.type === "ritual"
                          ? "bg-primary/10 text-primary"
                          : "bg-accent text-accent-foreground"
                      }`}
                      title={`${evt.title} — ${format(new Date(evt.date), "HH:mm")} (${evt.entityName})`}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{evt.title}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3} more</span>
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
        {events.filter((e) => new Date(e.date) >= new Date()).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No upcoming events or rituals you're attending.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.filter((e) => new Date(e.date) >= new Date()).slice(0, 12).map((evt) => {
              const Icon = evt.type === "ritual" && evt.sessionType
                ? getSessionIcon(evt.sessionType)
                : Calendar;
              const route = evt.entityType === "guild" ? `/guilds/${evt.entityId}` : `/quests/${evt.entityId}`;
              return (
                <Card key={evt.id} className="group hover:scale-[1.01] transition-transform">
                  <CardContent className="p-4 flex flex-col gap-3">
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${evt.type === "ritual" ? "bg-primary/10" : "bg-accent"}`}>
                        <Icon className={`h-5 w-5 ${evt.type === "ritual" ? "text-primary" : "text-accent-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{evt.title}</p>
                        <Link to={route} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5">
                          {evt.entityType === "guild" ? <Shield className="h-3 w-3" /> : <Compass className="h-3 w-3" />}
                          {evt.entityName}
                        </Link>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                        {evt.type}
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
    </div>
  );
}
