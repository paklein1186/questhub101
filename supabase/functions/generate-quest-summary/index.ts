import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questId } = await req.json();
    if (!questId) throw new Error("questId required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch quest with related data
    const { data: quest, error: qErr } = await supabase
      .from("quests")
      .select("*, quest_topics(topics(name)), quest_hosts(entity_type, entity_id, role)")
      .eq("id", questId)
      .single();
    if (qErr || !quest) throw new Error("Quest not found");

    // Fetch creator profile
    const { data: creator } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", quest.created_by_user_id)
      .single();

    // Fetch host names
    const hostIds = (quest.quest_hosts || []).map((h: any) => h.entity_id).filter(Boolean);
    let hostNames: string[] = [];
    if (hostIds.length > 0) {
      const { data: guilds } = await supabase.from("guilds").select("id, name").in("id", hostIds);
      const { data: companies } = await supabase.from("companies").select("id, name").in("id", hostIds);
      hostNames = [...(guilds || []), ...(companies || [])].map((e: any) => e.name);
    }

    // Fetch participant count
    const { count: participantCount } = await supabase
      .from("quest_participants")
      .select("id", { count: "exact", head: true })
      .eq("quest_id", questId);

    // Fetch subtask count
    const { count: subtaskCount } = await supabase
      .from("quest_subtasks")
      .select("id", { count: "exact", head: true })
      .eq("quest_id", questId);

    const topics = (quest.quest_topics || []).map((qt: any) => qt.topics?.name).filter(Boolean);
    const createdDate = new Date(quest.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const hasBudget = Number(quest.coins_budget ?? 0) > 0 || Number(quest.ctg_budget ?? 0) > 0;
    const hasOCU = quest.ocu_enabled === true;

    const prompt = `Write exactly 2 concise sentences summarizing this quest for newcomers. Be factual, no marketing language.

Quest title: "${quest.title}"
Description: "${quest.description || "No description"}"
Created by: ${creator?.name || "Unknown"}
Created: ${createdDate}
Status: ${quest.status}
Hosted by: ${hostNames.length > 0 ? hostNames.join(", ") : "Independent"}
Topics: ${topics.length > 0 ? topics.join(", ") : "General"}
Participants: ${participantCount || 0}
Subtasks: ${subtaskCount || 0}
Has budget (Coins/CTG): ${hasBudget ? "Yes" : "No"}
OCU (Open Contributive Unit) enabled: ${hasOCU ? "Yes" : "No"}
Allow fundraising: ${quest.allow_fundraising ? "Yes" : "No"}

Sentence 1: What the quest is about, who launched it and when.
Sentence 2: Collaboration model (OCU/budget/fundraising), key resources, and main contributors/hosts.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a concise summarizer. Return only the 2 sentences, nothing else." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const summary = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (summary) {
      await supabase.from("quests").update({ ai_summary: summary } as any).eq("id", questId);
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quest-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
