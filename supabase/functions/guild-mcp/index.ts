// MCP server for changethegame — exposes guild-scoped tools to external AI agents.
// Auth: per-guild API key passed as `Authorization: Bearer ctg_xxx...` or `X-API-Key: ctg_xxx...`.
// Transport: Streamable HTTP (MCP spec).

import { Hono } from "npm:hono@4";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-client-info, apikey, content-type, accept, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type TokenCtx = {
  guildId: string;
  tokenId: string;
  scopes: string[];
  createdBy: string;
};

async function authenticate(req: Request): Promise<TokenCtx | null> {
  const auth = req.headers.get("authorization") ?? "";
  const apiKey =
    req.headers.get("x-api-key") ??
    (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "");
  if (!apiKey || !apiKey.startsWith("ctg_")) return null;

  const hash = await sha256Hex(apiKey);
  const { data, error } = await admin
    .from("guild_mcp_tokens")
    .select("id, guild_id, scopes, created_by, revoked_at")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return null;

  admin
    .from("guild_mcp_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return {
    guildId: data.guild_id as string,
    tokenId: data.id as string,
    scopes: (data.scopes as string[]) ?? ["read"],
    createdBy: data.created_by as string,
  };
}

// ---------- MCP server factory (per-request, scoped to a guild) ----------

