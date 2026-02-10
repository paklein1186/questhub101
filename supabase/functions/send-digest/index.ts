import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Stub: Digest emails require a user notification preferences table
// and an email provider (e.g. Resend). This function logs a placeholder
// for both daily and weekly digest schedules.

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let digestType = "daily";
    try {
      const body = await req.json();
      digestType = body?.type ?? "daily";
    } catch {
      // default to daily
    }

    // TODO: When notification_preferences table and Resend are configured:
    // 1. Query users with digest preference matching digestType
    // 2. For each user, aggregate new quests/updates in their topics/territories
    // 3. Send digest email via Resend

    console.log(`${digestType} digest ran (stub) at`, new Date().toISOString());
    return new Response(
      JSON.stringify({ success: true, stub: true, type: digestType }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Digest failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
