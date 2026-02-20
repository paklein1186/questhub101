import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CALENDAR_CLIENT_ID");
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CALENDAR_CLIENT_SECRET");

async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function refreshMicrosoftToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID!,
      client_secret: MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "Calendars.ReadWrite offline_access",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function getValidToken(supabase: any, conn: any): Promise<string | null> {
  const now = new Date();
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  if (expiresAt && expiresAt.getTime() - 300_000 > now.getTime()) {
    return conn.access_token;
  }
  if (!conn.refresh_token) return null;

  let tokenData: any;
  if (conn.provider === "google") {
    tokenData = await refreshGoogleToken(conn.refresh_token);
  } else if (conn.provider === "outlook") {
    tokenData = await refreshMicrosoftToken(conn.refresh_token);
  }
  if (!tokenData?.access_token) return null;

  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  await supabase.from("calendar_connections").update({
    access_token: tokenData.access_token,
    token_expires_at: newExpiresAt,
    ...(tokenData.refresh_token ? { refresh_token: tokenData.refresh_token } : {}),
  }).eq("id", conn.id);

  return tokenData.access_token;
}

interface CalInfo { id: string; name: string }

async function listGoogleCalendars(accessToken: string): Promise<CalInfo[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [{ id: "primary", name: "Primary" }];
  const data = await res.json();
  const cals = (data.items || [])
    .filter((cal: any) => !cal.deleted && cal.selected !== false)
    .map((cal: any) => ({ id: cal.id, name: cal.summaryOverride || cal.summary || cal.id }));
  return cals.length > 0 ? cals : [{ id: "primary", name: "Primary" }];
}

async function listOutlookCalendars(accessToken: string): Promise<CalInfo[]> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/calendars?$select=id,name", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [{ id: "default", name: "Calendar" }];
  const data = await res.json();
  const cals = (data.value || []).map((cal: any) => ({ id: cal.id, name: cal.name || cal.id }));
  return cals.length > 0 ? cals : [{ id: "default", name: "Calendar" }];
}

