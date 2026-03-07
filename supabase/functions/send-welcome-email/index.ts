import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://changethegame.xyz";
const APP_NAME = "changethegame";

function wrapTemplate(body: string): string {
  return `
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #2d2d2d;">
  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #8b7355; margin-bottom: 24px;">${APP_NAME}</p>
  ${body}
  <hr style="border: none; border-top: 1px solid #e5ddd0; margin: 32px 0 16px;" />
  <p style="font-size: 13px; color: #8b7355;">You're receiving this because you're part of our learning community. Together, we grow. 🌱</p>
</div>`;
}

function buildWelcomeHtml(name: string): string {
  return wrapTemplate(`
    <h2 style="font-size: 22px; font-weight: normal; margin-bottom: 16px;">Welcome aboard, ${name}!</h2>
    <p>We're thrilled to have you join this community of changemakers, builders, and dreamers working together to regenerate our world.</p>
    <p>Here are a few things you can do to get started:</p>
    <ul style="padding-left: 20px; line-height: 1.8;">
      <li><a href="${BASE_URL}/quests" style="color: #6b5b3e;">Explore open quests</a> and find projects that resonate with you</li>
      <li><a href="${BASE_URL}/guilds" style="color: #6b5b3e;">Join a guild</a> — a community of practice in your area of passion</li>
      <li><a href="${BASE_URL}/services" style="color: #6b5b3e;">Browse services</a> offered by fellow members</li>
    </ul>
    <p>Every small step matters. We can't wait to see what you'll create. ✨</p>
  `);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if welcome email was already sent (idempotency via activity_log)
    const { data: existing } = await supabase
      .from("activity_log")
      .select("id")
      .eq("actor_user_id", userId)
      .eq("action_type", "welcome_email_sent")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    const email = profile.email;
    const name = profile.name || "there";

    if (!email) {
      throw new Error("User has no email address");
    }

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${APP_NAME} <hello@changethegame.xyz>`,
        to: [email],
        subject: `Welcome to ${APP_NAME}, ${name}! 🌿`,
        html: buildWelcomeHtml(name),
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      throw new Error(`Resend API error [${resendRes.status}]: ${JSON.stringify(resendData)}`);
    }

    // Mark welcome email as sent in activity_log
    await supabase.from("activity_log").insert({
      actor_user_id: userId,
      action_type: "welcome_email_sent",
      target_type: "USER",
      target_id: userId,
      metadata: { resend_id: resendData.id },
    });

    console.log(`✅ Welcome email sent to ${email} (Resend ID: ${resendData.id})`);

    return new Response(JSON.stringify({ success: true, resend_id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
