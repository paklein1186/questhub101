import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendEmailViaResend({ to, subject, html }: { to: string; subject: string; html: string }) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return { sent: false, reason: "no_api_key" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Mirror from changethegame <hello@changethegame.xyz>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend error [${res.status}]: ${body}`);
    return { sent: false, reason: body };
  }

  const data = await res.json();
  console.log(`✅ Email sent to ${to} (id: ${data.id})`);
  return { sent: true, id: data.id };
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

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { messageId, conversationId, senderId, content, senderLabel } = await req.json();

    if (!messageId || !conversationId || !senderId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify sender matches authenticated user
    if (senderId !== user.id) {
      return new Response(JSON.stringify({ error: "Sender mismatch" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify the caller is a participant in the conversation OR is the message sender
    // (broadcast creates conversations where the sender isn't always a participant)
    const { data: participation } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (!participation && senderId !== user.id) {
      return new Response(JSON.stringify({ error: "Not a participant" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get conversation details
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, is_group, title")
      .eq("id", conversationId)
      .single();

    if (!conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get all participants in conversation except sender
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId);

    if (!participants?.length) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get sender info
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", senderId)
      .single();

    const senderName = senderLabel || senderProfile?.name || "Someone";

    // For each recipient, check their preferences and send notification + email
    const recipientIds = participants.map((p: any) => p.user_id);
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, notify_direct_messages_email, channel_email_enabled")
      .in("user_id", recipientIds);

    // Also notify recipients who have no preferences row yet (default: enabled)
    const prefsMap = new Map((prefs ?? []).map((p: any) => [p.user_id, p]));
    const allRecipients = recipientIds.map((uid: string) => {
      const pref = prefsMap.get(uid);
      return {
        user_id: uid,
        notify_direct_messages_email: pref?.notify_direct_messages_email ?? true,
        channel_email_enabled: pref?.channel_email_enabled ?? true,
      };
    });

    const notificationResults = [];

    for (const recipient of allRecipients) {
      try {
        // Create in-app notification
        await supabase.from("notifications").insert({
          user_id: recipient.user_id,
          type: "DIRECT_MESSAGE",
          title: conv.is_group ? `New message in ${conv.title || "group"}` : `New message from ${senderName}`,
          body: content.length > 100 ? content.slice(0, 97) + "..." : content,
          deep_link_url: `/inbox?conv=${conversationId}`,
          is_read: false,
          metadata: {
            conversation_id: conversationId,
            sender_id: senderId,
            sender_name: senderName,
          },
        });

        // Send email if enabled
        if (recipient.notify_direct_messages_email && recipient.channel_email_enabled) {
          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("user_id", recipient.user_id)
            .single();

          if (recipientProfile?.email) {
            const subject = conv.is_group
              ? `New message in ${conv.title || "group chat"}`
              : `New message from ${senderName}`;

            const emailHtml = buildDMEmailHtml({
              recipientName: recipientProfile.name || "there",
              senderName,
              conversationTitle: conv.title || `Chat with ${senderName}`,
              messagePreview: content.length > 150 ? content.slice(0, 147) + "..." : content,
              deepLink: `https://questhub101.lovable.app/inbox?conv=${conversationId}`,
            });

            const emailResult = await sendEmailViaResend({
              to: recipientProfile.email,
              subject,
              html: emailHtml,
            });

            notificationResults.push({ userId: recipient.user_id, status: "sent", email: emailResult.sent });
          } else {
            notificationResults.push({ userId: recipient.user_id, status: "sent", email: false });
          }
        } else {
          notificationResults.push({ userId: recipient.user_id, status: "sent", email: false });
        }
      } catch (err: any) {
        console.error(`Failed to notify ${recipient.user_id}:`, err.message);
        notificationResults.push({ userId: recipient.user_id, status: "error", error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified: notificationResults.filter((r) => r.status === "sent").length,
        results: notificationResults,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err: any) {
    console.error("DM notification failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

function buildDMEmailHtml(data: {
  recipientName: string;
  senderName: string;
  conversationTitle: string;
  messagePreview: string;
  deepLink: string;
}): string {
  return `
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #2d2d2d;">
  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #8b7355; margin-bottom: 24px;">changethegame</p>
  
  <h2 style="font-size: 22px; font-weight: normal; margin-bottom: 16px;">Hey ${data.recipientName},</h2>
  
  <p style="line-height: 1.6; margin-bottom: 20px;">You've got a new message in <strong>${data.conversationTitle}</strong> from <strong>${data.senderName}</strong>:</p>
  
  <div style="margin: 24px 0; padding: 16px; background: #f9f6f0; border-left: 3px solid #c4a97d; border-radius: 4px;">
    <p style="margin: 0; font-style: italic; color: #555;">"${data.messagePreview}"</p>
  </div>
  
  <p style="margin: 24px 0;">
    <a href="${data.deepLink}" style="display: inline-block; padding: 12px 24px; background: #7c5c3e; color: white; text-decoration: none; border-radius: 4px; font-weight: 600;">View conversation</a>
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5ddd0; margin: 32px 0 16px;" />
  <p style="font-size: 13px; color: #8b7355;">You're receiving this because direct message notifications are enabled. You can disable them in your settings.</p>
</div>`;
}