async function fetchGoogleEvents(accessToken: string, timeMin: string, timeMax: string, calendarIds: string[]) {
  const allEvents: any[] = [];
  // If no specific calendar IDs, fetch calendar list
  let calendars: CalInfo[];
  if (calendarIds.length === 0) {
    calendars = await listGoogleCalendars(accessToken);
  } else {
    // We need names too – fetch the list and filter
    const allCals = await listGoogleCalendars(accessToken);
    calendars = calendarIds.map(id => {
      const found = allCals.find(c => c.id === id);
      return found || { id, name: id };
    });
  }

  for (const cal of calendars) {
    try {
      const params = new URLSearchParams({
        timeMin, timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) { console.warn(`Google calendar ${cal.id} returned ${res.status}, skipping`); continue; }
      const data = await res.json();
      for (const e of (data.items || [])) {
        allEvents.push({
          externalId: `${cal.id}::${e.id}`,
          summary: e.summary || "(No title)",
          startAt: e.start?.dateTime || e.start?.date,
          endAt: e.end?.dateTime || e.end?.date,
          sourceCalendarId: cal.id,
          sourceCalendarName: cal.name,
        });
      }
    } catch (err) {
      console.warn(`Error fetching calendar ${cal.id}:`, err);
    }
  }
  return allEvents;
}

async function fetchOutlookEvents(accessToken: string, timeMin: string, timeMax: string, calendarIds: string[]) {
  // If specific calendars, fetch per-calendar; otherwise fetch calendarView (all)
  if (calendarIds.length > 0) {
    const allEvents: any[] = [];
    const allCals = await listOutlookCalendars(accessToken);
    for (const calId of calendarIds) {
      try {
        const calInfo = allCals.find(c => c.id === calId) || { id: calId, name: calId };
        const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calId)}/calendarView?startDateTime=${encodeURIComponent(timeMin)}&endDateTime=${encodeURIComponent(timeMax)}&$top=250&$select=id,subject,start,end`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) { console.warn(`Outlook calendar ${calId} returned ${res.status}`); continue; }
        const data = await res.json();
        for (const e of (data.value || [])) {
          allEvents.push({
            externalId: e.id,
            summary: e.subject || "(No title)",
            startAt: e.start?.dateTime ? new Date(e.start.dateTime + "Z").toISOString() : null,
            endAt: e.end?.dateTime ? new Date(e.end.dateTime + "Z").toISOString() : null,
            sourceCalendarId: calId,
            sourceCalendarName: calInfo.name,
          });
        }
      } catch (err) {
        console.warn(`Outlook cal ${calId} error:`, err);
      }
    }
    return allEvents;
  }

  // Fallback: fetch all
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${encodeURIComponent(timeMin)}&endDateTime=${encodeURIComponent(timeMax)}&$top=250&$select=id,subject,start,end`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Microsoft Graph error: ${res.status}`);
  const data = await res.json();
  return (data.value || []).map((e: any) => ({
    externalId: e.id,
    summary: e.subject || "(No title)",
    startAt: e.start?.dateTime ? new Date(e.start.dateTime + "Z").toISOString() : null,
    endAt: e.end?.dateTime ? new Date(e.end.dateTime + "Z").toISOString() : null,
  }));
}

async function pushEventToGoogle(accessToken: string, event: { summary: string; start: string; end: string; description?: string }) {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: event.summary, description: event.description,
      start: { dateTime: event.start }, end: { dateTime: event.end },
    }),
  });
  if (!res.ok) throw new Error(`Google push error: ${res.status}`);
  return res.json();
}

async function pushEventToOutlook(accessToken: string, event: { summary: string; start: string; end: string; description?: string }) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: event.summary,
      body: { contentType: "text", content: event.description || "" },
      start: { dateTime: event.start, timeZone: "UTC" },
      end: { dateTime: event.end, timeZone: "UTC" },
    }),
  });
  if (!res.ok) throw new Error(`Outlook push error: ${res.status}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action;

    // ── List available subcalendars for a connection ──
    if (action === "list-calendars") {
      const { connectionId } = body;
      const { data: conn } = await supabase
        .from("calendar_connections")
        .select("*")
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!conn) {
        return new Response(JSON.stringify({ error: "Connection not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidToken(supabase, conn);
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Token expired, please reconnect" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let calendars: CalInfo[];
      if (conn.provider === "google") {
        calendars = await listGoogleCalendars(accessToken);
      } else {
        calendars = await listOutlookCalendars(accessToken);
      }

      // Fetch existing preferences for this connection
      const { data: prefs } = await supabase
        .from("calendar_subcalendar_preferences")
        .select("source_calendar_id, is_enabled")
        .eq("user_id", user.id)
        .eq("connection_id", connectionId);

      const prefsMap = new Map((prefs || []).map((p: any) => [p.source_calendar_id, p.is_enabled]));

      // Merge: calendars that have no preference row are considered enabled by default
      const result = calendars.map(c => ({
        id: c.id,
        name: c.name,
        isEnabled: prefsMap.has(c.id) ? prefsMap.get(c.id) : true,
      }));

      // Upsert all discovered calendars into preferences (so they're persisted)
      for (const cal of calendars) {
        if (!prefsMap.has(cal.id)) {
          await supabase.from("calendar_subcalendar_preferences").upsert({
            user_id: user.id,
            connection_id: connectionId,
            source_calendar_id: cal.id,
            source_calendar_name: cal.name,
            is_enabled: true,
          }, { onConflict: "user_id,connection_id,source_calendar_id" });
        }
      }

      return new Response(JSON.stringify({ calendars: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Pull: Sync external events into busy_events cache ──
    if (action === "pull") {
      const { data: connections } = await supabase
        .from("calendar_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("sync_enabled", true);

      if (!connections || connections.length === 0) {
        return new Response(JSON.stringify({ synced: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      let totalSynced = 0;

      for (const conn of connections) {
        try {
          const accessToken = await getValidToken(supabase, conn);
          if (!accessToken) {
            await supabase.from("calendar_connections").update({
              sync_error: "Token expired and could not be refreshed. Please reconnect.",
            }).eq("id", conn.id);
            continue;
          }

          // Get enabled subcalendars for this connection
          const { data: prefs } = await supabase
            .from("calendar_subcalendar_preferences")
            .select("source_calendar_id, is_enabled")
            .eq("user_id", user.id)
            .eq("connection_id", conn.id);

          // Build list of enabled calendar IDs; if no prefs exist, sync all
          const hasPrefs = prefs && prefs.length > 0;
          const enabledCalIds = hasPrefs
            ? prefs.filter((p: any) => p.is_enabled).map((p: any) => p.source_calendar_id)
            : []; // empty = all calendars

          // If prefs exist but ALL are disabled, skip this connection
          if (hasPrefs && enabledCalIds.length === 0) {
            await supabase.from("calendar_busy_events").delete().eq("connection_id", conn.id);
            await supabase.from("calendar_connections").update({
              last_synced_at: new Date().toISOString(), sync_error: null,
            }).eq("id", conn.id);
            continue;
          }

          let events: any[];
          if (conn.provider === "google") {
            events = await fetchGoogleEvents(accessToken, timeMin, timeMax, enabledCalIds);
          } else {
            events = await fetchOutlookEvents(accessToken, timeMin, timeMax, enabledCalIds);
          }

          // Clear old events for this connection and re-insert
          await supabase.from("calendar_busy_events").delete().eq("connection_id", conn.id);

          if (events.length > 0) {
            const rows = events
              .filter((e: any) => e.startAt && e.endAt)
              .map((e: any) => ({
                user_id: user.id,
                connection_id: conn.id,
                external_event_id: e.externalId,
                summary: (e.summary || "").slice(0, 200),
                start_at: e.startAt,
                end_at: e.endAt,
                source_calendar_id: e.sourceCalendarId || null,
                source_calendar_name: (e.sourceCalendarName || "").slice(0, 200) || null,
              }));
            if (rows.length > 0) {
              await supabase.from("calendar_busy_events").insert(rows);
            }
            totalSynced += rows.length;
          }

          await supabase.from("calendar_connections").update({
            last_synced_at: new Date().toISOString(), sync_error: null,
          }).eq("id", conn.id);
        } catch (err) {
          console.error(`Sync error for ${conn.provider}:`, err);
          await supabase.from("calendar_connections").update({
            sync_error: err.message || "Unknown sync error",
          }).eq("id", conn.id);
        }
      }

      return new Response(JSON.stringify({ synced: totalSynced }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Push: Create event in external calendar ──
    if (action === "push") {
      const { provider, summary, start, end, description } = body;
      const { data: conn } = await supabase
        .from("calendar_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .eq("sync_enabled", true)
        .maybeSingle();

      if (!conn) {
        return new Response(JSON.stringify({ error: "No active connection for provider" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidToken(supabase, conn);
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Token expired, please reconnect" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let result;
      if (provider === "google") {
        result = await pushEventToGoogle(accessToken, { summary, start, end, description });
      } else {
        result = await pushEventToOutlook(accessToken, { summary, start, end, description });
      }

      return new Response(JSON.stringify({ success: true, event: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[calendar-sync] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
