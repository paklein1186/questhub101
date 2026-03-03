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

// =====================================================================
// Entity-type → table mapping (matches actual DB schema)
// =====================================================================
const ENTITY_TABLE: Record<string, string> = {
  guild: "guilds",
  quest: "quests",
  service: "services",
  territory: "territories",
  event: "guild_events",        // events live in guild_events
  living_system: "natural_systems",
  post: "feed_posts",           // posts live in feed_posts
  user: "profiles",
};

// Creator-column per entity type
const CREATOR_COLUMN: Record<string, string> = {
  guild: "created_by_user_id",
  quest: "created_by_user_id",
  service: "provider_user_id",
  event: "created_by_user_id",
  living_system: "created_by_user_id",
  post: "author_user_id",
};

// =====================================================================
// Relation executor – maps abstract relations to real DB operations
// =====================================================================
async function executeLink(
  sb: any,
  userId: string,
  fromType: string,
  fromId: string,
  relation: string,
  toType: string,
  toId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // ----- belongs_to -----

    // quest belongs_to guild → set guild_id + quest_affiliations (auto-approve if user is admin)
    if (fromType === "quest" && toType === "guild" && relation === "belongs_to") {
      // Set the primary guild on the quest
      await sb.from("quests").update({ guild_id: toId }).eq("id", fromId);

      // Check if user is admin of the guild → auto-approve affiliation
      const { data: membership } = await sb.from("guild_members")
        .select("role")
        .eq("guild_id", toId)
        .eq("user_id", userId)
        .maybeSingle();
      const isAdmin = membership?.role === "ADMIN";

      await sb.from("quest_affiliations").insert({
        quest_id: fromId,
        entity_id: toId,
        entity_type: "guild",
        created_by_user_id: userId,
        status: isAdmin ? "APPROVED" : "PENDING",
      });

      // If approved, also add to quest_hosts
      if (isAdmin) {
        await sb.from("quest_hosts").upsert({
          quest_id: fromId,
          host_type: "guild",
          host_id: toId,
          role: "CO_HOST",
        }, { onConflict: "quest_id,host_type,host_id" });
      }

      return { success: true };
    }

    // quest belongs_to company → quest_affiliations
    if (fromType === "quest" && toType === "company" && relation === "belongs_to") {
      await sb.from("quest_affiliations").insert({
        quest_id: fromId,
        entity_id: toId,
        entity_type: "company",
        created_by_user_id: userId,
        status: "PENDING",
      });
      return { success: true };
    }

    // service belongs_to guild → services.guild_id
    if (fromType === "service" && toType === "guild" && relation === "belongs_to") {
      const { error } = await sb.from("services").update({ guild_id: toId }).eq("id", fromId);
      if (error) throw error;
      return { success: true };
    }

    // event belongs_to guild → guild_events already requires guild_id at insert
    // (handled at create_entity time, not here)

    // ----- anchored_in (territory links) -----

    if (relation === "anchored_in" && toType === "territory") {
      // quest → quest_territories join table
      if (fromType === "quest") {
        await sb.from("quest_territories").upsert(
          { quest_id: fromId, territory_id: toId },
          { onConflict: "quest_id,territory_id" }
        );
        return { success: true };
      }
      // guild → guild_territories join table
      if (fromType === "guild") {
        await sb.from("guild_territories").upsert(
          { guild_id: fromId, territory_id: toId },
          { onConflict: "guild_id,territory_id" }
        );
        return { success: true };
      }
      // living_system → natural_systems.territory_id column
      if (fromType === "living_system") {
        const { error } = await sb.from("natural_systems").update({ territory_id: toId }).eq("id", fromId);
        if (error) throw error;
        return { success: true };
      }
      // service → service has no territory FK; skip gracefully
      return { success: true };
    }

    // ----- member_of -----

    if (relation === "member_of" && fromType === "user" && toType === "guild") {
      await sb.from("guild_members").insert({
        user_id: fromId,
        guild_id: toId,
        role: "MEMBER",
      });
      return { success: true };
    }

    // ----- follows -----

    if (relation === "follows" && fromType === "user") {
      await sb.from("follows").insert({
        follower_id: fromId,
        target_type: toType,
        target_id: toId,
      });
      return { success: true };
    }

    // ----- involves_living_system -----

    if (relation === "involves_living_system" && toType === "living_system") {
      // natural_system_links table – polymorphic link
      const linkTypeMap: Record<string, string> = {
        quest: "quest",
        territory: "territory",
        user: "user",
        guild: "entity",
        service: "entity",
      };
      const linkedType = linkTypeMap[fromType] || "entity";
      await sb.from("natural_system_links").insert({
        natural_system_id: toId,
        linked_id: fromId,
        linked_type: linkedType,
        linked_via: "ctg-guide",
      });
      return { success: true };
    }

    // Also support the reverse direction: quest → natural_system_id direct FK
    if (relation === "involves_living_system" && fromType === "quest" && toType === "living_system") {
      const { error } = await sb.from("quests").update({ natural_system_id: toId }).eq("id", fromId);
      if (error) throw error;
      return { success: true };
    }

    // ----- partner_with -----

    if (relation === "partner_with") {
      // Use quest_affiliations if quest is involved
      if (fromType === "quest") {
        await sb.from("quest_affiliations").insert({
          quest_id: fromId,
          entity_id: toId,
          entity_type: toType === "guild" ? "guild" : "company",
          created_by_user_id: userId,
          status: "PENDING",
        });
        return { success: true };
      }
      // Otherwise log success – no generic partner table exists
      return { success: true };
    }

    // ----- uses (service) -----
    // No standard link table; skip gracefully
    if (relation === "uses") {
      return { success: true };
    }

    // ----- involves -----
    if (relation === "involves") {
      return { success: true };
    }

    // Fallback – unknown relation combo
    console.warn(`Unsupported link: ${fromType} --${relation}--> ${toType}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? String(e) };
  }
}

// =====================================================================
// Build structured context summary for the LLM
// =====================================================================
async function buildContextSummary(
  sb: any,
  userId: string,
  contextType: string,
  contextId: string | null,
  sessionId: string | null
): Promise<string> {
  // ---------- [USER] ----------
  const [profileRes, membershipsRes, userTerrsRes, userTopicsRes] = await Promise.all([
    sb.from("profiles")
      .select("user_id, name, bio, persona_type, headline, location, xp_level, preferred_language")
      .eq("user_id", userId)
      .maybeSingle(),
    sb.from("guild_members")
      .select("guild_id, role, guilds(id, name)")
      .eq("user_id", userId)
      .limit(8),
    sb.from("user_territories")
      .select("territory_id, is_primary, territories(id, name, level)")
      .eq("user_id", userId)
      .limit(5),
    sb.from("user_topics")
      .select("topic_id, topics(id, name)")
      .eq("user_id", userId)
      .limit(10),
  ]);

  const profile = profileRes.data;
  const memberships = membershipsRes.data || [];
  const userTerrs = userTerrsRes.data || [];
  const userTopics = userTopicsRes.data || [];

  const userGuildsLine = memberships.length
    ? memberships.map((m: any) => `${m.guilds?.name || "?"} (id: ${m.guild_id}, role: ${m.role})`).join("; ")
    : "none";

  const userTerrLine = userTerrs.length
    ? userTerrs.map((t: any) => `${t.territories?.name || "?"} (id: ${t.territory_id}${t.is_primary ? ", primary" : ""})`).join("; ")
    : "none";

  const skillsLine = userTopics.length
    ? userTopics.map((t: any) => t.topics?.name).filter(Boolean).join(", ")
    : "unknown";

  const userSection = [
    "[USER]",
    `id: ${profile?.user_id || userId}`,
    `name: ${profile?.name || "unknown"}`,
    `persona: ${profile?.persona_type || "unknown"}`,
    `headline: ${profile?.headline || "none"}`,
    `location: ${profile?.location || "none"}`,
    `xp_level: ${profile?.xp_level ?? 0}`,
    `language: ${profile?.preferred_language || "en"}`,
    `guilds: ${userGuildsLine}`,
    `territories: ${userTerrLine}`,
    `skills/topics: ${skillsLine}`,
  ].join("\n");

  // ---------- [CONTEXT] ----------
  let contextSection = `[CONTEXT]\ntype: ${contextType}\nentity: none`;
  let nearbySection = "";

  if (contextType === "guild" && contextId) {
    const [guildRes, questsRes, servicesRes, eventsRes, guildTerrsRes] = await Promise.all([
      sb.from("guilds").select("id, name, description").eq("id", contextId).maybeSingle(),
      sb.from("quests")
        .select("id, title, status, is_draft")
        .eq("guild_id", contextId)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false })
        .limit(5),
      sb.from("services")
        .select("id, name, is_active")
        .eq("guild_id", contextId)
        .limit(5),
      sb.from("guild_events")
        .select("id, title, start_at, status")
        .eq("guild_id", contextId)
        .eq("is_cancelled", false)
        .order("start_at", { ascending: false })
        .limit(3),
      sb.from("guild_territories")
        .select("territory_id, territories(id, name)")
        .eq("guild_id", contextId)
        .limit(5),
    ]);
    const g = guildRes.data;
    const quests = questsRes.data || [];
    const services = servicesRes.data || [];
    const events = eventsRes.data || [];
    const gTerrs = guildTerrsRes.data || [];

    if (g) {
      contextSection = [
        "[CONTEXT]",
        "type: guild",
        `entity: { id: ${g.id}, name: "${g.name}", description: "${(g.description || "").slice(0, 200)}" }`,
        `territories: ${gTerrs.map((t: any) => `${t.territories?.name} (id: ${t.territory_id})`).join("; ") || "none"}`,
      ].join("\n");

      nearbySection = [
        "[NEARBY]",
        `quests_in_guild: ${fmtQuests(quests)}`,
        `services_in_guild: ${services.map((s: any) => `${s.name} (id: ${s.id})`).join("; ") || "none"}`,
        `events_in_guild: ${events.map((e: any) => `${e.title} (id: ${e.id}, ${e.start_at})`).join("; ") || "none"}`,
      ].join("\n");
    }
  }

  if (contextType === "quest" && contextId) {
    const [questRes, participantsRes, affiliationsRes, questTerrsRes, nsLinkRes] = await Promise.all([
      sb.from("quests")
        .select("id, title, description, status, quest_type, guild_id, natural_system_id, is_draft, created_by_user_id")
        .eq("id", contextId)
        .maybeSingle(),
      sb.from("quest_participants")
        .select("id", { count: "exact", head: true })
        .eq("quest_id", contextId),
      sb.from("quest_affiliations")
        .select("entity_id, entity_type, status")
        .eq("quest_id", contextId)
        .limit(5),
      sb.from("quest_territories")
        .select("territory_id, territories(id, name)")
        .eq("quest_id", contextId)
        .limit(5),
      sb.from("natural_system_links")
        .select("natural_system_id, natural_systems(id, name)")
        .eq("linked_id", contextId)
        .eq("linked_type", "quest")
        .limit(5),
    ]);
    const q = questRes.data;
    const partCount = participantsRes.count || 0;
    const affiliations = affiliationsRes.data || [];
    const qTerrs = questTerrsRes.data || [];
    const nsLinks = nsLinkRes.data || [];

    if (q) {
      contextSection = [
        "[CONTEXT]",
        "type: quest",
        `entity: { id: ${q.id}, title: "${q.title}", status: ${q.status}, quest_type: ${q.quest_type}, is_draft: ${q.is_draft}, guild_id: ${q.guild_id || "none"}, natural_system_id: ${q.natural_system_id || "none"} }`,
        `description: "${(q.description || "").slice(0, 300)}"`,
        `participants: ${partCount}`,
        `territories: ${qTerrs.map((t: any) => `${t.territories?.name} (id: ${t.territory_id})`).join("; ") || "none"}`,
        `affiliations: ${affiliations.map((a: any) => `${a.entity_type}(${a.entity_id}) status:${a.status}`).join("; ") || "none"}`,
        `linked_living_systems: ${nsLinks.map((l: any) => `${l.natural_systems?.name} (id: ${l.natural_system_id})`).join("; ") || "none"}`,
      ].join("\n");
    }
  }

  if (contextType === "territory" && contextId) {
    const [terrRes, guildsInTRes, questsInTRes, nsInTRes] = await Promise.all([
      sb.from("territories")
        .select("id, name, description, level, parent_id")
        .eq("id", contextId)
        .maybeSingle(),
      sb.from("guild_territories")
        .select("guild_id, guilds(id, name)")
        .eq("territory_id", contextId)
        .limit(5),
      sb.from("quest_territories")
        .select("quest_id, quests(id, title, status)")
        .eq("territory_id", contextId)
        .limit(5),
      sb.from("natural_systems")
        .select("id, name, type, system_type, kingdom")
        .eq("territory_id", contextId)
        .eq("is_deleted", false)
        .limit(5),
    ]);
    const t = terrRes.data;
    const guildsInT = guildsInTRes.data || [];
    const questsInT = questsInTRes.data || [];
    const nsInT = nsInTRes.data || [];

    if (t) {
      contextSection = [
        "[CONTEXT]",
        "type: territory",
        `entity: { id: ${t.id}, name: "${t.name}", level: ${t.level}, parent_id: ${t.parent_id || "none"} }`,
        `description: "${(t.description || "").slice(0, 200)}"`,
      ].join("\n");

      nearbySection = [
        "[NEARBY]",
        `guilds_in_territory: ${guildsInT.map((g: any) => `${g.guilds?.name} (id: ${g.guild_id})`).join("; ") || "none"}`,
        `quests_in_territory: ${questsInT.map((q: any) => `${q.quests?.title} (id: ${q.quest_id}, status: ${q.quests?.status})`).join("; ") || "none"}`,
        `living_systems_in_territory: ${nsInT.map((n: any) => `${n.name} (id: ${n.id}, kingdom: ${n.kingdom}, type: ${n.system_type || n.type})`).join("; ") || "none"}`,
      ].join("\n");
    }
  }

  if (contextType === "onboarding") {
    contextSection = "[CONTEXT]\ntype: onboarding\nentity: none\nNote: User is going through onboarding. Help them define their profile, find guilds, and create their first quest.";
  }

  if (contextType === "global") {
    contextSection = "[CONTEXT]\ntype: global\nentity: none";
  }

  // ---------- [DRAFTS] ----------
  const draftQueries: Promise<any>[] = [];
  // User's own drafts
  draftQueries.push(
    sb.from("quests")
      .select("id, title, status, guild_id")
      .eq("created_by_user_id", userId)
      .eq("is_draft", true)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(5)
  );

  const [draftQuestsRes] = await Promise.all(draftQueries);
  const draftQuests = draftQuestsRes.data || [];

  const draftsSection = [
    "[DRAFTS]",
    `draft_quests: ${fmtQuests(draftQuests)}`,
  ].join("\n");

  // ---------- [USER_ACTIVE_QUESTS] ----------
  const { data: activeQuestsData } = await sb
    .from("quest_participants")
    .select("quest_id, role, quests(id, title, status, quest_type, description, is_draft)")
    .eq("user_id", userId)
    .in("status", ["ACTIVE", "ACCEPTED"])
    .order("created_at", { ascending: false })
    .limit(15);

  const activeQuests = (activeQuestsData || [])
    .filter((qp: any) => qp.quests && !qp.quests.is_deleted)
    .map((qp: any) => qp.quests);

  const activeQuestsSection = [
    "[USER_ACTIVE_QUESTS]",
    activeQuests.length
      ? activeQuests.map((q: any) => `"${q.title}" (id: ${q.id}, status: ${q.status}, type: ${q.quest_type || "?"}, draft: ${q.is_draft})`).join("; ")
      : "none",
  ].join("\n");

  // ---------- [USER_GUILDS_FULL] ----------
  const userGuildsSection = memberships.length
    ? "[USER_GUILDS_FULL]\n" + memberships.map((m: any) => `"${m.guilds?.name || "?"}" (id: ${m.guild_id}, role: ${m.role})`).join("; ")
    : "[USER_GUILDS_FULL]\nnone";

  // ---------- [USER_SERVICES] ----------
  const { data: userServicesData } = await sb
    .from("services")
    .select("id, name, is_active")
    .eq("provider_user_id", userId)
    .eq("is_deleted", false)
    .limit(10);

  const userServicesSection = [
    "[USER_SERVICES]",
    (userServicesData || []).length
      ? (userServicesData || []).map((s: any) => `"${s.name}" (id: ${s.id}, active: ${s.is_active})`).join("; ")
      : "none",
  ].join("\n");

  // ---------- [ASSISTANT_HISTORY] ----------
  let historySection = "[ASSISTANT_HISTORY]\nlast_actions: none";
  if (sessionId) {
    const { data: recentMsgs } = await sb
      .from("assistant_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1);

    if (recentMsgs?.length) {
      const lastContent = recentMsgs[0].content;
      const acts = lastContent?.actions || lastContent?.actionsExecuted;
      if (Array.isArray(acts) && acts.length) {
        const short = acts
          .filter((a: any) => a.success)
          .map((a: any) => {
            if (a.createdEntity) return `created ${a.createdEntity.type}(${a.createdEntity.id})`;
            if (a.updatedEntity) return `updated ${a.updatedEntity.type}(${a.updatedEntity.id})`;
            if (a.link) return `linked ${a.link.fromType}→${a.link.relation}→${a.link.toType}`;
            return a.name;
          })
          .join("; ");
        if (short) historySection = `[ASSISTANT_HISTORY]\nlast_actions: ${short}`;
      }
    }
  }

  // ---------- Assemble ----------
  return [userSection, "", contextSection, "", nearbySection, "", draftsSection, "", activeQuestsSection, "", userGuildsSection, "", userServicesSection, "", historySection]
    .filter(Boolean)
    .join("\n");
}

function fmtQuests(qs: any[]): string {
  return qs.length
    ? qs.map((q: any) => `"${q.title}" (id: ${q.id}, status: ${q.status || "?"}${q.is_draft ? ", draft" : ""})`).join("; ")
    : "none";
}

// =====================================================================
// System prompt with context-specific behavioral hints
// =====================================================================
function buildSystemPrompt(contextSummary: string, contextType: string): string {
  // Context-specific behavioral nudges
  const contextHints: Record<string, string> = {
    territory: `
TERRITORY CONTEXT BEHAVIOR:
- Strongly prefer creating quests + living_systems + events anchored in this territory.
- When user describes an initiative, create a quest AND link it to the territory with anchored_in.
- If natural ecosystems are mentioned (forests, rivers, wetlands, soil, agro-ecology), create or find a living_system and link it.
- Look for existing guilds in the territory to affiliate quests with.
- Suggest events when user describes gatherings, residencies, or meetings.`,
    guild: `
GUILD CONTEXT BEHAVIOR:
- Prefer creating quests + services affiliated with this guild.
- When user describes a project, create a quest and use belongs_to to link it to this guild.
- If user describes offerings or skillshares, create a service.
- Check if draft quests exist in this guild before creating new ones – prefer updating drafts.
- Suggest rituals or events when user describes recurring activities.`,
    quest: `
QUEST CONTEXT BEHAVIOR:
- Focus on REFINING the current quest rather than creating new quests.
- Use update_entity to add description, dates, participants, territory links.
- If user mentions guilds or companies, link them with belongs_to or partner_with.
- If user mentions natural systems, link with involves_living_system.
- Only create NEW entities if clearly needed (e.g. a linked event, a new living_system).`,
    onboarding: `
ONBOARDING CONTEXT BEHAVIOR:
- Help user define their profile, interests, and territory.
- Suggest guilds to join based on their interests.
- Create a first draft quest if user describes a project or mission.
- Keep actions minimal and focused on getting the user started.`,
    global: `
GLOBAL CONTEXT BEHAVIOR:
- Act as a general guide – help route user to the right context.
- Create entities as needed but always try to anchor them to territories and guilds.
- If user mentions a specific guild, quest, or territory by name, use existing IDs from context.`,
  };

  return `You are the CTG Conversational Guide.

Goal:
- Help users express their needs in natural language.
- Transform these needs into structured CTG entities (Users, Guilds, Quests, Services, Territories, Events, Living Systems, Posts).
- Whenever possible, create or pre-fill entities and connect them together.
- Always keep track of the current context: onboarding, guild page, quest page, territory dashboard, or global.
- After performing actions, answer the user in clear, concise language in their language (French or English depending on input).

You have access to these abstract actions (the server will execute them):
1) create_entity(type, fields) → creates a new entity
2) update_entity(type, id, fields) → updates an existing entity
3) link_entities(from_type, from_id, relation, to_type, to_id) → connects two entities
4) prefill_form(type, draft_id, fields) → pre-fills/creates a draft entity
5) create_discussion_room(scope_type, scope_id, name, description?) → creates a discussion room in a guild or quest. scope_type is "GUILD" or "QUEST", scope_id is the entity id.
6) add_subtask(quest_id, title, description?) → adds a subtask to an existing quest

