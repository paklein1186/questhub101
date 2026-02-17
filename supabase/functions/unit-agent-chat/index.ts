import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agentId, unitType, unitId, messages } = await req.json();
    if (!agentId || !unitType || !unitId || !messages?.length) {
      return new Response(JSON.stringify({ error: "agentId, unitType, unitId, and messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify agent is admitted to this unit
    const { data: unitAgent, error: uaErr } = await adminClient
      .from("unit_agents")
      .select("*, agents(*)")
      .eq("agent_id", agentId)
      .eq("unit_type", unitType)
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .maybeSingle();

    if (!unitAgent) {
      return new Response(JSON.stringify({ error: "Agent not admitted to this unit" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agent = unitAgent.agents;

    // Verify user is a member of the unit
    let isMember = false;
    if (unitType === "guild") {
      const { data } = await adminClient.from("guild_members").select("id").eq("guild_id", unitId).eq("user_id", user.id).maybeSingle();
      isMember = !!data;
    } else if (unitType === "pod") {
      const { data } = await adminClient.from("pod_members").select("id").eq("pod_id", unitId).eq("user_id", user.id).maybeSingle();
      isMember = !!data;
    } else if (unitType === "quest") {
      const { data } = await adminClient.from("quest_participants").select("id").eq("quest_id", unitId).eq("user_id", user.id).maybeSingle();
      isMember = !!data;
    }

    if (!isMember) {
      return new Response(JSON.stringify({ error: "You must be a member of this unit to chat with its agents" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather unit context
    let unitContext = "";
    if (unitType === "guild") {
      const { data: guild } = await adminClient.from("guilds").select("name, description").eq("id", unitId).single();
      if (guild) unitContext += `Guild: ${guild.name}\nDescription: ${guild.description || "N/A"}\n`;

      // Recent posts
      const { data: posts } = await adminClient.from("feed_posts").select("content, created_at").eq("context_type", "GUILD").eq("context_id", unitId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(5);
      if (posts?.length) {
        unitContext += "\nRecent posts:\n" + posts.map((p: any) => `- ${p.content?.slice(0, 200)}`).join("\n");
      }

      // Members
      const { data: members } = await adminClient.from("guild_members").select("user_id, role, profiles:user_id(name)").eq("guild_id", unitId).limit(20);
      if (members?.length) {
        unitContext += "\n\nMembers:\n" + members.map((m: any) => `- ${(m as any).profiles?.name || "Unknown"} (${m.role})`).join("\n");
      }

      // Docs
      const { data: docs } = await adminClient.from("guild_docs").select("title, content").eq("guild_id", unitId).limit(3);
      if (docs?.length) {
        unitContext += "\n\nDocuments:\n" + docs.map((d: any) => `- ${d.title}: ${d.content?.slice(0, 300) || ""}`).join("\n");
      }
    } else if (unitType === "pod") {
      const { data: pod } = await adminClient.from("pods").select("name, description").eq("id", unitId).single();
      if (pod) unitContext += `Pod: ${pod.name}\nDescription: ${pod.description || "N/A"}\n`;

      const { data: members } = await adminClient.from("pod_members").select("user_id, role, profiles:user_id(name)").eq("pod_id", unitId).limit(20);
      if (members?.length) {
        unitContext += "\nMembers:\n" + members.map((m: any) => `- ${(m as any).profiles?.name || "Unknown"} (${m.role})`).join("\n");
      }
    } else if (unitType === "quest") {
      const { data: quest } = await adminClient.from("quests").select("title, description, status, reward_xp").eq("id", unitId).single();
      if (quest) unitContext += `Quest: ${quest.title}\nDescription: ${quest.description || "N/A"}\nStatus: ${quest.status}\nReward: ${quest.reward_xp} XP\n`;

      const { data: participants } = await adminClient.from("quest_participants").select("user_id, role, status, profiles:user_id(name)").eq("quest_id", unitId).limit(20);
      if (participants?.length) {
        unitContext += "\nParticipants:\n" + participants.map((p: any) => `- ${(p as any).profiles?.name || "Unknown"} (${p.role}, ${p.status})`).join("\n");
      }

      // Recent updates
      const { data: updates } = await adminClient.from("quest_updates").select("title, content, type").eq("quest_id", unitId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(5);
      if (updates?.length) {
        unitContext += "\n\nRecent updates:\n" + updates.map((u: any) => `- [${u.type}] ${u.title}: ${u.content?.slice(0, 200)}`).join("\n");
      }
    }

    // Build enriched system prompt
    const systemPrompt = `${agent.system_prompt}

---
CONTEXT: You are operating inside a ${unitType} on the changethegame platform. Use the following context to provide relevant, grounded answers.

${unitContext}
---
Respond helpfully based on this context. If you don't know something specific about the unit, say so.`;

    // Deduct credits
    const { error: spendErr } = await adminClient.rpc("spend_user_credits", {
      _amount: agent.cost_per_use,
      _type: "AGENT_USE",
      _source: `Unit Agent: ${agent.name} (${unitType})`,
      _related_entity_type: "agent",
      _related_entity_id: agentId,
    });
    if (spendErr) {
      console.error("Credit spend error:", spendErr.message);
    }

    // Increment usage
    await adminClient.from("agents").update({ usage_count: (agent.usage_count || 0) + 1 }).eq("id", agentId);

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("unit-agent-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
