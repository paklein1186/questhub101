import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // --- Auth check ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return unauthorizedResponse();
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !userData.user) return unauthorizedResponse();
  // --- End auth check ---

  try {
    const { entityType, entityId, action, inputText } = await req.json();

    if (!entityType || !entityId || !action) {
      return new Response(JSON.stringify({ error: "entityType, entityId, and action are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Fetch entity context
    const entityTable = entityType === "GUILD" ? "guilds" : "pods";
    const entityRes = await fetch(`${supabaseUrl}/rest/v1/${entityTable}?id=eq.${entityId}&select=id,name,description`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    const [entity] = await entityRes.json();

    // Fetch recent chat messages
    const threadRes = await fetch(`${supabaseUrl}/rest/v1/unit_chat_threads?entity_type=eq.${entityType}&entity_id=eq.${entityId}&select=id`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    const threads = await threadRes.json();
    let recentMessages: any[] = [];
    if (threads.length > 0) {
      const msgRes = await fetch(`${supabaseUrl}/rest/v1/unit_chat_messages?thread_id=eq.${threads[0].id}&select=sender_type,message_text,created_at&order=created_at.desc&limit=50`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      recentMessages = (await msgRes.json()).reverse();
    }

    // Fetch members
    const memberTable = entityType === "GUILD" ? "guild_members" : "pod_members";
    const memberFk = entityType === "GUILD" ? "guild_id" : "pod_id";
    const membersRes = await fetch(`${supabaseUrl}/rest/v1/${memberTable}?${memberFk}=eq.${entityId}&select=user_id,role`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    const members = await membersRes.json();

    // Fetch member profiles
    let memberProfiles: any[] = [];
    if (members.length > 0) {
      const userIds = members.map((m: any) => m.user_id);
      const profilesRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=in.(${userIds.join(",")})&select=user_id,name,headline,persona_type,xp_level`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      memberProfiles = await profilesRes.json();
    }

    const memberSummary = members.map((m: any) => {
      const p = memberProfiles.find((pr: any) => pr.user_id === m.user_id);
      return `${p?.name || "Unknown"} (${m.role}, ${p?.persona_type || "?"}, Lv${p?.xp_level || 0})`;
    }).join("; ");

    const chatLog = recentMessages.map((m: any) =>
      `[${m.sender_type}] ${m.message_text}`
    ).join("\n");

    const prompts: Record<string, string> = {
      summarize: `You are a facilitator for "${entity?.name || "this group"}".
Summarize the recent discussions below into a clear, structured summary (max 300 words).
Group by theme. Highlight key decisions, open questions, and sentiment.

Members: ${memberSummary}

Recent activity/chat:
${chatLog || "(No recent activity)"}

Return a markdown-formatted summary.`,

      next_steps: `You are a facilitator for "${entity?.name || "this group"}".
Based on the recent discussions and activity, extract a list of actionable next steps.
Each should have a title and a brief description (1 sentence).
Prioritize by urgency. Include who might be best suited based on roles.

Members: ${memberSummary}

Recent activity/chat:
${chatLog || "(No recent activity)"}

Return JSON: { "steps": [{ "title": "...", "description": "...", "suggested_assignee": "..." }] }`,

      agenda: `You are a facilitator for "${entity?.name || "this group"}".
Generate a meeting agenda based on recent activity, open items, and member roles.
Include time estimates. Structure: welcome, review, discussion items, action items, close.

Members: ${memberSummary}
Description: ${entity?.description || "N/A"}

Recent activity/chat:
${chatLog || "(No recent activity)"}

Return a markdown-formatted meeting agenda.`,

      rewrite: `You are a communication coach. The following message may have an aggressive or confrontational tone.
Rewrite it in a constructive, empathetic way that preserves the core concern but uses non-violent communication principles.
Keep it concise.

Original message:
"${inputText || ""}"

Return JSON: { "original": "...", "rewritten": "...", "tone_note": "brief explanation of changes" }`,
    };

    const systemPrompt = prompts[action];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const useToolCalling = action === "next_steps" || action === "rewrite";

    const aiBody: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: action === "rewrite" ? `Rewrite this message: "${inputText}"` : "Please proceed with the analysis." },
      ],
    };

    if (action === "next_steps") {
      aiBody.tools = [{
        type: "function",
        function: {
          name: "extract_next_steps",
          description: "Return actionable next steps from discussion",
          parameters: {
            type: "object",
            properties: {
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    suggested_assignee: { type: "string" },
                  },
                  required: ["title", "description"],
                  additionalProperties: false,
                },
              },
            },
            required: ["steps"],
            additionalProperties: false,
          },
        },
      }];
      aiBody.tool_choice = { type: "function", function: { name: "extract_next_steps" } };
    }

    if (action === "rewrite") {
      aiBody.tools = [{
        type: "function",
        function: {
          name: "rewrite_message",
          description: "Return a conflict-friendly rewrite",
          parameters: {
            type: "object",
            properties: {
              original: { type: "string" },
              rewritten: { type: "string" },
              tone_note: { type: "string" },
            },
            required: ["original", "rewritten", "tone_note"],
            additionalProperties: false,
          },
        },
      }];
      aiBody.tool_choice = { type: "function", function: { name: "rewrite_message" } };
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(aiBody),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();

    let result: any;
    if (useToolCalling) {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        result = JSON.parse(toolCall.function.arguments);
      } else {
        result = { raw: aiData.choices?.[0]?.message?.content || "" };
      }
    } else {
      result = { content: aiData.choices?.[0]?.message?.content || "" };
    }

    return new Response(JSON.stringify({ action, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("facilitate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
