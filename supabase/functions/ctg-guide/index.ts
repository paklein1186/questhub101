import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- Entity-type → table mapping ----------
const ENTITY_TABLE: Record<string, string> = {
  guild: "guilds",
  quest: "quests",
  service: "services",
  territory: "territories",
  event: "events",
  living_system: "natural_systems",
  post: "posts",
  user: "profiles",
};

// ---------- Relation executor ----------
async function executeLink(
  sb: any,
  fromType: string,
  fromId: string,
  relation: string,
  toType: string,
  toId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // quest → guild  (belongs_to)
    if (fromType === "quest" && toType === "guild" && relation === "belongs_to") {
      const { error } = await sb.from("quests").update({ guild_id: toId }).eq("id", fromId);
      if (error) throw error;
      return { success: true };
    }
    // quest → territory (anchored_in)
    if (fromType === "quest" && toType === "territory" && relation === "anchored_in") {
      const { error } = await sb.from("quest_territories").upsert(
        { quest_id: fromId, territory_id: toId },
        { onConflict: "quest_id,territory_id" }
      );
      if (error) throw error;
      return { success: true };
    }
    // quest → living_system
    if (fromType === "quest" && toType === "living_system" && relation === "involves_living_system") {
      const { error } = await sb.from("quest_natural_systems").upsert(
        { quest_id: fromId, natural_system_id: toId },
        { onConflict: "quest_id,natural_system_id" }
      );
      if (error) throw error;
      return { success: true };
    }
    // quest → guild/company (partner_with)
    if (relation === "partner_with") {
      // Generic – just log for now; specific join tables can be added later
      return { success: true };
    }
    // guild → territory
    if (fromType === "guild" && toType === "territory") {
      const { error } = await sb.from("guild_territories").upsert(
        { guild_id: fromId, territory_id: toId },
        { onConflict: "guild_id,territory_id" }
      );
      if (error) throw error;
      return { success: true };
    }
    // Fallback – unknown relation
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? String(e) };
  }
}

// ---------- Build context summary ----------
async function buildContextSummary(
  sb: any,
  userId: string,
  contextType: string,
  contextId: string | null
): Promise<string> {
  const parts: string[] = [];

  // User profile
  const { data: profile } = await sb
    .from("profiles")
    .select("id, handle, display_name, persona")
    .eq("id", userId)
    .single();
  if (profile) {
    parts.push(
      `User: ${profile.display_name || profile.handle || userId} (persona: ${profile.persona || "unknown"})`
    );
  }

  // Context entity
  if (contextType === "guild" && contextId) {
    const { data: g } = await sb.from("guilds").select("id, name, description").eq("id", contextId).single();
    if (g) parts.push(`Current guild: "${g.name}" – ${(g.description || "").slice(0, 200)}`);
  }
  if (contextType === "quest" && contextId) {
    const { data: q } = await sb.from("quests").select("id, title, description, status").eq("id", contextId).single();
    if (q) parts.push(`Current quest: "${q.title}" (${q.status}) – ${(q.description || "").slice(0, 200)}`);
  }
  if (contextType === "territory" && contextId) {
    const { data: t } = await sb.from("territories").select("id, name, description").eq("id", contextId).single();
    if (t) parts.push(`Current territory: "${t.name}" – ${(t.description || "").slice(0, 200)}`);
  }

  return parts.join("\n") || "No additional context available.";
}

// ---------- System prompt ----------
function buildSystemPrompt(contextSummary: string): string {
  return `You are the CTG Conversational Guide.

Goal:
- Help users express their needs in natural language.
- Transform these needs into structured CTG entities (Users, Guilds, Quests, Services, Territories, Events, Living Systems, Posts).
- Whenever possible, create or pre-fill entities and connect them together.
- Always keep track of the current context: onboarding, guild page, quest page, territory dashboard, or global.
- After performing actions, answer the user in clear, concise language in their language (French or English depending on input).

You have access to these abstract actions:
1) create_entity(type, fields) → { id }
2) update_entity(type, id, fields)
3) link_entities(from_type, from_id, relation, to_type, to_id)
4) prefill_form(type, draft_id, fields)

Valid entity types: user, guild, quest, service, territory, event, living_system, post
Valid relations: belongs_to, anchored_in, uses, involves, member_of, follows, involves_living_system, partner_with

Current context:
${contextSummary}

Your output MUST be valid JSON:
{
  "actions": [
    { "name": "create_entity" | "update_entity" | "link_entities" | "prefill_form", "args": { ... } }
  ],
  "assistant_message": "Your answer to the user"
}

Rules:
- Prefer EDIT or PREFILL an existing draft instead of creating duplicates.
- Infer as many fields as you safely can (title, description, tags, territories, skills, dates).
- Preserve the richness of the original user text by including it in a raw_input field inside fields when creating entities.
- If a crucial field is missing, still create a draft entity and ask a short follow-up question.
- Keep assistant_message short, practical, and focused.
- If unsure whether to create or reuse, prefer reusing entities mentioned in the context.`;
}