Valid entity types: user, guild, quest, service, territory, event, living_system, post

Valid relations:
- belongs_to: quest/service → guild or company (creates an affiliation)
- anchored_in: any entity → territory (links to a territory)
- uses: entity → service
- involves: entity → entity (generic involvement)
- member_of: user → guild (adds as member)
- follows: user → any entity (creates a follow)
- involves_living_system: quest/guild/territory → living_system (links to a natural system)
- partner_with: quest → guild/company (creates a partnership affiliation)

IMPORTANT schema notes:
- Quests require: title (string), created_by_user_id (auto-injected). Optional: description, quest_type, status (DRAFT/IDEA/ACTIVE), is_draft (boolean).
- Guild events require: title (string), guild_id (string), start_at (ISO datetime), created_by_user_id (auto-injected).
- Posts (feed_posts) require: author_user_id (auto-injected). Optional: content, context_type (global/guild/quest/user), context_id.
- Natural systems require: name (string). Optional: description, territory_id, kingdom (fauna/flora/fungi/microbiome/mineral/mixed), system_type, type.
- Services require: name (string). Optional: description, guild_id.
- When creating a quest linked to a guild, create the quest first, then use link_entities with belongs_to.
- For territory links, use link_entities with anchored_in after creating the entity.
- Include raw_input in fields when creating entities to preserve the user's original text.
- For IDs of entities created in the same call, use placeholder "$last_<type>" (e.g. "$last_quest", "$last_guild") and the server will resolve them.
- ALWAYS use actual UUIDs from the context summary when referencing existing entities.

