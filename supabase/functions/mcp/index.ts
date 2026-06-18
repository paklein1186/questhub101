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
