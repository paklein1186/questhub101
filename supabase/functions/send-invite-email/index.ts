import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENTITY_LABELS: Record<string, string> = {
  quest: "Quest",
  guild: "Guild",
  pod: "Pod",
  company: "Organization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the calling user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, inviterName, entityType, entityId, entityName, inviteUrl } =
      await req.json();

    if (!email || !entityType || !entityId || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const label = ENTITY_LABELS[entityType] || "Entity";

    // Check if this email belongs to an existing user — if so, send in-app notification instead
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      // Send in-app notification
      await supabase.from("notifications").insert({
        user_id: existingProfile.user_id,
        type: "USER_INVITED_TO_UNIT",
        title: `You've been invited to a ${label}`,
        body: `${inviterName} invited you to "${entityName}"`,
        related_entity_type: entityType.toUpperCase(),
        related_entity_id: entityId,
        deep_link_url: `/${entityType}s/${entityId}`,
      });

      return new Response(
        JSON.stringify({ ok: true, method: "notification" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send email via Resend (if API key available) or log for manual follow-up
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (resendKey) {
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">You're invited to join a ${label}!</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to join 
            <strong>"${entityName}"</strong> on Change The Game.
          </p>
          <a href="${inviteUrl}" 
             style="display: inline-block; margin-top: 16px; padding: 12px 24px; 
                    background-color: #16a34a; color: #fff; border-radius: 8px; 
                    text-decoration: none; font-weight: 600; font-size: 14px;">
            View & Join ${label}
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("INVITE_FROM_EMAIL") || "Change The Game <noreply@changethegame.xyz>",
          to: [email],
          subject: `${inviterName} invited you to "${entityName}"`,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[send-invite-email] Resend error:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to send email" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, method: "email" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // No email provider configured — store as pending invite
    console.log(
      `[send-invite-email] No RESEND_API_KEY — logging invite: ${email} → ${entityType}/${entityId}`
    );

    // Store pending invite for future reference
    await supabase.from("activity_log").insert({
      actor_user_id: user.id,
      action_type: "INVITE_EMAIL_SENT",
      target_type: entityType,
      target_id: entityId,
      target_name: entityName,
      metadata: { email, inviter_name: inviterName, invite_url: inviteUrl },
    });

    return new Response(
      JSON.stringify({ ok: true, method: "logged" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[send-invite-email] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
