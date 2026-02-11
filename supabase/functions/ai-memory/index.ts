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

async function fetchJson(url: string, key: string) {
  const res = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.json();
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
    const { entityType, entityId } = await req.json();
    if (!entityType || !entityId) {
      return new Response(JSON.stringify({ error: "entityType and entityId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const base = `${supabaseUrl}/rest/v1`;

    let contextParts: string[] = [];
    let entityName = "";

    if (entityType === "GUILD") {
      const [guild] = await fetchJson(`${base}/guilds?id=eq.${entityId}&select=id,name,description,created_at,type`, sk);
      entityName = guild?.name || "Guild";
      contextParts.push(`# Guild: ${guild?.name}\nType: ${guild?.type}\nCreated: ${guild?.created_at}\nDescription: ${guild?.description || "N/A"}`);

      // Members
      const members = await fetchJson(`${base}/guild_members?guild_id=eq.${entityId}&select=user_id,role,joined_at`, sk);
      if (members.length) {
        const userIds = members.map((m: any) => m.user_id).join(",");
        const profiles = await fetchJson(`${base}/profiles?user_id=in.(${userIds})&select=user_id,name,persona_type,xp_level`, sk);
        const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
        contextParts.push(`## Members (${members.length})\n${members.map((m: any) => {
          const p = profileMap.get(m.user_id);
          return `- ${p?.name || "?"} (${m.role}, ${p?.persona_type || "?"}, Lv${p?.xp_level || 0}), joined ${m.joined_at}`;
        }).join("\n")}`);
      }

      // Quests linked
      const quests = await fetchJson(`${base}/quests?guild_id=eq.${entityId}&select=id,title,status,credit_reward,reward_xp,created_at&is_deleted=eq.false&order=created_at.desc&limit=20`, sk);
      if (quests.length) {
        contextParts.push(`## Quests (${quests.length})\n${quests.map((q: any) => `- "${q.title}" [${q.status}] ${q.reward_xp}XP, ${q.credit_reward} Credits`).join("\n")}`);
      }

      // Docs
      const docs = await fetchJson(`${base}/guild_docs?guild_id=eq.${entityId}&select=title,content,created_at&order=created_at.desc&limit=10`, sk);
      if (docs.length) {
        contextParts.push(`## Documents\n${docs.map((d: any) => `- "${d.title}" (${d.created_at}): ${(d.content || "").slice(0, 200)}`).join("\n")}`);
      }

      // Events
      const events = await fetchJson(`${base}/guild_events?guild_id=eq.${entityId}&select=title,start_at,is_cancelled&order=start_at.desc&limit=10`, sk);
      if (events.length) {
        contextParts.push(`## Events\n${events.map((e: any) => `- "${e.title}" at ${e.start_at}${e.is_cancelled ? " (cancelled)" : ""}`).join("\n")}`);
      }

      // Chat activity
      const threads = await fetchJson(`${base}/unit_chat_threads?entity_type=eq.GUILD&entity_id=eq.${entityId}&select=id`, sk);
      if (threads.length) {
        const msgs = await fetchJson(`${base}/unit_chat_messages?thread_id=eq.${threads[0].id}&select=sender_type,message_text,created_at&order=created_at.desc&limit=30`, sk);
        if (msgs.length) {
          contextParts.push(`## Recent Chat (last ${msgs.length} messages)\n${msgs.reverse().map((m: any) => `[${m.sender_type}] ${m.message_text.slice(0, 150)}`).join("\n")}`);
        }
      }

      // Decision polls
      const polls = await fetchJson(`${base}/decision_polls?entity_type=eq.GUILD&entity_id=eq.${entityId}&select=question,status,options,created_at&order=created_at.desc&limit=10`, sk);
      if (polls.length) {
        contextParts.push(`## Decision Polls\n${polls.map((p: any) => `- "${p.question}" [${p.status}]`).join("\n")}`);
      }
    }

    if (entityType === "QUEST") {
      const [quest] = await fetchJson(`${base}/quests?id=eq.${entityId}&select=id,title,description,status,reward_xp,credit_reward,credit_budget,escrow_credits,monetization_type,created_at,allow_fundraising,funding_goal_credits,guild_id`, sk);
      entityName = quest?.title || "Quest";
      contextParts.push(`# Quest: ${quest?.title}\nStatus: ${quest?.status}\nReward: ${quest?.reward_xp}XP, ${quest?.credit_reward} Credits\nBudget: ${quest?.credit_budget} Credits, Escrow: ${quest?.escrow_credits}\nDescription: ${quest?.description || "N/A"}`);

      // Participants
      const participants = await fetchJson(`${base}/quest_participants?quest_id=eq.${entityId}&select=user_id,role,status`, sk);
      if (participants.length) {
        const userIds = participants.map((p: any) => p.user_id).join(",");
        const profiles = await fetchJson(`${base}/profiles?user_id=in.(${userIds})&select=user_id,name,xp_level`, sk);
        const pm = new Map(profiles.map((p: any) => [p.user_id, p]));
        contextParts.push(`## Participants (${participants.length})\n${participants.map((p: any) => `- ${pm.get(p.user_id)?.name || "?"} (${p.role}, ${p.status})`).join("\n")}`);
      }

      // Subtasks
      const subtasks = await fetchJson(`${base}/quest_subtasks?quest_id=eq.${entityId}&select=title,status,description&order=order_index.asc`, sk);
      if (subtasks.length) {
        contextParts.push(`## Subtasks (${subtasks.length})\n${subtasks.map((s: any) => `- [${s.status}] ${s.title}`).join("\n")}`);
      }

      // Proposals
      const proposals = await fetchJson(`${base}/quest_proposals?quest_id=eq.${entityId}&select=title,status,requested_credits,upvotes_count,description&order=created_at.desc`, sk);
      if (proposals.length) {
        contextParts.push(`## Proposals (${proposals.length})\n${proposals.map((p: any) => `- "${p.title}" [${p.status}] ${p.requested_credits} Credits, ${p.upvotes_count} upvotes`).join("\n")}`);
      }

      // Updates
      const updates = await fetchJson(`${base}/quest_updates?quest_id=eq.${entityId}&select=title,type,content,created_at&is_deleted=eq.false&order=created_at.desc&limit=15`, sk);
      if (updates.length) {
        contextParts.push(`## Updates\n${updates.map((u: any) => `- [${u.type}] "${u.title}": ${(u.content || "").slice(0, 150)}`).join("\n")}`);
      }

      // Funding
      const funding = await fetchJson(`${base}/quest_funding?quest_id=eq.${entityId}&select=amount,type,status,created_at`, sk);
      if (funding.length) {
        const totalFunded = funding.filter((f: any) => f.status === "COMPLETED").reduce((s: number, f: any) => s + f.amount, 0);
        contextParts.push(`## Funding: ${funding.length} contributions, ${totalFunded} Credits completed`);
      }
    }

    if (entityType === "POD") {
      const [pod] = await fetchJson(`${base}/pods?id=eq.${entityId}&select=id,name,description,type,start_date,end_date,quest_id,created_at`, sk);
      entityName = pod?.name || "Pod";
      contextParts.push(`# Pod: ${pod?.name}\nType: ${pod?.type}\nDates: ${pod?.start_date || "?"} → ${pod?.end_date || "?"}\nDescription: ${pod?.description || "N/A"}`);

      // Members
      const members = await fetchJson(`${base}/pod_members?pod_id=eq.${entityId}&select=user_id,role,joined_at`, sk);
      if (members.length) {
        const userIds = members.map((m: any) => m.user_id).join(",");
        const profiles = await fetchJson(`${base}/profiles?user_id=in.(${userIds})&select=user_id,name,xp_level`, sk);
        const pm = new Map(profiles.map((p: any) => [p.user_id, p]));
        contextParts.push(`## Members (${members.length})\n${members.map((m: any) => `- ${pm.get(m.user_id)?.name || "?"} (${m.role})`).join("\n")}`);
      }

      // Linked quest
      if (pod?.quest_id) {
        const [quest] = await fetchJson(`${base}/quests?id=eq.${pod.quest_id}&select=title,status`, sk);
        if (quest) contextParts.push(`## Linked Quest: "${quest.title}" [${quest.status}]`);
      }

      // Chat
      const threads = await fetchJson(`${base}/unit_chat_threads?entity_type=eq.POD&entity_id=eq.${entityId}&select=id`, sk);
      if (threads.length) {
        const msgs = await fetchJson(`${base}/unit_chat_messages?thread_id=eq.${threads[0].id}&select=sender_type,message_text&order=created_at.desc&limit=30`, sk);
        if (msgs.length) {
          contextParts.push(`## Recent Chat\n${msgs.reverse().map((m: any) => `[${m.sender_type}] ${m.message_text.slice(0, 150)}`).join("\n")}`);
        }
      }
    }

    if (entityType === "TERRITORY") {
      const [territory] = await fetchJson(`${base}/territories?id=eq.${entityId}&select=id,name,level,slug,parent_id`, sk);
      entityName = territory?.name || "Territory";
      contextParts.push(`# Territory: ${territory?.name}\nLevel: ${territory?.level}\nSlug: ${territory?.slug}`);

      // Guilds in territory
      const guildTerrs = await fetchJson(`${base}/guild_territories?territory_id=eq.${entityId}&select=guild_id,relation_type`, sk);
      if (guildTerrs.length) {
        const guildIds = guildTerrs.map((g: any) => g.guild_id).join(",");
        const guilds = await fetchJson(`${base}/guilds?id=in.(${guildIds})&select=name,type&is_deleted=eq.false`, sk);
        contextParts.push(`## Guilds (${guilds.length})\n${guilds.map((g: any) => `- ${g.name} (${g.type})`).join("\n")}`);
      }

      // Quests in territory
      const questTerrs = await fetchJson(`${base}/quest_territories?territory_id=eq.${entityId}&select=quest_id`, sk);
      if (questTerrs.length) {
        const questIds = questTerrs.map((q: any) => q.quest_id).join(",");
        const quests = await fetchJson(`${base}/quests?id=in.(${questIds})&select=title,status&is_deleted=eq.false`, sk);
        contextParts.push(`## Quests (${quests.length})\n${quests.map((q: any) => `- "${q.title}" [${q.status}]`).join("\n")}`);
      }

      // Companies
      const compTerrs = await fetchJson(`${base}/company_territories?territory_id=eq.${entityId}&select=company_id`, sk);
      if (compTerrs.length) {
        const compIds = compTerrs.map((c: any) => c.company_id).join(",");
        const companies = await fetchJson(`${base}/companies?id=in.(${compIds})&select=name,sector&is_deleted=eq.false`, sk);
        contextParts.push(`## Companies (${companies.length})\n${companies.map((c: any) => `- ${c.name} (${c.sector || "?"})`).join("\n")}`);
      }
    }

    const fullContext = contextParts.join("\n\n");

    const systemPrompt = `You are an institutional memory engine. Given the full history and context of "${entityName}" (a ${entityType.toLowerCase()}), produce a comprehensive memory summary structured as follows:

## Executive Summary
Brief overview of the entity's purpose and current state.

## Key Decisions Made
List important decisions, votes, and directional choices.

## Tasks & Milestones Completed
What has been accomplished.

## Proposals & Initiatives
Summary of proposals submitted, accepted, rejected.

## Key Collaborators & Their Contributions
Who contributed what.

## Lessons Learned
Patterns, what worked, what didn't.

## Risks & Open Issues
Current challenges and forward-looking risks.

## Recommendations
Actionable next priorities based on history.

Keep it factual, neutral, and concise (400-600 words). Use the data provided — do not invent facts.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullContext },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();
    const summary = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ entityType, entityId, entityName, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("memory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
