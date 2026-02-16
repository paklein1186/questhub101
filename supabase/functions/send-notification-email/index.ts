import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Notification types that should trigger an email
const EMAIL_WORTHY_TYPES = new Set([
  "FOLLOWER_NEW",
  "ENTITY_MENTIONED_IN_COMMENT",
  "COMMENT",
  "QUEST_COMMENT",
  "POST_UPVOTED",
  "BOOKING_REQUESTED",
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "GUILD_MEMBER_ADDED",
  "GUILD_ROLE_CHANGED",
  "APPLICATION_APPROVED",
  "APPLICATION_REJECTED",
  "QUEST_PROPOSAL_SUBMITTED",
  "QUEST_PROPOSAL_ACCEPTED",
  "QUEST_PROPOSAL_REJECTED",
  "QUEST_FUNDED_CREDITS",
  "ACHIEVEMENT_UNLOCKED",
  "XP_GAINED",
  "USER_INVITED_TO_UNIT",
  "FOLLOWED_USER_NEW_POST",
  "FOLLOWED_ENTITY_NEW_POST",
  "FOLLOWED_ENTITY_NEW_EVENT",
  "FOLLOWED_ENTITY_NEW_QUEST",
]);

// Map notification type to existing preference column
function prefKeyForType(type: string): string | null {
  if (["QUEST_COMMENT", "COMMENT", "POST_UPVOTED"].includes(type)) return "notify_comments_and_upvotes";
  if (["ENTITY_MENTIONED_IN_COMMENT"].includes(type)) return "notify_mentions";
  if (["FOLLOWER_NEW"].includes(type)) return "notify_follower_activity";
  if (["FOLLOWED_USER_NEW_POST", "FOLLOWED_ENTITY_NEW_POST"].includes(type)) return "notify_new_posts_from_followed";
  if (["FOLLOWED_ENTITY_NEW_EVENT"].includes(type)) return "notify_new_events_from_followed";
  if (["FOLLOWED_ENTITY_NEW_QUEST"].includes(type)) return "notify_new_quests_from_followed";
  if (["BOOKING_REQUESTED", "BOOKING_CONFIRMED", "BOOKING_CANCELLED"].includes(type)) return "notify_bookings_and_cancellations";
  if (["GUILD_MEMBER_ADDED", "GUILD_ROLE_CHANGED", "APPLICATION_APPROVED", "APPLICATION_REJECTED", "USER_INVITED_TO_UNIT"].includes(type)) return "notify_invitations_to_units";
  if (["QUEST_PROPOSAL_SUBMITTED", "QUEST_PROPOSAL_ACCEPTED", "QUEST_PROPOSAL_REJECTED", "QUEST_FUNDED_CREDITS"].includes(type)) return "notify_quest_updates_and_comments";
  if (["ACHIEVEMENT_UNLOCKED", "XP_GAINED"].includes(type)) return "notify_xp_and_achievements";
  return null;
}

const BASE_URL = "https://questhub101.lovable.app";

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
  }

  const html = `
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #2d2d2d;">
  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #8b7355; margin-bottom: 24px;">changethegame</p>
  
  <h2 style="font-size: 22px; font-weight: normal; margin-bottom: 16px;">Hey ${recipientName},</h2>
  
  <p style="line-height: 1.6; margin-bottom: 8px; font-weight: 600;">${title}</p>
  ${body ? `<p style="line-height: 1.6; color: #555; margin-bottom: 20px;">${body}</p>` : ""}
  ${extraHtml}
  
  <p style="margin: 24px 0;">
    <a href="${deepLink}" style="display: inline-block; padding: 12px 24px; background: #7c5c3e; color: white; text-decoration: none; border-radius: 4px; font-weight: 600;">${ctaLabel}</a>
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5ddd0; margin: 32px 0 16px;" />
  <p style="font-size: 13px; color: #8b7355;">You're receiving this because email notifications are enabled. <a href="${BASE_URL}/settings" style="color: #8b7355;">Manage preferences</a></p>
</div>`;

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