CRITICAL — EXISTING ENTITY AWARENESS:
- BEFORE proposing to create a new quest, ALWAYS check [USER_ACTIVE_QUESTS] and [DRAFTS] for quests with similar titles or themes.
- If a matching quest already exists, prefer update_entity or add_subtask on the existing quest instead of creating a new one.
- Use fuzzy matching: "Reach out to potential partners" should match "Reach to other networks" or "Oslo Project – Reach to other networks".
- When adding tasks/steps to a project, use add_subtask(quest_id, title, description) to add them to the existing quest.
- Similarly, check [USER_GUILDS_FULL] before creating guilds, and [USER_SERVICES] before creating services.
- Only create a new entity if no similar one exists in the user's data.

When user SKIPS proposed actions, include a "followUpSuggestions" array in your response with 2-3 alternative clickable options:
{
  "actions": [],
  "assistant_message": "No problem! Here are some alternatives:",
  "followUpSuggestions": [
    { "label": "Modify the title", "prompt": "Modify the quest title" },
    { "label": "Add to existing quest", "prompt": "Add this as a subtask to my existing quest" },
    { "label": "Search existing quests", "prompt": "Search my quests for something similar" }
  ]
}
${contextHints[contextType] || ""}

Here is the CTG context summary for this conversation:
${contextSummary}