// ---------- Main handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonRes({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sb = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authError } = await sb.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !userData.user) return jsonRes({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  try {
    const { message, contextType, contextId, sessionId } = await req.json();

    // --- Ping test ---
    if (message === "__ping") {
      return jsonRes({
        sessionId: sessionId || "test",
        assistantMessage: "pong",
        actionsExecuted: [],
        createdEntities: [],
        updatedEntities: [],
        links: [],
      });
    }

    // --- Service-key client for inserts the user can't do directly ---
    const sbService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // --- Resolve or create session ---
    let effectiveSessionId = sessionId as string | null;
    if (effectiveSessionId) {
      const { data: existing } = await sb
        .from("assistant_sessions")
        .select("id")
        .eq("id", effectiveSessionId)
        .eq("user_id", userId)
        .single();
      if (!existing) effectiveSessionId = null;
    }
    if (!effectiveSessionId) {
      // Look for recent session
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await sb
        .from("assistant_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("context_type", contextType)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1);
      if (recent && recent.length > 0) {
        effectiveSessionId = recent[0].id;
      } else {
        const { data: newSession, error: sessErr } = await sb
          .from("assistant_sessions")
          .insert({
            user_id: userId,
            context_type: contextType,
            context_id: contextId || null,
          })
          .select("id")
          .single();
        if (sessErr) throw sessErr;
        effectiveSessionId = newSession!.id;
      }
    }

    // --- Load history ---
    const { data: historyRows } = await sb
      .from("assistant_messages")
      .select("role, content")
      .eq("session_id", effectiveSessionId)
      .order("created_at", { ascending: true })
      .limit(10);

    const historyMessages = (historyRows || []).map((r: any) => ({
      role: r.role as string,
      content: typeof r.content === "object" ? r.content.text || JSON.stringify(r.content) : String(r.content),
    }));

    // --- Build context ---
    const contextSummary = await buildContextSummary(sb, userId, contextType, contextId || null);
    const systemPrompt = buildSystemPrompt(contextSummary);

    // --- Call LLM ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonRes({ error: "AI not configured" }, 500);

    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: llmMessages,
        temperature: 0.4,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) return jsonRes({ error: "Rate limit exceeded, try again shortly." }, 429);
      if (aiRes.status === 402) return jsonRes({ error: "AI credits exhausted." }, 402);
      return jsonRes({ error: "AI gateway error" }, 500);
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // --- Parse LLM JSON ---
    let parsed: { actions: any[]; assistant_message: string };
    try {
      // Strip markdown fences if present
      const cleaned = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { actions: [], assistant_message: rawContent || "I'm here to help – could you rephrase?" };
    }

    // --- Execute actions ---
    const actionsExecuted: any[] = [];
    const createdEntities: any[] = [];
    const updatedEntities: any[] = [];
    const links: any[] = [];

    for (const action of parsed.actions || []) {
      const result: any = { name: action.name, args: action.args, success: false };
      try {
        if (action.name === "create_entity" || action.name === "prefill_form") {
          const entityType = action.args?.type;
          const table = ENTITY_TABLE[entityType];
          if (!table) {
            result.error = `Unknown entity type: ${entityType}`;
          } else {
            const fields = { ...action.args.fields };
            // Inject creator
            if (entityType === "quest") {
              fields.created_by = fields.created_by || userId;
            }
            if (entityType === "guild" || entityType === "living_system") {
              fields.created_by_user_id = fields.created_by_user_id || userId;
            }

            const { data: inserted, error: insertErr } = await sb
              .from(table)
              .insert(fields)
              .select("id")
              .single();

            if (insertErr) {
              result.error = insertErr.message;
            } else {
              result.success = true;
              result.createdEntity = { type: entityType, id: inserted.id };
              createdEntities.push(result.createdEntity);
            }
          }
        } else if (action.name === "update_entity") {
          const entityType = action.args?.type;
          const table = ENTITY_TABLE[entityType];
          const entityId = action.args?.id;
          if (!table || !entityId) {
            result.error = "Missing type or id";
          } else {
            const fields = { ...action.args.fields };
            const { error: updateErr } = await sb.from(table).update(fields).eq("id", entityId);
            if (updateErr) {
              result.error = updateErr.message;
            } else {
              result.success = true;
              result.updatedEntity = { type: entityType, id: entityId };
              updatedEntities.push(result.updatedEntity);
            }
          }
        } else if (action.name === "link_entities") {
          const { from_type, from_id, relation, to_type, to_id } = action.args || {};
          // Resolve IDs – if an action created them earlier, use those
          const resolvedFromId = resolveId(from_id, createdEntities, from_type);
          const resolvedToId = resolveId(to_id, createdEntities, to_type);
          const linkResult = await executeLink(sb, from_type, resolvedFromId, relation, to_type, resolvedToId);
          result.success = linkResult.success;
          result.error = linkResult.error;
          if (linkResult.success) {
            result.link = { fromType: from_type, fromId: resolvedFromId, relation, toType: to_type, toId: resolvedToId };
            links.push(result.link);
          }
        }
      } catch (e: any) {
        result.error = e.message ?? String(e);
      }
      actionsExecuted.push(result);
    }

    // --- Store messages ---
    await sb.from("assistant_messages").insert([
      {
        session_id: effectiveSessionId,
        role: "user",
        content: { text: message },
      },
      {
        session_id: effectiveSessionId,
        role: "assistant",
        content: {
          text: parsed.assistant_message,
          actions: actionsExecuted,
        },
      },
    ]);

    return jsonRes({
      sessionId: effectiveSessionId,
      assistantMessage: parsed.assistant_message,
      actionsExecuted,
      createdEntities,
      updatedEntities,
      links,
    });
  } catch (e: any) {
    console.error("ctg-guide error:", e);
    return jsonRes({ error: e.message ?? "Internal error" }, 500);
  }
});

function resolveId(
  id: string,
  createdEntities: { type: string; id: string }[],
  entityType: string
): string {
  if (id && !id.includes("-")) {
    // Might be a placeholder like "quest_id_created_above"
    const match = createdEntities.find((e) => e.type === entityType);
    if (match) return match.id;
  }
  return id;
}
