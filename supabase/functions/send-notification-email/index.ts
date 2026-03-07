import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALWAYS_EMAIL_TYPES = new Set([
  "BOOKING_REQUESTED",
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "BOOKING_UPDATED",
  "USER_INVITED_TO_UNIT",
  "APPLICATION_APPROVED",
  "APPLICATION_REJECTED",
  "TRUST_RENEWAL_DUE",
  "TRUST_EDGE_OUTDATED",
]);

const DIGEST_ONLY_TYPES = new Set([
  "ENTITY_NEW_DECISION", "ENTITY_NEW_RITUAL", "GUILD_QUEST_CREATED",
  "QUEST_UPDATE", "QUEST_CREATED", "FOLLOWED_ENTITY_NEW_POST",
  "FOLLOWED_USER_NEW_POST", "FOLLOWED_ENTITY_NEW_EVENT",
  "FOLLOWED_ENTITY_NEW_QUEST", "FOLLOWED_ENTITY_NEW_SERVICE",
  "FOLLOWED_ENTITY_NEW_COURSE", "XP_GAINED", "ACHIEVEMENT_UNLOCKED",
  "CREDIT_RECEIVED", "CONTRIBUTION_LOGGED", "FOLLOWER_NEW",
  "POST_UPVOTED", "COMMENT", "QUEST_COMMENT",
]);

