import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://questhub101.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, questId, questTitle, inviterName } = await req.json();

    if (!email || !questId) {
      return new Response(
        JSON.stringify({ error: "email and questId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if email already belongs to a registered user
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check profiles_public for existing user by email (via auth)
    const { data: existingUsers } = await serviceClient.rpc("get_user_id_by_email", { lookup_email: email });
    
    // If user exists, add them as participant directly
    if (existingUsers && existingUsers.length > 0) {
      const existingUserId = existingUsers[0].id;
      const { error: insertError } = await serviceClient
        .from("quest_participants")
        .insert({
          quest_id: questId,
          user_id: existingUserId,
          role: "COLLABORATOR",
          status: "ACCEPTED",
        });
      if (insertError && insertError.code !== "23505") {
        // 23505 = unique violation (already a participant)
        throw insertError;
      }
      return new Response(
        JSON.stringify({ success: true, type: "existing_user" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Record the email invite
    const { data: invite, error: inviteError } = await supabase
      .from("quest_email_invites")
      .insert({
        quest_id: questId,
        email: email.toLowerCase().trim(),
        invited_by_user_id: user.id,
      })
      .select("id, token")
      .single();

    if (inviteError) {
      if (inviteError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "This email has already been invited" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw inviteError;
    }

    // Send invite email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: true, type: "email_invite", emailSent: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const signupUrl = `${APP_URL}/signup?redirect=/quests/${questId}&ref=email-invite&token=${invite.token}`;
    const safeTitle = questTitle || "a quest";
    const safeInviter = inviterName || "Someone";

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">You're invited to join a quest!</h2>
        <p style="color: #444; line-height: 1.6;">
          <strong>${safeInviter}</strong> has invited you to collaborate on 
          <strong>"${safeTitle}"</strong> on Game Changers.
        </p>
        <a href="${signupUrl}" 
           style="display: inline-block; margin-top: 20px; padding: 12px 28px; background: #6d28d9; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Join the Quest
        </a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">
          If you already have an account, simply log in and you'll be added automatically.
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Game Changers <hello@changethegame.xyz>",
        to: [email],
        subject: `${safeInviter} invited you to join "${safeTitle}"`,
        html: emailHtml,
      }),
    });

    const emailResult = await res.json();
    const emailSent = res.ok;
    if (!emailSent) {
      console.error("Resend error:", emailResult);
    }

    return new Response(
      JSON.stringify({ success: true, type: "email_invite", emailSent }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("invite-quest-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
