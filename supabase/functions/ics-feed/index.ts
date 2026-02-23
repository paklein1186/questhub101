import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toIcsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Fold lines to 75-char max as per RFC 5545 */
function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;
  const parts: string[] = [];
  parts.push(line.substring(0, maxLen));
  let remaining = line.substring(maxLen);
  while (remaining.length > 0) {
    parts.push(" " + remaining.substring(0, maxLen - 1));
    remaining = remaining.substring(maxLen - 1);
  }
  return parts.join("\r\n");
}

interface IcsEvent {
  uid: string;
  dtStart: Date;
  dtEnd: Date;
  summary: string;
  description: string;
  location?: string;
  status: string;
  sequence: number;
  lastModified: Date;
}

function buildVEvent(evt: IcsEvent): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${evt.uid}`,
    `DTSTAMP:${toIcsDate(evt.lastModified)}`,
    `DTSTART:${toIcsDate(evt.dtStart)}`,
    `DTEND:${toIcsDate(evt.dtEnd)}`,
    `SUMMARY:${escapeIcs(evt.summary)}`,
    `DESCRIPTION:${escapeIcs(evt.description)}`,
    evt.location ? `LOCATION:${escapeIcs(evt.location)}` : "",
    `STATUS:${evt.status}`,
    `SEQUENCE:${evt.sequence}`,
    "END:VEVENT",
  ].filter(Boolean);
  return lines.map(foldLine).join("\r\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Expected path: /ics-feed?feedId=xxx&token=yyy
    const feedId = url.searchParams.get("feedId");
    const token = url.searchParams.get("token");

    if (!feedId || !token) {
      return new Response("Missing feedId or token", { status: 400, headers: corsHeaders });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(feedId)) {
      return new Response("Invalid feedId", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate feed
    const { data: feed, error: feedErr } = await supabase
      .from("ics_feeds")
      .select("*")
      .eq("id", feedId)
      .eq("token", token)
      .single();

    if (feedErr || !feed) {
      return new Response("Feed not found", { status: 404, headers: corsHeaders });
    }

    if (!feed.is_active) {
      return new Response("Feed deactivated", { status: 410, headers: corsHeaders });
    }

    const userId = feed.owner_user_id;
    const feedType = feed.type;
    const now = new Date();
    const rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // -30 days
    const rangeEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // +365 days

    const events: IcsEvent[] = [];
    const baseUrl = "https://changethegame.xyz";

    // ── BOOKINGS ──
    if (feedType === "PERSONAL_ALL" || feedType === "PERSONAL_ONLY_BOOKINGS") {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, service_id, requester_id, provider_user_id, status, start_date_time, end_date_time, notes, call_url, created_at, updated_at, services(title)")
        .or(`requester_id.eq.${userId},provider_user_id.eq.${userId}`)
        .eq("is_deleted", false)
        .neq("status", "CANCELLED")
        .gte("start_date_time", rangeStart.toISOString())
        .lte("start_date_time", rangeEnd.toISOString());

      (bookings || []).forEach((b: any) => {
        if (!b.start_date_time) return;
        const start = new Date(b.start_date_time);
        const end = b.end_date_time ? new Date(b.end_date_time) : new Date(start.getTime() + 60 * 60000);
        events.push({
          uid: `booking-${b.id}@changethegame.xyz`,
          dtStart: start,
          dtEnd: end,
          summary: b.services?.title || "Booking",
          description: `Booking for ${b.services?.title || "service"}\\n${baseUrl}/bookings/${b.id}`,
          location: b.call_url || undefined,
          status: b.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE",
          sequence: 0,
          lastModified: new Date(b.updated_at || b.created_at),
        });
      });
    }

    // ── RITUAL OCCURRENCES (user is attendee) ──
    if (feedType === "PERSONAL_ALL" || feedType === "PERSONAL_ONLY_RITUALS") {
      const { data: ritualAtt } = await supabase
        .from("ritual_attendees")
        .select("occurrence_id, status, ritual_occurrences(id, scheduled_at, visio_link, status, updated_at, ritual_id, rituals(id, title, duration_minutes, guild_id, quest_id))")
        .eq("user_id", userId)
        .neq("status", "declined");

      (ritualAtt || []).forEach((att: any) => {
        const occ = att.ritual_occurrences;
        if (!occ?.scheduled_at) return;
        const ritual = occ.rituals;
        if (!ritual) return;
        const start = new Date(occ.scheduled_at);
        if (start < rangeStart || start > rangeEnd) return;
        const dur = ritual.duration_minutes || 60;
        const end = new Date(start.getTime() + dur * 60000);
        const isCancelled = occ.status === "cancelled";
        const entityPath = ritual.quest_id ? `quests/${ritual.quest_id}` : `guilds/${ritual.guild_id}`;
        events.push({
          uid: `ritual-occ-${occ.id}@changethegame.xyz`,
          dtStart: start,
          dtEnd: end,
          summary: ritual.title,
          description: `Ritual session\\n${baseUrl}/${entityPath}`,
          location: occ.visio_link || undefined,
          status: isCancelled ? "CANCELLED" : "CONFIRMED",
          sequence: 0,
          lastModified: new Date(occ.updated_at || occ.scheduled_at),
        });
      });
    }

    // ── GUILD EVENTS (user is attendee) ──
    if (feedType === "PERSONAL_ALL" || feedType === "PERSONAL_ONLY_RITUALS") {
      const { data: eventAtt } = await supabase
        .from("guild_event_attendees")
        .select("event_id, guild_events(id, title, description, start_at, end_at, call_url, location_text, is_cancelled, updated_at, guild_id, start_date, end_date, duration_minutes)")
        .eq("user_id", userId)
        .in("status", ["registered", "accepted"]);

      (eventAtt || []).forEach((att: any) => {
        const evt = att.guild_events;
        if (!evt) return;
        const startField = evt.start_at || evt.start_date;
        if (!startField) return;
        const start = new Date(startField);
        if (start < rangeStart || start > rangeEnd) return;
        const endField = evt.end_at || evt.end_date;
        const end = endField ? new Date(endField) : new Date(start.getTime() + (evt.duration_minutes || 60) * 60000);
        events.push({
          uid: `event-${evt.id}@changethegame.xyz`,
          dtStart: start,
          dtEnd: end,
          summary: evt.title,
          description: `${evt.description ? evt.description.substring(0, 200) : "Guild event"}\\n${baseUrl}/events/${evt.id}`,
          location: evt.call_url || evt.location_text || undefined,
          status: evt.is_cancelled ? "CANCELLED" : "CONFIRMED",
          sequence: 0,
          lastModified: new Date(evt.updated_at || startField),
        });
      });
    }

    // Build ICS content
    const feedLabel = feed.label || "changethegame Calendar";
    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//changethegame.xyz//Calendar 1.0//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeIcs(feedLabel)}`,
      ...events.map(buildVEvent),
      "END:VCALENDAR",
    ];

    const icsContent = icsLines.join("\r\n");

    return new Response(icsContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${feedId}.ics"`,
        "Cache-Control": "public, max-age=900", // 15 min cache
      },
    });
  } catch (err) {
    console.error("ICS feed error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