function prefKeyForType(type: string): { key: string | null; alwaysSend: boolean } {
  if (["QUEST_COMMENT", "COMMENT", "POST_UPVOTED"].includes(type)) return { key: "notify_comments_and_upvotes", alwaysSend: false };
  if (["ENTITY_MENTIONED_IN_COMMENT"].includes(type)) return { key: "notify_mentions", alwaysSend: false };
  if (["FOLLOWER_NEW"].includes(type)) return { key: "notify_follower_activity", alwaysSend: false };
  if (["FOLLOWED_USER_NEW_POST", "FOLLOWED_ENTITY_NEW_POST"].includes(type)) return { key: "notify_new_posts_from_followed", alwaysSend: false };
  if (["FOLLOWED_ENTITY_NEW_EVENT"].includes(type)) return { key: "notify_new_events_from_followed", alwaysSend: false };
  if (["FOLLOWED_ENTITY_NEW_QUEST"].includes(type)) return { key: "notify_new_quests_from_followed", alwaysSend: false };
  if (["FOLLOWED_ENTITY_NEW_SERVICE"].includes(type)) return { key: "notify_new_services_from_followed", alwaysSend: false };
  if (["FOLLOWED_ENTITY_NEW_COURSE"].includes(type)) return { key: "notify_new_courses_from_followed", alwaysSend: false };
  if (["BOOKING_REQUESTED", "BOOKING_CONFIRMED", "BOOKING_CANCELLED", "BOOKING_UPDATED"].includes(type)) return { key: "notify_bookings_and_cancellations", alwaysSend: false };
  if (["GUILD_MEMBER_ADDED", "GUILD_ROLE_CHANGED", "APPLICATION_APPROVED", "APPLICATION_REJECTED", "USER_INVITED_TO_UNIT"].includes(type)) return { key: "notify_invitations_to_units", alwaysSend: false };
  if (["ENTITY_JOIN_REQUEST"].includes(type)) return { key: "notify_new_join_requests_guilds", alwaysSend: false };
  if (["PARTNERSHIP_PROPOSED"].includes(type)) return { key: "notify_new_partnership_requests", alwaysSend: false };
  if (["QUEST_PROPOSAL_SUBMITTED", "QUEST_PROPOSAL_ACCEPTED", "QUEST_PROPOSAL_REJECTED", "QUEST_FUNDED_CREDITS"].includes(type)) return { key: "notify_quest_updates_and_comments", alwaysSend: false };
  if (["ACHIEVEMENT_UNLOCKED", "XP_GAINED", "CREDIT_RECEIVED", "milestone_completed"].includes(type)) return { key: "notify_xp_and_achievements", alwaysSend: false };
  if (["TRUST_RENEWAL_DUE", "TRUST_EDGE_OUTDATED"].includes(type)) return { key: null, alwaysSend: true };
  return { key: null, alwaysSend: false };
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

function buildBookingConfirmationEmail(notification: any, recipientName: string): { subject: string; html: string } {
  const data = notification.data || {};
  const serviceTitle = data.serviceTitle || "your session";
  const startDt = data.startDateTime ? new Date(data.startDateTime) : null;
  const endDt = data.endDateTime ? new Date(data.endDateTime) : null;
  const amount = data.amount;
  const currency = data.currency || "€";
  const callUrl = data.callUrl;
  const bookingLink = `${BASE_URL}/bookings/${data.bookingId || notification.related_entity_id || ""}`;

  const dateStr = startDt
    ? startDt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;
  const timeStr = startDt
    ? `${startDt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}${endDt ? ` – ${endDt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}`
    : null;

  const detailRows: string[] = [];
  detailRows.push(`<tr><td style="padding:8px 12px;font-size:13px;color:hsl(250,12%,46%);font-weight:600;">Service</td><td style="padding:8px 12px;font-size:14px;color:hsl(250,30%,8%);font-weight:600;">${serviceTitle}</td></tr>`);
  if (dateStr) detailRows.push(`<tr><td style="padding:8px 12px;font-size:13px;color:hsl(250,12%,46%);font-weight:600;">Date</td><td style="padding:8px 12px;font-size:14px;color:hsl(250,30%,8%);">${dateStr}</td></tr>`);
  if (timeStr) detailRows.push(`<tr><td style="padding:8px 12px;font-size:13px;color:hsl(250,12%,46%);font-weight:600;">Time</td><td style="padding:8px 12px;font-size:14px;color:hsl(250,30%,8%);">${timeStr}</td></tr>`);
  if (amount && Number(amount) > 0) detailRows.push(`<tr><td style="padding:8px 12px;font-size:13px;color:hsl(250,12%,46%);font-weight:600;">Amount</td><td style="padding:8px 12px;font-size:14px;color:hsl(250,30%,8%);">${currency}${amount}</td></tr>`);

  const callButton = callUrl
    ? `<a href="${callUrl}" style="display:inline-block;background:hsl(142,71%,45%);color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-right:12px;">🎥 Join Video Call</a>`
    : "";

  const subject = `Your session "${serviceTitle}" is confirmed ✅`;

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
      <p style="font-size:16px;font-weight:600;color:hsl(142,71%,45%);line-height:1.5;margin:16px 0 8px;">✅ Your session has been accepted!</p>
      <p style="font-size:15px;line-height:1.6;color:hsl(250,12%,46%);margin:0 0 20px;">Great news — your session request has been confirmed. Here are the details:</p>

      <!-- Booking Details Table -->
      <table style="width:100%;border-collapse:collapse;background:hsl(250,30%,97%);border-radius:8px;overflow:hidden;margin-bottom:24px;">
        ${detailRows.join("")}
      </table>

      <div style="margin-top:24px;">
        ${callButton}
        <a href="${bookingLink}"
           style="display:inline-block;background:hsl(262,83%,58%);color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Booking Details
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

function buildNotificationEmail(notification: any, recipientName: string): { subject: string; html: string } {
  // Use rich template for booking confirmations
  if (notification.type === "BOOKING_CONFIRMED") {
    return buildBookingConfirmationEmail(notification, recipientName);
  }

  const title = notification.title || "New notification";
  const body = notification.body || "";
  const deepLink = notification.deep_link_url
    ? `${BASE_URL}${notification.deep_link_url}`
    : BASE_URL;

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
  } else if (type === "FOLLOWED_ENTITY_NEW_SERVICE") {
    subject = `New service available in your community`;
    ctaLabel = "View service";
  } else if (type === "FOLLOWED_ENTITY_NEW_COURSE") {
    subject = `New course available in your community`;
    ctaLabel = "View course";
  } else if (type === "CREDIT_RECEIVED") {
    subject = `You received credits! 💰`;
    ctaLabel = "View your wallet";
  } else if (type === "ENTITY_JOIN_REQUEST") {
    subject = `New membership request`;
    ctaLabel = "Review request";
  } else if (type === "PARTNERSHIP_PROPOSED") {
    subject = `New partnership proposal`;
    ctaLabel = "Review partnership";
  } else if (type === "TRUST_RENEWAL_DUE") {
    subject = `Trust renewal due 🔄`;
    ctaLabel = "Renew trust";
  } else if (type === "TRUST_EDGE_OUTDATED") {
    subject = `A trust attestation expired`;
    ctaLabel = "View details";
  } else if (type === "milestone_completed") {
    subject = `Milestone completed! 🎯`;
    ctaLabel = "See your milestone";
  } else if (type === "BOOKING_CANCELLED") {
    subject = `Your booking has been cancelled`;
    ctaLabel = "View details";
  } else if (type === "BOOKING_UPDATED") {
    subject = `Booking update`;
    ctaLabel = "View booking";
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

    let notification_id: string | null = null;
    const body = await req.json();

    // Handle direct call format: { notification_id }
    if (body.notification_id) {
      notification_id = body.notification_id;
    }
    // Handle Supabase DB webhook format: { type: "INSERT", record: { id, type, ... } }
    else if (body.type === "INSERT" && body.record?.id) {
      // Only process ALWAYS_EMAIL_TYPES immediately; skip DIGEST_ONLY
      if (!ALWAYS_EMAIL_TYPES.has(body.record.type)) {
        return new Response(JSON.stringify({ skipped: true, reason: "digest_only" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      notification_id = body.record.id;
    }

    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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

    if (DIGEST_ONLY_TYPES.has(notification.type)) {
      return new Response(JSON.stringify({ skipped: true, reason: "digest_only" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!ALWAYS_EMAIL_TYPES.has(notification.type)) {
      return new Response(JSON.stringify({ skipped: true, reason: "unmapped" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = notification.user_id;

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (prefs && prefs.channel_email_enabled === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "email_disabled" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { key: prefKey, alwaysSend } = prefKeyForType(notification.type);
    if (!alwaysSend) {
      if (!prefKey) {
        return new Response(JSON.stringify({ skipped: true, reason: "unmapped_type_no_email" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (prefs && prefs[prefKey] === false) {
        return new Response(JSON.stringify({ skipped: true, reason: `pref_${prefKey}_disabled` }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

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
