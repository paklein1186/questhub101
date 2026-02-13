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

    const { messageId, conversationId, senderId, content } = await req.json();

    if (!messageId || !conversationId || !senderId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
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

    const senderName = senderProfile?.name || "Someone";

    // For each recipient, check their preferences and send notification
    const recipientIds = participants.map((p) => p.user_id);
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, notify_direct_messages_email, channel_email_enabled")
      .in("user_id", recipientIds);

    const notificationResults = [];

    for (const pref of prefs ?? []) {
      try {
        // Create in-app notification
        await supabase.from("notifications").insert({
          user_id: pref.user_id,
          type: "DIRECT_MESSAGE",
          title: conv.is_group ? `New message in ${conv.title}` : `New message from ${senderName}`,
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
        if (pref.notify_direct_messages_email && pref.channel_email_enabled) {
          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("user_id", pref.user_id)
            .single();

          if (recipientProfile?.email) {
            const subject = conv.is_group
              ? `New message in ${conv.title}`
              : `New message from ${senderName}`;

            const emailHtml = buildDMEmailHtml({
              recipientName: recipientProfile.name,
              senderName,
              conversationTitle: conv.title || `Chat with ${senderName}`,
              messagePreview: content.length > 150 ? content.slice(0, 147) + "..." : content,
              deepLink: `https://changethegame.com/inbox?conv=${conversationId}`,
            });

            // Log email (actual sending would use Resend/Mailgun/etc.)
            console.log(`📧 [DM email] To: ${recipientProfile.email} | Subject: ${subject}`);
            console.log(`📧 [DM email] Preview:`, emailHtml.slice(0, 200));
          }
        }

        notificationResults.push({ userId: pref.user_id, status: "sent" });
      } catch (err: any) {
        console.error(`Failed to notify ${pref.user_id}:`, err.message);
        notificationResults.push({ userId: pref.user_id, status: "error", error: err.message });
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