Your output MUST be valid JSON with no markdown fences:
{
  "actions": [
    { "name": "create_entity" | "update_entity" | "link_entities" | "prefill_form" | "add_subtask", "args": { ... } }
  ],
  "assistant_message": "Your answer to the user",
  "followUpSuggestions": [] 
}

Rules:
- Prefer EDIT or PREFILL an existing draft (from [DRAFTS] section) instead of creating duplicates.
- ALWAYS check [USER_ACTIVE_QUESTS] for existing quests before creating new ones. This is CRITICAL.
- Infer as many fields as you safely can (title, description, tags, territories, skills, dates).
- Preserve the richness of the original user text by including it in a raw_input field inside fields when creating entities.
- If a crucial field is missing, still create a draft entity (is_draft: true) and ask a short follow-up question.
- Keep assistant_message short, practical, and focused on what was done and what is needed next.
- If unsure whether to create or reuse, prefer reusing entities mentioned in the context.
- Check [ASSISTANT_HISTORY] to avoid repeating the same actions.
- When providing followUpSuggestions, make them contextually relevant to what was just skipped.`;
}

// =====================================================================
// Enrich actions with context + resolve placeholders
// =====================================================================
function enrichActions(
  actions: any[],
  contextType: string,
  contextId: string | null,
  createdEntities: { type: string; id: string }[]
): any[] {
  return actions.map((action) => {
    if (action.name === "link_entities") {
      const args = { ...action.args };

      // Resolve $last_<type> placeholders
      if (typeof args.from_id === "string" && args.from_id.startsWith("$last_")) {
        const t = args.from_id.replace("$last_", "");
        const match = createdEntities.find((e) => e.type === t);
        if (match) args.from_id = match.id;
      }
      if (typeof args.to_id === "string" && args.to_id.startsWith("$last_")) {
        const t = args.to_id.replace("$last_", "");
        const match = createdEntities.find((e) => e.type === t);
        if (match) args.to_id = match.id;
      }

      // Fill missing IDs from context
      if (!args.from_id && contextType === args.from_type && contextId) {
        args.from_id = contextId;
      }
      if (!args.to_id && contextType === args.to_type && contextId) {
        args.to_id = contextId;
      }

      // Also resolve non-UUID placeholder IDs (e.g. "quest_id_created_above")
      if (args.from_id && !isUUID(args.from_id)) {
        const match = createdEntities.find((e) => e.type === args.from_type);
        if (match) args.from_id = match.id;
      }
      if (args.to_id && !isUUID(args.to_id)) {
        const match = createdEntities.find((e) => e.type === args.to_type);
        if (match) args.to_id = match.id;
      }

      return { ...action, args };
    }
    return action;
  });
}

function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// =====================================================================
// Post-creation hooks: membership, roles, discussion rooms
// =====================================================================
const SUGGESTED_DEFAULT_ROLES = [
  { name: "Source", color: "#6366f1", is_default: true, sort_order: 0 },
  { name: "Admin", color: "#ef4444", is_default: false, sort_order: 1 },
  { name: "Operations", color: "#f59e0b", is_default: false, sort_order: 2 },
  { name: "Active Member", color: "#22c55e", is_default: false, sort_order: 3 },
  { name: "Member", color: "#3b82f6", is_default: false, sort_order: 4 },
];

async function postCreationHooks(sb: any, userId: string, entityType: string, entityId: string) {
  try {
    if (entityType === "guild") {
      // 1. Add creator as ADMIN guild member
      await sb.from("guild_members").insert({
        guild_id: entityId,
        user_id: userId,
        role: "ADMIN",
      });

      // 2. Create default entity roles
      const rolesToInsert = SUGGESTED_DEFAULT_ROLES.map((r) => ({
        entity_type: "guild",
        entity_id: entityId,
        name: r.name,
        color: r.color,
        is_default: r.is_default,
        sort_order: r.sort_order,
      }));
      await sb.from("entity_roles").insert(rolesToInsert);

      // 3. Assign "Source" role to the creator
      const { data: sourceRole } = await sb
        .from("entity_roles")
        .select("id")
        .eq("entity_type", "guild")
        .eq("entity_id", entityId)
        .eq("name", "Source")
        .eq("is_default", true)
        .single();
      if (sourceRole) {
        await sb.from("entity_member_roles").insert({
          entity_role_id: sourceRole.id,
          user_id: userId,
        });
      }

      // 4. Create default discussion room
      await sb.from("discussion_rooms").insert({
        scope_type: "GUILD",
        scope_id: entityId,
        name: "General",
        description: "Default discussion room",
        is_default: true,
        created_by_user_id: userId,
      });

      // 5. Auto-follow
      await sb.from("follows").insert({
        follower_id: userId,
        target_type: "GUILD",
        target_id: entityId,
      });
    }

    if (entityType === "quest") {
      // 1. Add creator as OWNER participant
      await sb.from("quest_participants").insert({
        quest_id: entityId,
        user_id: userId,
        role: "OWNER",
        status: "ACTIVE",
      });

      // 2. Create default entity roles for quest
      const questRoles = SUGGESTED_DEFAULT_ROLES.map((r) => ({
        entity_type: "quest",
        entity_id: entityId,
        name: r.name,
        color: r.color,
        is_default: r.is_default,
        sort_order: r.sort_order,
      }));
      await sb.from("entity_roles").insert(questRoles);

      // 3. Assign "Source" role to the creator
      const { data: questSourceRole } = await sb
        .from("entity_roles")
        .select("id")
        .eq("entity_type", "quest")
        .eq("entity_id", entityId)
        .eq("name", "Source")
        .eq("is_default", true)
        .single();
      if (questSourceRole) {
        await sb.from("entity_member_roles").insert({
          entity_role_id: questSourceRole.id,
          user_id: userId,
        });
      }

      // 4. Create default discussion room
      await sb.from("discussion_rooms").insert({
        scope_type: "QUEST",
        scope_id: entityId,
        name: "General",
        description: "Default discussion room",
        is_default: true,
        created_by_user_id: userId,
      });

      // 5. Auto-follow
      await sb.from("follows").insert({
        follower_id: userId,
        target_type: "QUEST",
        target_id: entityId,
      });
    }
  } catch (e: any) {
    // Non-fatal: log but don't fail the creation
    console.warn("postCreationHooks warning:", e.message ?? e);
  }
}

// =====================================================================
// Main handler
// =====================================================================
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
    const body = await req.json();
    const { message, contextType, contextId, sessionId, mode = "propose", pendingActions } = body;

    // --- Ping test ---
    if (message === "__ping") {
      return jsonRes({
        sessionId: sessionId || "test",
        assistantMessage: "pong",
        proposedActions: [],
        actionsExecuted: [],
        createdEntities: [],
        updatedEntities: [],
        links: [],
      });
    }

    // =====================================================================
    // MODE: undo — soft-delete created entities
    // =====================================================================
    if (mode === "undo") {
      const { createdEntities: toUndo = [] } = body;
      const undone: any[] = [];
      for (const ent of toUndo) {
        const table = ent.type === "discussion_room" ? "discussion_rooms" : ENTITY_TABLE[ent.type];
        if (!table) continue;
        try {
          // Try soft-delete first (is_deleted), fall back to hard delete
          const { error: softErr } = await sb.from(table).update({ is_deleted: true }).eq("id", ent.id);
          if (softErr) {
            // Table might not have is_deleted column; try hard delete
            await sb.from(table).delete().eq("id", ent.id);
          }
          undone.push(ent);
        } catch (e: any) {
          console.warn("Undo failed for", ent, e.message);
        }
      }
      return jsonRes({ undone });
    }

    // =====================================================================
    // MODE: execute — run previously proposed actions
    // =====================================================================
    if (mode === "execute" && Array.isArray(pendingActions)) {
      const actionsExecuted: any[] = [];
      const createdEntities: { type: string; id: string }[] = [];
      const updatedEntities: { type: string; id: string }[] = [];
      const links: any[] = [];

      // First pass: create/update
      for (const action of pendingActions) {
        if (action.name !== "create_entity" && action.name !== "prefill_form" && action.name !== "update_entity" && action.name !== "create_discussion_room" && action.name !== "add_subtask") continue;
        const result: any = { name: action.name, args: action.args, success: false };
        try {
          if (action.name === "create_entity" || action.name === "prefill_form") {
            const entityType = action.args?.type;
            const table = ENTITY_TABLE[entityType];
            if (!table) { result.error = `Unknown entity type: ${entityType}`; }
            else {
              const fields = { ...action.args.fields };
              const creatorCol = CREATOR_COLUMN[entityType];
              if (creatorCol && !fields[creatorCol]) fields[creatorCol] = userId;
              if (action.name === "prefill_form" && entityType === "quest") {
                fields.is_draft = true;
                fields.status = fields.status || "DRAFT";
              }
              if (fields.raw_input && entityType !== "user") {
                if (!fields.description) fields.description = fields.raw_input;
                delete fields.raw_input;
              }
              const { data: inserted, error: insertErr } = await sb.from(table).insert(fields).select("id").single();
              if (insertErr) { result.error = insertErr.message; }
              else {
                result.success = true;
                result.createdEntity = { type: entityType, id: inserted.id };
                createdEntities.push(result.createdEntity);
                await postCreationHooks(sb, userId, entityType, inserted.id);
              }
            }
          } else if (action.name === "update_entity") {
            const entityType = action.args?.type;
            const table = ENTITY_TABLE[entityType];
            const entityId = action.args?.id;
            if (!table || !entityId) { result.error = "Missing type or id"; }
            else {
              const fields = { ...action.args.fields };
              if (fields.raw_input) { if (!fields.description) fields.description = fields.raw_input; delete fields.raw_input; }
              const { error: updateErr } = await sb.from(table).update(fields).eq("id", entityId);
              if (updateErr) { result.error = updateErr.message; }
              else { result.success = true; result.updatedEntity = { type: entityType, id: entityId }; updatedEntities.push(result.updatedEntity); }
            }
          } else if (action.name === "create_discussion_room") {
            const scopeType = action.args?.scope_type;
            let scopeId = action.args?.scope_id;
            const roomName = action.args?.name || "Discussion";
            const roomDesc = action.args?.description || null;

            // Resolve $last_ placeholders and context
            if (typeof scopeId === "string" && scopeId.startsWith("$last_")) {
              const t = scopeId.replace("$last_", "");
              const match = createdEntities.find((e) => e.type === t);
              if (match) scopeId = match.id;
            }
            if (!scopeId && contextId) scopeId = contextId;

            if (!scopeType || !scopeId) { result.error = "Missing scope_type or scope_id"; }
            else {
              // Get max sort_order
              const { data: existingRooms } = await sb.from("discussion_rooms")
                .select("sort_order")
                .eq("scope_type", scopeType)
                .eq("scope_id", scopeId)
                .order("sort_order", { ascending: false })
                .limit(1);
              const maxSort = existingRooms?.[0]?.sort_order ?? -1;

              const { data: newRoom, error: roomErr } = await sb.from("discussion_rooms").insert({
                scope_type: scopeType,
                scope_id: scopeId,
                name: roomName,
                description: roomDesc,
                is_default: false,
                created_by_user_id: userId,
                sort_order: maxSort + 1,
              }).select("id").single();
              if (roomErr) { result.error = roomErr.message; }
              else {
                result.success = true;
                result.createdEntity = { type: "discussion_room", id: newRoom.id };
                createdEntities.push(result.createdEntity);
              }
            }
          }
        } catch (e: any) { result.error = e.message ?? String(e); }
        actionsExecuted.push(result);
      }

      // Second pass: links
      const linkActions = pendingActions.filter((a: any) => a.name === "link_entities");
      const enrichedLinks = enrichActions(linkActions, contextType, contextId || null, createdEntities);
      for (const action of enrichedLinks) {
        const { from_type, from_id, relation, to_type, to_id } = action.args || {};
        const result: any = { name: action.name, args: action.args, success: false };
        if (!from_id || !to_id) { result.error = `Missing IDs`; actionsExecuted.push(result); continue; }
        try {
          const linkResult = await executeLink(sb, userId, from_type, from_id, relation, to_type, to_id);
          result.success = linkResult.success;
          result.error = linkResult.error;
          if (linkResult.success) { result.link = { fromType: from_type, fromId: from_id, relation, toType: to_type, toId: to_id }; links.push(result.link); }
        } catch (e: any) { result.error = e.message ?? String(e); }
        actionsExecuted.push(result);
      }

      // Store in conversation
      if (sessionId) {
        await sb.from("assistant_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: { text: "[Actions executed]", actions: actionsExecuted },
        });
      }

      return jsonRes({ actionsExecuted, createdEntities, updatedEntities, links });
    }

    // =====================================================================
    // MODE: propose (default) — call LLM, return proposed actions
    // =====================================================================

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
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let query = sb
        .from("assistant_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("context_type", contextType)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1);
      if (contextId) query = query.eq("context_id", contextId);

      const { data: recent } = await query;
      if (recent && recent.length > 0) {
        effectiveSessionId = recent[0].id;
      } else {
        const { data: newSession, error: sessErr } = await sb
          .from("assistant_sessions")
          .insert({ user_id: userId, context_type: contextType, context_id: contextId || null })
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
      .limit(20);

    const historyMessages = (historyRows || []).map((r: any) => ({
      role: r.role as string,
      content: typeof r.content === "object" ? r.content.text || JSON.stringify(r.content) : String(r.content),
    }));

    // --- Build context ---
    const contextSummary = await buildContextSummary(sb, userId, contextType, contextId || null, effectiveSessionId);
    const systemPrompt = buildSystemPrompt(contextSummary, contextType);

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
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: llmMessages, temperature: 0.4 }),
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
      const cleaned = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { actions: [], assistant_message: rawContent || "I'm here to help – could you rephrase?" };
    }

    // --- Store conversation messages ---
    await sb.from("assistant_messages").insert([
      { session_id: effectiveSessionId, role: "user", content: { text: message } },
      {
        session_id: effectiveSessionId,
        role: "assistant",
        content: { text: parsed.assistant_message, proposedActions: parsed.actions },
      },
    ]);

    // --- Return proposed actions (NOT executed) ---
    return jsonRes({
      sessionId: effectiveSessionId,
      assistantMessage: parsed.assistant_message,
      proposedActions: parsed.actions || [],
    });
  } catch (e: any) {
    console.error("ctg-guide error:", e);
    return jsonRes({ error: e.message ?? "Internal error" }, 500);
  }
});
