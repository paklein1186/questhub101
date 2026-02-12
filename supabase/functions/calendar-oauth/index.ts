import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CALENDAR_CLIENT_ID");
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CALENDAR_CLIENT_SECRET");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── Generate OAuth URL (called from frontend) ──
    if (action === "auth-url") {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const provider = url.searchParams.get("provider");
      const redirectUri = url.searchParams.get("redirect_uri") || "";

      // Encode state with user_id + provider + redirect_uri
      const state = btoa(JSON.stringify({ userId: user.id, provider, redirectUri: redirectUri }));

      if (provider === "google") {
        if (!GOOGLE_CLIENT_ID) {
          return new Response(JSON.stringify({ error: "Google Calendar not configured" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const callbackUrl = `${SUPABASE_URL}/functions/v1/calendar-oauth?action=callback`;
        const scopes = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
        return new Response(JSON.stringify({ url: authUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (provider === "outlook") {
        if (!MICROSOFT_CLIENT_ID) {
          return new Response(JSON.stringify({ error: "Microsoft Calendar not configured" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const callbackUrl = `${SUPABASE_URL}/functions/v1/calendar-oauth?action=callback`;
        const scopes = "Calendars.ReadWrite offline_access";
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${encodeURIComponent(scopes)}&response_mode=query&state=${encodeURIComponent(state)}`;
        return new Response(JSON.stringify({ url: authUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── OAuth Callback (browser redirect) ──
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");
      if (!code || !stateParam) {
        return new Response("Missing code or state", { status: 400 });
      }

      let state: { userId: string; provider: string; redirectUri: string };
      try {
        state = JSON.parse(atob(stateParam));
      } catch {
        return new Response("Invalid state", { status: 400 });
      }

      const callbackUrl = `${SUPABASE_URL}/functions/v1/calendar-oauth?action=callback`;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      let accessToken: string;
      let refreshToken: string | null = null;
      let expiresAt: string | null = null;

      if (state.provider === "google") {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            redirect_uri: callbackUrl,
            grant_type: "authorization_code",
          }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) {
          return new Response(`Google token error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
        }
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token || null;
        if (tokenData.expires_in) {
          expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        }
      } else if (state.provider === "outlook") {
        const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: MICROSOFT_CLIENT_ID!,
            client_secret: MICROSOFT_CLIENT_SECRET!,
            redirect_uri: callbackUrl,
            grant_type: "authorization_code",
            scope: "Calendars.ReadWrite offline_access",
          }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) {
          return new Response(`Microsoft token error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
        }
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token || null;
        if (tokenData.expires_in) {
          expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        }
      } else {
        return new Response("Unknown provider", { status: 400 });
      }

      // Upsert the connection
      const { error: upsertError } = await supabase
        .from("calendar_connections")
        .upsert({
          user_id: state.userId,
          provider: state.provider,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: expiresAt,
          sync_enabled: true,
          last_synced_at: null,
          sync_error: null,
        }, { onConflict: "user_id,provider" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(`Database error: ${upsertError.message}`, { status: 500 });
      }

      // Redirect user back to the app
      const redirectTo = state.redirectUri || "/me?tab=calendar";
      return new Response(null, {
        status: 302,
        headers: { Location: redirectTo },
      });
    }

    // ── Disconnect ──
    if (action === "disconnect") {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { provider } = await req.json();
      await supabase.from("calendar_busy_events").delete().eq("user_id", user.id);
      await supabase.from("calendar_connections").delete().eq("user_id", user.id).eq("provider", provider);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[calendar-oauth] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