function buildServer(ctx: TokenCtx) {
  const server = new McpServer({
    name: "changethegame-guild",
    version: "0.1.0",
  });

  server.tool({
    name: "list_quests",
    description:
      "List active quests (missions) owned by this guild. Returns id, title, status, description and creation date.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20, maximum: 100 },
        status: {
          type: "string",
          description: "Optional status filter (OPEN, IN_PROGRESS, COMPLETED, ARCHIVED).",
        },
      },
    },
    handler: async ({ limit = 20, status }: { limit?: number; status?: string }) => {
      let q = admin
        .from("quests")
        .select("id, title, description, status, created_at, created_by_user_id")
        .eq("guild_id", ctx.guildId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 100));
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  server.tool({
    name: "list_members",
    description: "List members of this guild with their role.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", default: 50, maximum: 200 } },
    },
    handler: async ({ limit = 50 }: { limit?: number }) => {
      const { data: members, error } = await admin
        .from("guild_members")
        .select("user_id, role, joined_at")
        .eq("guild_id", ctx.guildId)
        .order("joined_at", { ascending: false })
        .limit(Math.min(limit, 200));
      if (error) throw new Error(error.message);
      const ids = (members ?? []).map((m: any) => m.user_id);
      const { data: profiles } = ids.length
        ? await admin.from("profiles").select("id, full_name, username").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const out = (members ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        name: map.get(m.user_id)?.full_name ?? map.get(m.user_id)?.username ?? null,
      }));
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
    },
  });

  server.tool({
    name: "list_discussions",
    description: "List recent feed posts (discussions) attached to this guild.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", default: 20, maximum: 50 } },
    },
    handler: async ({ limit = 20 }: { limit?: number }) => {
      const { data, error } = await admin
        .from("feed_posts")
        .select("id, content, author_user_id, created_at, context_type, context_id")
        .eq("context_type", "guild")
        .eq("context_id", ctx.guildId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 50));
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  server.tool({
    name: "create_post",
    description:
      "Publish a new feed post attached to this guild. Authored as the user who created the MCP token.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", minLength: 1, maxLength: 5000 },
      },
      required: ["content"],
    },
    handler: async ({ content }: { content: string }) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      const { data, error } = await admin
        .from("feed_posts")
        .insert({
          author_user_id: ctx.createdBy,
          content: content.trim(),
          context_type: "guild",
          context_id: ctx.guildId,
        })
        .select("id, created_at")
        .single();
      if (error) throw new Error(error.message);
      return {
        content: [{ type: "text", text: `Post created: ${data.id} at ${data.created_at}` }],
      };
    },
  });

  server.tool({
    name: "log_contribution",
    description:
      "Log a contribution (TIME by default) on behalf of the token owner, attached to this guild and optionally a quest.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200 },
        description: { type: "string", maxLength: 2000 },
        quest_id: { type: "string", description: "Optional quest UUID" },
        hours: { type: "number", minimum: 0 },
        contribution_type: {
          type: "string",
          description: "TIME | EXPENSES | SUPPLIES | EQUIPMENT | KNOWLEDGE",
          default: "TIME",
        },
      },
      required: ["title"],
    },
    handler: async (args: any) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      const { data, error } = await admin
        .from("contribution_logs")
        .insert({
          user_id: ctx.createdBy,
          guild_id: ctx.guildId,
          quest_id: args.quest_id ?? null,
          title: args.title,
          description: args.description ?? null,
          hours_logged: args.hours ?? null,
          contribution_type: args.contribution_type ?? "TIME",
        })
        .select("id, created_at")
        .single();
      if (error) throw new Error(error.message);
      return {
        content: [
          { type: "text", text: `Contribution logged: ${data.id} at ${data.created_at}` },
        ],
      };
    },
  });

  // ---------- Extended read tools ----------

  server.tool({
    name: "whoami",
    description: "Return info about the current MCP token: guild id, scopes, owner.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const { data: g } = await admin
        .from("guilds")
        .select("id, name, type, description")
        .eq("id", ctx.guildId)
        .maybeSingle();
      const out = { guild: g, scopes: ctx.scopes, token_owner_user_id: ctx.createdBy };
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
    },
  });

  server.tool({
    name: "get_guild_overview",
    description:
      "Return a guild dashboard snapshot: profile, member count, balances, recent activity counters.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const [guild, members, quests, events] = await Promise.all([
        admin
          .from("guilds")
          .select(
            "id, name, type, description, website_url, governance_model, coins_balance, credits_balance, created_at",
          )
          .eq("id", ctx.guildId)
          .maybeSingle(),
        admin
          .from("guild_members")
          .select("user_id", { count: "exact", head: true })
          .eq("guild_id", ctx.guildId),
        admin
          .from("quests")
          .select("id", { count: "exact", head: true })
          .eq("guild_id", ctx.guildId)
          .eq("is_deleted", false),
        admin
          .from("guild_events")
          .select("id", { count: "exact", head: true })
          .eq("guild_id", ctx.guildId)
          .eq("is_cancelled", false),
      ]);
      const out = {
        guild: guild.data,
        member_count: members.count ?? 0,
        quest_count: quests.count ?? 0,
        upcoming_event_count: events.count ?? 0,
      };
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
    },
  });

  server.tool({
    name: "get_quest_detail",
    description:
      "Return a full quest snapshot: metadata, participants, subtasks, needs, attachments, recent updates.",
    inputSchema: {
      type: "object",
      properties: { quest_id: { type: "string" } },
      required: ["quest_id"],
    },
    handler: async ({ quest_id }: { quest_id: string }) => {
      const { data: quest, error } = await admin
        .from("quests")
        .select("*")
        .eq("id", quest_id)
        .eq("guild_id", ctx.guildId)
        .eq("is_deleted", false)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!quest) throw new Error("Quest not found in this guild.");

      const [subs, needs, parts, atts, updates] = await Promise.all([
        admin
          .from("quest_subtasks")
          .select("id, title, description, status, assignee_user_id, due_date, priority, order_index")
          .eq("quest_id", quest_id)
          .order("order_index", { ascending: true }),
        admin
          .from("quest_needs")
          .select("id, title, description, category, status")
          .eq("quest_id", quest_id),
        admin
          .from("quest_participants")
          .select("user_id, role, status")
          .eq("quest_id", quest_id),
        admin
          .from("attachments")
          .select("id, title, file_name, file_url, mime_type, file_size, uploaded_by_user_id, created_at")
          .eq("target_type", "quest")
          .eq("target_id", quest_id)
          .order("created_at", { ascending: false })
          .limit(50),
        admin
          .from("quest_updates")
          .select("id, content, created_at, author_user_id")
          .eq("quest_id", quest_id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const out = {
        quest,
        subtasks: subs.data ?? [],
        needs: needs.data ?? [],
        participants: parts.data ?? [],
        attachments: atts.data ?? [],
        recent_updates: updates.data ?? [],
      };
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
    },
  });

  server.tool({
    name: "list_subtasks",
    description: "List subtasks (Kanban items) for a quest in this guild.",
    inputSchema: {
      type: "object",
      properties: {
        quest_id: { type: "string" },
        status: { type: "string", description: "TODO | IN_PROGRESS | DONE | BLOCKED" },
      },
      required: ["quest_id"],
    },
    handler: async ({ quest_id, status }: { quest_id: string; status?: string }) => {
      // Verify quest belongs to guild
      const { data: q } = await admin
        .from("quests")
        .select("id")
        .eq("id", quest_id)
        .eq("guild_id", ctx.guildId)
        .maybeSingle();
      if (!q) throw new Error("Quest not found in this guild.");

      let query = admin
        .from("quest_subtasks")
        .select(
          "id, title, description, status, assignee_user_id, assignee_user_ids, due_date, priority, order_index, credit_reward, ctg_reward, xp_reward",
        )
        .eq("quest_id", quest_id)
        .order("order_index", { ascending: true });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  server.tool({
    name: "list_attachments",
    description: "List files attached to a target (quest, post, guild).",
    inputSchema: {
      type: "object",
      properties: {
        target_type: { type: "string", description: "quest | post | guild" },
        target_id: { type: "string" },
      },
      required: ["target_type", "target_id"],
    },
    handler: async ({ target_type, target_id }: { target_type: string; target_id: string }) => {
      // Guild-scope guard for quest/guild targets
      if (target_type === "quest") {
        const { data } = await admin
          .from("quests")
          .select("id")
          .eq("id", target_id)
          .eq("guild_id", ctx.guildId)
          .maybeSingle();
        if (!data) throw new Error("Quest not in this guild.");
      } else if (target_type === "guild" && target_id !== ctx.guildId) {
        throw new Error("Token not authorized for this guild.");
      }
      const { data, error } = await admin
        .from("attachments")
        .select("id, title, file_name, file_url, mime_type, file_size, uploaded_by_user_id, created_at")
        .eq("target_type", target_type)
        .eq("target_id", target_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  server.tool({
    name: "list_events",
    description: "List upcoming or recent guild events (rituals, gatherings, calls).",
    inputSchema: {
      type: "object",
      properties: {
        upcoming_only: { type: "boolean", default: true },
        limit: { type: "number", default: 20, maximum: 100 },
      },
    },
    handler: async ({ upcoming_only = true, limit = 20 }: { upcoming_only?: boolean; limit?: number }) => {
      let q = admin
        .from("guild_events")
        .select("id, title, description, start_at, end_at, location_type, location_text, call_url, status, is_cancelled")
        .eq("guild_id", ctx.guildId)
        .eq("is_cancelled", false);
      if (upcoming_only) q = q.gte("start_at", new Date().toISOString()).order("start_at", { ascending: true });
      else q = q.order("start_at", { ascending: false });
      const { data, error } = await q.limit(Math.min(limit, 100));
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  server.tool({
    name: "list_decisions",
    description: "List governance polls/decisions for this guild.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "DRAFT | OPEN | CLOSED" },
        limit: { type: "number", default: 20, maximum: 50 },
      },
    },
    handler: async ({ status, limit = 20 }: { status?: string; limit?: number }) => {
      let q = admin
        .from("decision_polls")
        .select("id, question, description, status, decision_type, opens_at, closes_at, created_at")
        .eq("entity_type", "guild")
        .eq("entity_id", ctx.guildId)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 50));
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  server.tool({
    name: "search_posts",
    description: "Full-text search recent feed posts in this guild by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 2 },
        limit: { type: "number", default: 20, maximum: 50 },
      },
      required: ["query"],
    },
    handler: async ({ query, limit = 20 }: { query: string; limit?: number }) => {
      const { data, error } = await admin
        .from("feed_posts")
        .select("id, content, author_user_id, created_at")
        .eq("context_type", "guild")
        .eq("context_id", ctx.guildId)
        .eq("is_deleted", false)
        .ilike("content", `%${query.replace(/[%_]/g, "")}%`)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 50));
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  // ---------- Extended write tools (require `write` scope) ----------

  server.tool({
    name: "create_subtask",
    description: "Create a new subtask on a quest belonging to this guild. Optionally assign a user.",
    inputSchema: {
      type: "object",
      properties: {
        quest_id: { type: "string" },
        title: { type: "string", minLength: 1, maxLength: 200 },
        description: { type: "string", maxLength: 2000 },
        assignee_user_id: { type: "string" },
        due_date: { type: "string", description: "ISO date" },
        priority: { type: "string", description: "LOW | MEDIUM | HIGH" },
      },
      required: ["quest_id", "title"],
    },
    handler: async (args: any) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      const { data: q } = await admin
        .from("quests")
        .select("id")
        .eq("id", args.quest_id)
        .eq("guild_id", ctx.guildId)
        .maybeSingle();
      if (!q) throw new Error("Quest not found in this guild.");
      const { data, error } = await admin
        .from("quest_subtasks")
        .insert({
          quest_id: args.quest_id,
          title: args.title,
          description: args.description ?? null,
          assignee_user_id: args.assignee_user_id ?? null,
          due_date: args.due_date ?? null,
          priority: args.priority ?? "MEDIUM",
          status: "TODO",
        })
        .select("id, created_at")
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: `Subtask created: ${data.id}` }] };
    },
  });

  server.tool({
    name: "update_subtask_status",
    description: "Update a subtask status (TODO, IN_PROGRESS, DONE, BLOCKED).",
    inputSchema: {
      type: "object",
      properties: {
        subtask_id: { type: "string" },
        status: { type: "string" },
      },
      required: ["subtask_id", "status"],
    },
    handler: async ({ subtask_id, status }: { subtask_id: string; status: string }) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      // Guild-scope guard via join
      const { data: sub } = await admin
        .from("quest_subtasks")
        .select("id, quest_id, quests:quest_id(guild_id)")
        .eq("id", subtask_id)
        .maybeSingle();
      if (!sub || (sub as any).quests?.guild_id !== ctx.guildId)
        throw new Error("Subtask not in this guild.");
      const patch: any = { status };
      if (status === "DONE") {
        patch.completed_at = new Date().toISOString();
        patch.completed_by_user_id = ctx.createdBy;
      }
      const { error } = await admin.from("quest_subtasks").update(patch).eq("id", subtask_id);
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: `Subtask ${subtask_id} → ${status}` }] };
    },
  });

  server.tool({
    name: "create_event",
    description: "Create a guild event (gathering, ritual, call).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200 },
        description: { type: "string", maxLength: 2000 },
        start_at: { type: "string", description: "ISO datetime" },
        end_at: { type: "string", description: "ISO datetime" },
        location_type: { type: "string", description: "online | in_person | hybrid" },
        location_text: { type: "string" },
        call_url: { type: "string" },
      },
      required: ["title", "start_at"],
    },
    handler: async (args: any) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      const { data, error } = await admin
        .from("guild_events")
        .insert({
          guild_id: ctx.guildId,
          title: args.title,
          description: args.description ?? null,
          start_at: args.start_at,
          end_at: args.end_at ?? null,
          location_type: args.location_type ?? "online",
          location_text: args.location_text ?? null,
          call_url: args.call_url ?? null,
          created_by_user_id: ctx.createdBy,
          visibility: "guild",
        })
        .select("id, start_at")
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: `Event created: ${data.id} starts ${data.start_at}` }] };
    },
  });

  server.tool({
    name: "send_direct_message",
    description:
      "Send a direct message to a guild member (1:1). Creates the conversation if needed. Authored as token owner.",
    inputSchema: {
      type: "object",
      properties: {
        recipient_user_id: { type: "string" },
        content: { type: "string", minLength: 1, maxLength: 5000 },
      },
      required: ["recipient_user_id", "content"],
    },
    handler: async ({ recipient_user_id, content }: any) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      // Confirm recipient is a guild member
      const { data: mem } = await admin
        .from("guild_members")
        .select("user_id")
        .eq("guild_id", ctx.guildId)
        .eq("user_id", recipient_user_id)
        .maybeSingle();
      if (!mem) throw new Error("Recipient is not a member of this guild.");

      // Find existing 1:1
      const { data: existing } = await admin
        .from("conversation_participants")
        .select("conversation_id, conversations:conversation_id(is_group)")
        .eq("user_id", ctx.createdBy);
      let conversationId: string | null = null;
      const candidateIds = (existing ?? [])
        .filter((r: any) => r.conversations?.is_group === false)
        .map((r: any) => r.conversation_id);
      if (candidateIds.length) {
        const { data: shared } = await admin
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", recipient_user_id)
          .in("conversation_id", candidateIds);
        conversationId = shared?.[0]?.conversation_id ?? null;
      }
      if (!conversationId) {
        const { data: conv, error: cErr } = await admin
          .from("conversations")
          .insert({ is_group: false, created_by: ctx.createdBy })
          .select("id")
          .single();
        if (cErr) throw new Error(cErr.message);
        conversationId = conv.id;
        const { error: pErr } = await admin.from("conversation_participants").insert([
          { conversation_id: conversationId, user_id: ctx.createdBy },
          { conversation_id: conversationId, user_id: recipient_user_id },
        ]);
        if (pErr) throw new Error(pErr.message);
      }
      const { data: msg, error: mErr } = await admin
        .from("direct_messages")
        .insert({ conversation_id: conversationId, sender_id: ctx.createdBy, content })
        .select("id, created_at")
        .single();
      if (mErr) throw new Error(mErr.message);
      return {
        content: [
          {
            type: "text",
            text: `Message sent in conversation ${conversationId} (id ${msg.id}).`,
          },
        ],
      };
    },
  });

  // ---------- Admin-only / governance tools ----------

  async function assertGuildAdmin() {
    const { data, error } = await admin
      .from("guild_members")
      .select("role")
      .eq("guild_id", ctx.guildId)
      .eq("user_id", ctx.createdBy)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const role = (data?.role ?? "").toString().toLowerCase();
    if (!["admin", "source", "owner"].includes(role)) {
      throw new Error("Token owner is not a guild admin/source.");
    }
  }

  server.tool({
    name: "vote_on_decision",
    description:
      "Cast a vote on a guild decision/poll. `value` may be an option label, an option index (as string), or a consent value ('agree','reserves','objection'). Requires 'write' scope. Voter is the token owner.",
    inputSchema: {
      type: "object",
      properties: {
        poll_id: { type: "string" },
        value: { type: "string" },
        option_index: { type: "number" },
        objection_reason: { type: "string" },
      },
      required: ["poll_id"],
    },
    handler: async ({
      poll_id,
      value,
      option_index,
      objection_reason,
    }: {
      poll_id: string;
      value?: string;
      option_index?: number;
      objection_reason?: string;
    }) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      const { data: poll, error: pErr } = await admin
        .from("decision_polls")
        .select("id, entity_type, entity_id, status")
        .eq("id", poll_id)
        .maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!poll) throw new Error("Poll not found.");
      if (poll.entity_type !== "guild" || poll.entity_id !== ctx.guildId) {
        throw new Error("Poll does not belong to this guild.");
      }
      if (poll.status && poll.status !== "OPEN" && poll.status !== "open") {
        throw new Error(`Poll is ${poll.status}, cannot vote.`);
      }
      const { data, error } = await admin
        .from("decision_poll_votes")
        .upsert(
          {
            poll_id,
            user_id: ctx.createdBy,
            option_index: option_index ?? 0,
            value: value ?? null,
            objection_reason: objection_reason ?? null,
          },
          { onConflict: "poll_id,user_id" },
        )
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: `Vote recorded (id ${data.id}).` }] };
    },
  });

  server.tool({
    name: "create_quest",
    description:
      "Create a new quest (mission) owned by this guild. Returns the created quest id and URL slug. Requires 'write' scope.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        is_draft: { type: "boolean", default: true },
        reward_xp: { type: "number", default: 0 },
        cover_image_url: { type: "string" },
      },
      required: ["title"],
    },
    handler: async ({
      title,
      description,
      is_draft = true,
      reward_xp = 0,
      cover_image_url,
    }: {
      title: string;
      description?: string;
      is_draft?: boolean;
      reward_xp?: number;
      cover_image_url?: string;
    }) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      const { data, error } = await admin
        .from("quests")
        .insert({
          title,
          description: description ?? null,
          cover_image_url: cover_image_url ?? null,
          status: "OPEN",
          reward_xp,
          is_draft,
          guild_id: ctx.guildId,
          owner_type: "guild",
          owner_id: ctx.guildId,
          created_by_user_id: ctx.createdBy,
        })
        .select("id, title, status, is_draft")
        .single();
      if (error) throw new Error(error.message);
      return {
        content: [
          {
            type: "text",
            text: `Quest created.\n${JSON.stringify(data, null, 2)}\nURL: /quest/${data.id}`,
          },
        ],
      };
    },
  });

  server.tool({
    name: "attach_link",
    description:
      "Attach a remote file/link (already-hosted URL) to a quest, guild or post in this guild. Does not upload — references the URL. Requires 'write' scope.",
    inputSchema: {
      type: "object",
      properties: {
        target_type: { type: "string", enum: ["quest", "guild", "post"] },
        target_id: { type: "string" },
        file_url: { type: "string" },
        title: { type: "string" },
        file_name: { type: "string" },
        mime_type: { type: "string" },
      },
      required: ["target_type", "target_id", "file_url"],
    },
    handler: async ({
      target_type,
      target_id,
      file_url,
      title,
      file_name,
      mime_type,
    }: {
      target_type: string;
      target_id: string;
      file_url: string;
      title?: string;
      file_name?: string;
      mime_type?: string;
    }) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      // Guild-scope guard
      if (target_type === "quest") {
        const { data } = await admin
          .from("quests")
          .select("guild_id")
          .eq("id", target_id)
          .maybeSingle();
        if (!data || data.guild_id !== ctx.guildId) throw new Error("Quest not in this guild.");
      } else if (target_type === "guild") {
        if (target_id !== ctx.guildId) throw new Error("Guild id mismatch.");
      } else if (target_type === "post") {
        const { data } = await admin
          .from("feed_posts")
          .select("guild_id")
          .eq("id", target_id)
          .maybeSingle();
        if (!data || data.guild_id !== ctx.guildId) throw new Error("Post not in this guild.");
      }
      const { data, error } = await admin
        .from("attachments")
        .insert({
          target_type,
          target_id,
          file_url,
          title: title ?? null,
          file_name: file_name ?? null,
          mime_type: mime_type ?? null,
          uploaded_by_user_id: ctx.createdBy,
        })
        .select("id, file_url")
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: `Attachment created (id ${data.id}).` }] };
    },
  });

  server.tool({
    name: "award_xp",
    description:
      "Award XP to a guild member. Admin-only (token owner must be guild admin/source). Requires 'write' scope.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string" },
        amount: { type: "number" },
        reason: { type: "string" },
      },
      required: ["user_id", "amount"],
    },
    handler: async ({
      user_id,
      amount,
      reason,
    }: { user_id: string; amount: number; reason?: string }) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      await assertGuildAdmin();
      if (!Number.isFinite(amount) || amount <= 0 || amount > 500) {
        throw new Error("amount must be 1..500.");
      }
      // Recipient must be guild member
      const { data: mem } = await admin
        .from("guild_members")
        .select("user_id")
        .eq("guild_id", ctx.guildId)
        .eq("user_id", user_id)
        .maybeSingle();
      if (!mem) throw new Error("Recipient is not a member of this guild.");
      const { data, error } = await admin
        .from("xp_events")
        .insert({
          user_id,
          type: "GUILD_AWARD",
          amount: Math.floor(amount),
          related_entity_type: "guild",
          related_entity_id: ctx.guildId,
        })
        .select("id, amount")
        .single();
      if (error) throw new Error(error.message);
      if (reason) {
        await admin.from("notifications").insert({
          user_id,
          type: "xp_awarded",
          title: `+${data.amount} XP from your guild`,
          body: reason,
          related_entity_type: "guild",
          related_entity_id: ctx.guildId,
        });
      }
      return { content: [{ type: "text", text: `Awarded ${data.amount} XP (event ${data.id}).` }] };
    },
  });

  server.tool({
    name: "transfer_ctg",
    description:
      "Transfer $CTG from the token owner's wallet to a guild member. Admin-only. Requires 'write' scope.",
    inputSchema: {
      type: "object",
      properties: {
        to_user_id: { type: "string" },
        amount: { type: "number" },
        note: { type: "string" },
      },
      required: ["to_user_id", "amount"],
    },
    handler: async ({
      to_user_id,
      amount,
      note,
    }: { to_user_id: string; amount: number; note?: string }) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      await assertGuildAdmin();
      if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
        throw new Error("amount must be 1..10000.");
      }
      if (to_user_id === ctx.createdBy) throw new Error("Cannot transfer to self.");
      const { data, error } = await admin.rpc("transfer_ctg", {
        p_from_user_id: ctx.createdBy,
        p_to_user_id: to_user_id,
        p_amount: amount,
        p_note: note ?? `MCP transfer from guild ${ctx.guildId}`,
      });
      if (error) throw new Error(error.message);
      return {
        content: [
          { type: "text", text: `Transferred ${amount} $CTG. ${JSON.stringify(data ?? {})}` },
        ],
      };
    },
  });

  server.tool({
    name: "invite_member",
    description:
      "Invite a user to join this guild. Creates a pending guild application and notifies them. Requires 'write' scope.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string" },
        message: { type: "string" },
      },
      required: ["user_id"],
    },
    handler: async ({ user_id, message }: { user_id: string; message?: string }) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      await assertGuildAdmin();
      const { data: existing } = await admin
        .from("guild_members")
        .select("user_id")
        .eq("guild_id", ctx.guildId)
        .eq("user_id", user_id)
        .maybeSingle();
      if (existing) throw new Error("User is already a member.");
      const { data, error } = await admin
        .from("guild_applications")
        .upsert(
          {
            guild_id: ctx.guildId,
            applicant_user_id: user_id,
            status: "invited",
            admin_note: message ?? null,
          },
          { onConflict: "guild_id,applicant_user_id" },
        )
        .select("id, status")
        .single();
      if (error) throw new Error(error.message);
      await admin.from("notifications").insert({
        user_id,
        type: "guild_invite",
        title: "You've been invited to a guild",
        body: message ?? "Open changethegame to accept the invitation.",
        related_entity_type: "guild",
        related_entity_id: ctx.guildId,
      });
      return { content: [{ type: "text", text: `Invite sent (application ${data.id}).` }] };
    },
  });

  server.tool({
    name: "get_member_profile",
    description:
      "Fetch the public profile of a guild member (full name, username, bio, XP, role in this guild).",
    inputSchema: {
      type: "object",
      properties: { user_id: { type: "string" } },
      required: ["user_id"],
    },
    handler: async ({ user_id }: { user_id: string }) => {
      const { data: mem } = await admin
        .from("guild_members")
        .select("role, joined_at")
        .eq("guild_id", ctx.guildId)
        .eq("user_id", user_id)
        .maybeSingle();
      if (!mem) throw new Error("User is not a member of this guild.");
      const { data: profile, error } = await admin
        .from("profiles")
        .select("id, full_name, username, bio, xp_level, avatar_url")
        .eq("id", user_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return {
        content: [
          { type: "text", text: JSON.stringify({ ...profile, guild_role: mem.role, joined_at: mem.joined_at }, null, 2) },
        ],
      };
    },
  });

  server.tool({
    name: "list_contributions",
    description:
      "List recent contribution logs (OCU registry) for this guild — who contributed what, with FMV, hours, status.",
    inputSchema: {
      type: "object",
      properties: {
        quest_id: { type: "string", description: "Optional quest filter." },
        user_id: { type: "string", description: "Optional contributor filter." },
        status: { type: "string", description: "Optional status filter (PENDING, VERIFIED, ...)." },
        limit: { type: "number", default: 30, maximum: 200 },
      },
    },
    handler: async ({
      quest_id,
      user_id,
      status,
      limit = 30,
    }: { quest_id?: string; user_id?: string; status?: string; limit?: number }) => {
      let q = admin
        .from("contribution_logs")
        .select(
          "id, user_id, quest_id, contribution_type, title, hours_logged, fmv_value, xp_earned, credits_earned, ctg_emitted, status, created_at",
        )
        .eq("guild_id", ctx.guildId)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 200));
      if (quest_id) q = q.eq("quest_id", quest_id);
      if (user_id) q = q.eq("user_id", user_id);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  return server;
}

// ---------- HTTP layer ----------

const app = new Hono();

app.options("/*", (c) => new Response("ok", { headers: corsHeaders }));

app.get("/mcp/health", (c) =>
  new Response(JSON.stringify({ ok: true, name: "changethegame-mcp" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  }),
);

app.all("/*", async (c) => {
  const ctx = await authenticate(c.req.raw);
  if (!ctx) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: missing or invalid ctg_ API key." },
        id: null,
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const server = buildServer(ctx);
  const transport = new StreamableHttpTransport();
  const res = await transport.handleRequest(c.req.raw, server);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
});

Deno.serve(app.fetch);
