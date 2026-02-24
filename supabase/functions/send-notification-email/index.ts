import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Notification types that should trigger an email
const EMAIL_WORTHY_TYPES = new Set([
  // Social / follow
  "FOLLOWER_NEW",
  // Mentions & comments
  "ENTITY_MENTIONED_IN_COMMENT",
  "COMMENT",
  "QUEST_COMMENT",
  "POST_UPVOTED",
  // Bookings
  "BOOKING_REQUESTED",
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "BOOKING_UPDATED",
  // Membership & roles
  "GUILD_MEMBER_ADDED",
  "GUILD_ROLE_CHANGED",
  "APPLICATION_APPROVED",
  "APPLICATION_REJECTED",
  "ENTITY_JOIN_REQUEST",
  // Invitations & partnerships
  "USER_INVITED_TO_UNIT",
  "PARTNERSHIP_PROPOSED",
  // Quests
  "QUEST_PROPOSAL_SUBMITTED",
  "QUEST_PROPOSAL_ACCEPTED",
  "QUEST_PROPOSAL_REJECTED",
  "QUEST_FUNDED_CREDITS",
  // Rewards & economy
  "ACHIEVEMENT_UNLOCKED",
  "XP_GAINED",
  "CREDIT_RECEIVED",
  "milestone_completed",
  // Trust
  "TRUST_RENEWAL_DUE",
  "TRUST_EDGE_OUTDATED",
  // Followed entities activity
  "FOLLOWED_USER_NEW_POST",
  "FOLLOWED_ENTITY_NEW_POST",
  "FOLLOWED_ENTITY_NEW_EVENT",
  "FOLLOWED_ENTITY_NEW_QUEST",
  "FOLLOWED_ENTITY_NEW_SERVICE",
  "FOLLOWED_ENTITY_NEW_COURSE",
]);

// Map notification type to existing preference column
function prefKeyForType(type: string): string | null {
  if (["QUEST_COMMENT", "COMMENT", "POST_UPVOTED"].includes(type)) return "notify_comments_and_upvotes";
  if (["ENTITY_MENTIONED_IN_COMMENT"].includes(type)) return "notify_mentions";
  if (["FOLLOWER_NEW"].includes(type)) return "notify_follower_activity";
  if (["FOLLOWED_USER_NEW_POST", "FOLLOWED_ENTITY_NEW_POST"].includes(type)) return "notify_new_posts_from_followed";
  if (["FOLLOWED_ENTITY_NEW_EVENT"].includes(type)) return "notify_new_events_from_followed";
  if (["FOLLOWED_ENTITY_NEW_QUEST"].includes(type)) return "notify_new_quests_from_followed";
  if (["FOLLOWED_ENTITY_NEW_SERVICE"].includes(type)) return "notify_new_services_from_followed";
  if (["FOLLOWED_ENTITY_NEW_COURSE"].includes(type)) return "notify_new_courses_from_followed";
  if (["BOOKING_REQUESTED", "BOOKING_CONFIRMED", "BOOKING_CANCELLED", "BOOKING_UPDATED"].includes(type)) return "notify_bookings_and_cancellations";
  if (["GUILD_MEMBER_ADDED", "GUILD_ROLE_CHANGED", "APPLICATION_APPROVED", "APPLICATION_REJECTED", "USER_INVITED_TO_UNIT"].includes(type)) return "notify_invitations_to_units";
  if (["ENTITY_JOIN_REQUEST"].includes(type)) return "notify_new_join_requests_guilds";
  if (["PARTNERSHIP_PROPOSED"].includes(type)) return "notify_new_partnership_requests";
  if (["QUEST_PROPOSAL_SUBMITTED", "QUEST_PROPOSAL_ACCEPTED", "QUEST_PROPOSAL_REJECTED", "QUEST_FUNDED_CREDITS"].includes(type)) return "notify_quest_updates_and_comments";
  if (["ACHIEVEMENT_UNLOCKED", "XP_GAINED", "CREDIT_RECEIVED", "milestone_completed"].includes(type)) return "notify_xp_and_achievements";
  if (["TRUST_RENEWAL_DUE", "TRUST_EDGE_OUTDATED"].includes(type)) return null; // always send — important
  return null;
}

const BASE_URL = "https://changethegame.xyz";

async function sendEmailViaResend(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "changethegame <hello@changethegame.xyz>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend error [${res.status}]: ${body}`);
    return false;
  }

  const data = await res.json();
  console.log(`✅ Email sent to ${to} (id: ${data.id})`);
  return true;
}

