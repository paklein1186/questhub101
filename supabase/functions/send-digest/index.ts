import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Get users who have daily digest enabled (in-app or email)
    const { data: prefs, error: prefsErr } = await supabase
      .from("notification_preferences")
      .select("user_id, notify_daily_digest_in_app, notify_daily_digest_email, channel_email_enabled")
      .or("notify_daily_digest_in_app.eq.true,notify_daily_digest_email.eq.true");

    if (prefsErr) throw prefsErr;
    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, type: digestType, usersProcessed: 0, message: "No users with digest enabled" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: { userId: string; inApp: boolean; email: boolean; itemCount: number }[] = [];

    for (const pref of prefs) {
      const userId = pref.user_id;

      // 2. Get this user's follows
      const { data: follows } = await supabase
        .from("follows")
        .select("target_type, target_id")
        .eq("follower_id", userId);

      if (!follows || follows.length === 0) continue;

      // 3. Build OR clause to find recent posts from followed entities
      const orClauses = follows
        .map(
          (f: any) =>
            `and(context_type.eq.${f.target_type},context_id.eq.${f.target_id})`
        )
        .join(",");

      const { data: posts } = await supabase
        .from("feed_posts")
        .select("id, content, context_type, context_id, author_user_id, created_at")
        .eq("is_deleted", false)
        .or(orClauses)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10);

      const itemCount = posts?.length ?? 0;
      if (itemCount === 0) continue;

      // 4. Create in-app notification if enabled
      if (pref.notify_daily_digest_in_app) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "DAILY_NETWORK_DIGEST",
          title: "Your daily network digest",
          body: `You have ${itemCount} new update${itemCount > 1 ? "s" : ""} from your network today.`,
          deep_link_url: "/network?tab=following",
          is_read: false,
        });
      }

      // 5. Log email intent (actual email sending would use Resend/etc.)
      if (pref.notify_daily_digest_email && pref.channel_email_enabled) {
        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("user_id", userId)
          .single();

        if (profile?.email) {
          console.log(
            `[daily digest email] Would send to ${profile.email}: ${itemCount} items`
          );
        }
      }

      results.push({
        userId,
        inApp: pref.notify_daily_digest_in_app,
        email: pref.notify_daily_digest_email && pref.channel_email_enabled,
        itemCount,
      });
    }

    console.log(
      `${digestType} digest completed at`,
      new Date().toISOString(),
      `— ${results.length} users notified`
    );

    return new Response(
      JSON.stringify({
        success: true,
        type: digestType,
        usersProcessed: results.length,
        results,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Digest failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
