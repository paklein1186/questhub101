import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PULSE_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001"; // sentinel

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Support single-user nudge (for testing) or batch
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body?.userId || null;
    } catch { /* no body = batch mode */ }

    let eligibleUsers: any[] = [];

    if (targetUserId) {
      // Single user mode (for testing)
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email, bio, headline, avatar_url")
        .eq("user_id", targetUserId)
        .single();
      if (data) eligibleUsers = [data];
    } else {
      // Batch mode: 48h+ old, not yet nudged
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email, bio, headline, avatar_url")
        .lt("created_at", cutoff)
        .eq("pulse_nudge_sent", false);
      if (error) throw error;
      eligibleUsers = data || [];
    }

    if (eligibleUsers.length === 0) {
      return new Response(JSON.stringify({ message: "No users to nudge", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let nudgedCount = 0;

    for (const user of eligibleUsers) {
      // Calculate completeness
      let completeness = 0;
      if (user.name) completeness += 20;
      if (user.bio) completeness += 25;
      if (user.headline) completeness += 15;
      if (user.avatar_url) completeness += 20;
      const { count: topicCount } = await supabase
        .from("user_topics")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.user_id);
      if ((topicCount || 0) > 0) completeness += 10;
      const { count: territoryCount } = await supabase
        .from("user_territories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.user_id);
      if ((territoryCount || 0) > 0) completeness += 10;

      // Skip if already complete (unless forced single user)
      if (!targetUserId && completeness >= 60) {
        await supabase.from("profiles").update({ pulse_nudge_sent: true }).eq("user_id", user.user_id);
        continue;
      }

      // Check if a Pulse conversation already exists for this user
      const { data: existingConvs } = await supabase
        .from("conversations")
        .select("id")
        .eq("sender_entity_type", "pulse_bot")
        .eq("is_group", false);

      let pulseConvId: string | null = null;
      if (existingConvs && existingConvs.length > 0) {
        // Check if user is participant in any of these
        for (const conv of existingConvs) {
          const { data: participant } = await supabase
            .from("conversation_participants")
            .select("id")
            .eq("conversation_id", conv.id)
            .eq("user_id", user.user_id)
            .maybeSingle();
          if (participant) {
            pulseConvId = conv.id;
            break;
          }
        }
      }

      if (!pulseConvId) {
        // Create the Pulse bot conversation
        const { data: conv, error: convError } = await supabase
          .from("conversations")
          .insert({
            created_by: user.user_id,
            is_group: false,
            sender_label: "Pulse 🌱",
            sender_entity_type: "pulse_bot",
            sender_entity_id: "pulse",
          })
          .select("id")
          .single();

        if (convError) {
          console.error("Error creating Pulse conversation:", convError);
          continue;
        }
        pulseConvId = conv.id;

        // Add user as participant
        await supabase.from("conversation_participants").insert({
          conversation_id: pulseConvId,
          user_id: user.user_id,
        });
      }

      // Build the greeting message
      const missing: string[] = [];
      if (!user.bio) missing.push("bio");
      if (!user.headline) missing.push("headline");
      if (!user.avatar_url) missing.push("profile picture");
      if ((topicCount || 0) === 0) missing.push("topics/houses");
      if ((territoryCount || 0) === 0) missing.push("territories");

      const greeting = `Hey ${user.name || "there"} 👋 I'm **Pulse**, your ecosystem guide.

I noticed your profile could use a little love — ${missing.length > 0 ? `you're missing: **${missing.join(", ")}**` : "let's make it shine even more"}.

Here's what I can help with:
🔗 **Share your LinkedIn URL** and I'll extract your experience, skills, and suggest a compelling bio
📝 **Paste a description** of yourself and I'll structure it for the platform
🎯 **Get suggestions** for Quests you could create based on your background

Just reply with your LinkedIn URL, a text about yourself, or ask me anything!`;

      // Send the greeting message
      await supabase.from("direct_messages").insert({
        conversation_id: pulseConvId,
        sender_id: user.user_id, // appears as the conversation sender (Pulse label)
        content: greeting,
        sender_label: "Pulse 🌱",
      });

      // Also create a notification so they see it
      await supabase.from("notifications").insert({
        user_id: user.user_id,
        type: "AI_PROFILE_ENRICHMENT",
        title: "Pulse wants to help you 🌱",
        message: `Your profile guide has a message for you.`,
        action_url: `/inbox`,
        actor_name: "Pulse",
      });

      // Mark as nudged
      if (!targetUserId) {
        await supabase.from("profiles").update({ pulse_nudge_sent: true }).eq("user_id", user.user_id);
      }

      nudgedCount++;
    }

    return new Response(JSON.stringify({ message: "Nudge cycle complete", nudgedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pulse-nudge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
