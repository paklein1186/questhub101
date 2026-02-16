import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    // Get the calling user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, conversationId, action } = await req.json();

    // Fetch user profile for context
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, bio, headline, avatar_url")
      .eq("user_id", user.id)
      .single();

    const { count: topicCount } = await supabase
      .from("user_topics")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: territoryCount } = await supabase
      .from("user_territories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Detect if user is sharing a LinkedIn URL
    const linkedinMatch = message?.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    const isLinkedIn = !!linkedinMatch;

    // If LinkedIn URL detected, try to scrape it
    let linkedinContext = "";
    if (isLinkedIn) {
      const linkedinUrl = message.match(/https?:\/\/[^\s]+linkedin[^\s]+/i)?.[0] 
        || `https://www.${linkedinMatch[0]}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(linkedinUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "ChangeTheGame-Bot/1.0" },
          redirect: "follow",
        });
        clearTimeout(timeout);
        if (res.ok) {
          const html = await res.text();
          const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 6000);
          linkedinContext = `\n\nLINKEDIN PAGE CONTENT (scraped):\n${text}`;
        }
      } catch {
        linkedinContext = "\n\n(LinkedIn URL was provided but scraping failed — infer from URL structure.)";
      }
    }

    // Fetch conversation history for context
    let conversationHistory: { role: string; content: string }[] = [];
    if (conversationId) {
      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("content, sender_label, sender_id, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(20);

      if (msgs) {
        conversationHistory = msgs.map((m) => ({
          role: m.sender_label === "Pulse 🌱" ? "assistant" : "user",
          content: m.content,
        }));
      }
    }

    const systemPrompt = `You are **Pulse 🌱**, the Living Guide of the Changethegame ecosystem — a regenerative collaboration platform.

CURRENT USER PROFILE:
- Name: ${profile?.name || "(not set)"}
- Bio: ${profile?.bio || "(not set)"}
- Headline: ${profile?.headline || "(not set)"}
- Avatar: ${profile?.avatar_url ? "✅ set" : "❌ missing"}
- Topics: ${(topicCount || 0) > 0 ? `${topicCount} selected` : "❌ none"}
- Territories: ${(territoryCount || 0) > 0 ? `${territoryCount} selected` : "❌ none"}

YOUR ROLE:
1. Help the user build a compelling profile by analyzing their LinkedIn, resume, or self-description.
2. Be warm, encouraging, and regenerative in tone — like a gardener helping something grow.
3. When you have enough info, produce structured suggestions using the tool.
4. Always ask permission before making changes. Present suggestions as editable cards.
5. If the user shares a LinkedIn URL or text about themselves, analyze it and provide enrichment suggestions.
6. You can suggest Quests (projects) the user might create based on their background.
7. Keep messages concise — this is a chat, not an essay.${linkedinContext}`;

    // Build messages
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-15), // last 15 messages for context
    ];

    // If user sent a new message, add it
    if (message && !conversationHistory.find(m => m.content === message && m.role === "user")) {
      aiMessages.push({ role: "user", content: message });
    }

    const aiBody: any = {
      model: "google/gemini-2.5-flash",
      messages: aiMessages,
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_profile_enrichment",
            description: "Suggest profile improvements based on analyzed content. Use this when you have enough information to suggest bio, headline, topics, territories, or quests.",
            parameters: {
              type: "object",
              properties: {
                bioVariants: {
                  type: "object",
                  properties: {
                    short: { type: "string", description: "2-3 sentence bio" },
                    medium: { type: "string", description: "Full paragraph bio" },
                    narrative: { type: "string", description: "Storytelling version" },
                  },
                  required: ["short", "medium", "narrative"],
                },
                headline: { type: "string", description: "Short profile tagline" },
                suggestedTopics: { type: "array", items: { type: "string" }, description: "Platform topics to join" },
                suggestedTerritories: { type: "array", items: { type: "string" }, description: "Geographic territories" },
                suggestedQuests: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      type: { type: "string", enum: ["completed", "open"] },
                    },
                    required: ["title", "description", "type"],
                  },
                  description: "Quest suggestions based on background",
                },
                skills: { type: "array", items: { type: "string" } },
                detectedOrganizations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      role: { type: "string" },
                      type: { type: "string" },
                      isCurrent: { type: "boolean" },
                    },
                    required: ["name", "role", "type", "isCurrent"],
                  },
                },
              },
              required: ["bioVariants", "headline", "suggestedTopics"],
              additionalProperties: false,
            },
          },
        },
      ],
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await aiRes.text();
      console.error("AI error:", status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();
    const choice = aiData.choices?.[0]?.message;

    let responseText = choice?.content || "";
    let enrichmentData: any = null;

    // Check for tool calls (structured enrichment suggestions)
    if (choice?.tool_calls?.length) {
      const toolCall = choice.tool_calls[0];
      if (toolCall.function?.name === "suggest_profile_enrichment") {
        try {
          enrichmentData = JSON.parse(toolCall.function.arguments);
        } catch {
          console.error("Failed to parse tool call arguments");
        }
      }
    }

    // If we have enrichment data but no text, generate a companion message
    if (enrichmentData && !responseText) {
      responseText = "✨ I've analyzed your profile and have some suggestions! Check out the cards below — you can accept, edit, or skip any of them.";
    }

    // Save Pulse's reply to the conversation
    if (conversationId && responseText) {
      await supabase.from("direct_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: responseText,
        sender_label: "Pulse 🌱",
      });

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    return new Response(JSON.stringify({
      message: responseText,
      enrichment: enrichmentData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pulse-bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