function buildNotificationEmail(notification: any, recipientName: string): { subject: string; html: string } {
  const title = notification.title || "New notification";
  const body = notification.body || "";
  const deepLink = notification.deep_link_url
    ? `${BASE_URL}${notification.deep_link_url}`
    : BASE_URL;

  // Type-specific subject & CTA
  let subject = title;
  let ctaLabel = "View on changethegame";
  let extraHtml = "";

  const type = notification.type;
  if (type === "FOLLOWER_NEW") {
    subject = `Someone new is following you!`;
    ctaLabel = "See who";
  } else if (type === "ENTITY_MENTIONED_IN_COMMENT") {
    subject = `You were mentioned in a comment`;
    ctaLabel = "View comment";
  } else if (type === "COMMENT" || type === "QUEST_COMMENT") {
    subject = `New comment on your content`;
    ctaLabel = "View comment";
  } else if (type === "POST_UPVOTED") {
    subject = `Someone appreciated your post`;
    ctaLabel = "View post";
  } else if (type === "BOOKING_REQUESTED") {
    subject = `New session request`;
    ctaLabel = "Review request";
  } else if (type === "BOOKING_CONFIRMED") {
    subject = `Your session is confirmed ✅`;
    ctaLabel = "View booking";
  } else if (type === "APPLICATION_APPROVED") {
    subject = `Your application was approved! 🎉`;
    ctaLabel = "Get started";
  } else if (type === "ACHIEVEMENT_UNLOCKED") {
    subject = `Achievement unlocked! 🏆`;
    ctaLabel = "See your achievement";
  } else if (type === "QUEST_PROPOSAL_ACCEPTED") {
    subject = `Your proposal was accepted!`;
    ctaLabel = "View quest";
  } else if (type === "USER_INVITED_TO_UNIT") {
    subject = `You've been invited to join a team`;
    ctaLabel = "View invitation";
  } else if (type === "FOLLOWED_USER_NEW_POST" || type === "FOLLOWED_ENTITY_NEW_POST") {
    subject = `New post from someone you follow`;
    ctaLabel = "Read post";
  } else if (type === "FOLLOWED_ENTITY_NEW_EVENT") {
    subject = `New event from a community you follow`;
    ctaLabel = "View event";
  } else if (type === "FOLLOWED_ENTITY_NEW_QUEST") {
    subject = `New quest from a community you follow`;
    ctaLabel = "View quest";
  } else if (type === "CREDIT_RECEIVED") {
    subject = `You received credits! 💰`;
    ctaLabel = "View your wallet";
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f5f4fb;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:hsl(262,83%,58%);border-radius:12px 12px 0 0;padding:20px 28px;">
      <span style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.85);">changethegame</span>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border:1px solid hsl(250,18%,90%);border-top:none;border-radius:0 0 12px 12px;padding:32px 28px;">
      <h2 style="font-size:20px;font-weight:600;color:hsl(250,30%,8%);margin:0 0 8px;">Hey ${recipientName},</h2>
      <p style="font-size:16px;font-weight:600;color:hsl(250,30%,8%);line-height:1.5;margin:16px 0 8px;">${title}</p>
      ${body ? `<p style="font-size:15px;line-height:1.6;color:hsl(250,12%,46%);margin:0 0 20px;">${body}</p>` : ""}
      ${extraHtml}

      <div style="margin-top:28px;">
        <a href="${deepLink}"
           style="display:inline-block;background:hsl(262,83%,58%);color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          ${ctaLabel}
        </a>
      </div>

      <hr style="border:none;border-top:1px solid hsl(250,18%,90%);margin:32px 0 20px;" />
      <p style="font-size:12px;color:hsl(250,12%,46%);line-height:1.6;margin:0;">
        You're receiving this because email notifications are enabled.
        <a href="${BASE_URL}/me?tab=notifications" style="color:hsl(262,83%,58%);text-decoration:underline;">Manage preferences</a>
      </p>
    </div>

    <p style="text-align:center;font-size:11px;color:hsl(250,12%,46%);margin-top:16px;">
      © 2025 changethegame · <a href="${BASE_URL}" style="color:hsl(250,12%,46%);">changethegame.xyz</a>
    </p>
  </div>
</body>
</html>`;

  return { subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { notification_id } = await req.json();

    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch the notification
    const { data: notification, error: nErr } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .single();

    if (nErr || !notification) {
      return new Response(JSON.stringify({ error: "Notification not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if this type deserves an email
    if (!EMAIL_WORTHY_TYPES.has(notification.type)) {
      return new Response(JSON.stringify({ skipped: true, reason: "type_not_emailable" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = notification.user_id;

    // Check user preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Respect global email toggle
    if (prefs && prefs.channel_email_enabled === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "email_disabled" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check type-specific preference
    const prefKey = prefKeyForType(notification.type);
    if (prefKey && prefs && prefs[prefKey] === false) {
      return new Response(JSON.stringify({ skipped: true, reason: `pref_${prefKey}_disabled` }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("user_id", userId)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_email" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { subject, html } = buildNotificationEmail(notification, profile.name || "there");
    const sent = await sendEmailViaResend(profile.email, subject, html);

    return new Response(
      JSON.stringify({ success: true, sent }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Notification email failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
