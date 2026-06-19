// guild-agent — admin API for managing a guild's AI agent (RAG-based)
// Actions:
//   get_agent, upsert_agent
//   list_sources, add_source (manual/url), delete_source, resync_source
//   list_documents, list_conversations, list_messages
//   chat (authenticated guild member chatting with the agent through the web widget)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const EMBEDDING_MODEL = "openai/text-embedding-3-small"; // 1536 dims
const EMBEDDING_DIMS = 1536;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function assertGuildAdmin(userId: string, guildId: string) {
  const { data } = await admin
    .from("guild_members")
    .select("role")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.role !== "ADMIN") {
    throw new Error("forbidden: guild admin required");
  }
}

async function assertGuildMember(userId: string, guildId: string) {
  const { data } = await admin
    .from("guild_members")
    .select("user_id")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("forbidden: guild member required");
}

async function loadAgentGuild(agentId: string): Promise<string> {
  const { data, error } = await admin
    .from("guild_agents")
    .select("guild_id")
    .eq("id", agentId)
    .maybeSingle();
  if (error || !data) throw new Error("agent not found");
  return data.guild_id as string;
}

// ---------- Embeddings ----------
async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMS,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`embeddings failed [${res.status}]: ${body}`);
  }
  const data = await res.json();
  return data.data.map((d: any) => d.embedding as number[]);
}

function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

async function fetchUrlAsText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "changethegame-agent-ingest/1.0" },
  });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  const html = await res.text();
  // very simple html → text strip
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function ingestSource(sourceId: string) {
  const { data: source } = await admin
    .from("guild_agent_sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (!source) throw new Error("source not found");

  await admin
    .from("guild_agent_sources")
    .update({ status: "syncing", last_error: null })
    .eq("id", sourceId);

  try {
    let text = "";
    let title = source.title ?? "";

    if (source.type === "manual") {
      text = (source.config as any)?.content ?? "";
    } else if (source.type === "url") {
      const url = (source.config as any)?.url;
      if (!url) throw new Error("url config missing");
      text = await fetchUrlAsText(url);
      if (!title) title = url;
    } else {
      throw new Error(`source type ${source.type} not yet supported`);
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await admin
        .from("guild_agent_sources")
        .update({ status: "ready", last_sync_at: new Date().toISOString(), document_count: 0 })
        .eq("id", sourceId);
      return { chunks: 0 };
    }

    // delete old chunks for this source
    await admin.from("guild_agent_documents").delete().eq("source_id", sourceId);

    // embed in small batches
    const BATCH = 32;
    let inserted = 0;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const embeddings = await embedTexts(batch);
      const rows = batch.map((content, idx) => ({
        agent_id: source.agent_id,
        source_id: source.id,
        title,
        chunk_index: i + idx,
        content,
        embedding: embeddings[idx] as unknown as string,
        metadata: { source_type: source.type },
      }));
      const { error } = await admin.from("guild_agent_documents").insert(rows);
      if (error) throw new Error(`insert chunks failed: ${error.message}`);
      inserted += rows.length;
    }

    await admin
      .from("guild_agent_sources")
      .update({
        status: "ready",
        last_sync_at: new Date().toISOString(),
        document_count: inserted,
        last_error: null,
      })
      .eq("id", sourceId);

    return { chunks: inserted };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin
      .from("guild_agent_sources")
      .update({ status: "error", last_error: msg })
      .eq("id", sourceId);
    throw e;
  }
}

// ---------- Chat / RAG ----------
async function answerWithRag(params: {
  agentId: string;
  conversationId: string;
  userMessage: string;
}) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const { data: agent } = await admin
    .from("guild_agents")
    .select("*, guilds(name)")
    .eq("id", params.agentId)
    .maybeSingle();
  if (!agent) throw new Error("agent not found");

  // 1. Embed the question
  const [queryEmbedding] = await embedTexts([params.userMessage]);

  // 2. Retrieve
  const { data: matches } = await admin.rpc("match_guild_agent_documents", {
    p_agent_id: params.agentId,
    p_query_embedding: queryEmbedding as unknown as string,
    p_match_count: 5,
  });

  const context = (matches ?? [])
    .map(
      (m: any, i: number) =>
        `[${i + 1}] ${m.title ? m.title + " — " : ""}${m.content}`,
    )
    .join("\n\n");

  // 3. Load short history (last 10 messages)
  const { data: history } = await admin
    .from("guild_agent_messages")
    .select("role, content")
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const systemPrompt = `${agent.persona_prompt}

You are the AI agent of the guild "${(agent as any).guilds?.name ?? ""}".
When the user asks a question, use the CONTEXT below if relevant. If the context is empty or unrelated, answer from your own general knowledge and tell the user the answer is not based on the guild's documents. Cite snippets as [1], [2]…

CONTEXT:
${context || "(no internal documents matched)"}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: params.userMessage },
  ];

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: agent.model || "google/gemini-2.5-flash",
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`chat completion failed [${res.status}]: ${body}`);
  }
  const data = await res.json();
  const reply: string = data.choices?.[0]?.message?.content ?? "";

  // 4. Persist messages
  await admin.from("guild_agent_messages").insert([
    { conversation_id: params.conversationId, role: "user", content: params.userMessage },
    {
      conversation_id: params.conversationId,
      role: "assistant",
      content: reply,
      metadata: { citations: (matches ?? []).map((m: any) => ({ id: m.id, title: m.title })) },
    },
  ]);
  await admin
    .from("guild_agent_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId);

  return { reply, citations: matches ?? [] };
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const userId = await getUserId(req);
  if (!userId) return json({ error: "unauthorized" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const action = body.action as string;
  if (!action) return json({ error: "action required" }, 400);

  try {
    switch (action) {
      case "get_agent": {
        const guildId = body.guild_id as string;
        if (!guildId) return json({ error: "guild_id required" }, 400);
        await assertGuildMember(userId, guildId);
        const { data } = await admin
          .from("guild_agents")
          .select("*")
          .eq("guild_id", guildId)
          .maybeSingle();
        return json({ agent: data });
      }

      case "upsert_agent": {
        const guildId = body.guild_id as string;
        if (!guildId) return json({ error: "guild_id required" }, 400);
        await assertGuildAdmin(userId, guildId);
        const payload = {
          guild_id: guildId,
          name: body.name ?? "Agent",
          persona_prompt: body.persona_prompt ?? undefined,
          model: body.model ?? undefined,
          avatar_url: body.avatar_url ?? null,
          status: body.status ?? "active",
          allow_mcp_write: body.allow_mcp_write ?? false,
          created_by: userId,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await admin
          .from("guild_agents")
          .upsert(payload, { onConflict: "guild_id" })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return json({ agent: data });
      }

      case "list_sources": {
        const agentId = body.agent_id as string;
        const guildId = await loadAgentGuild(agentId);
        await assertGuildAdmin(userId, guildId);
        const { data } = await admin
          .from("guild_agent_sources")
          .select("*")
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false });
        return json({ sources: data ?? [] });
      }

      case "add_source": {
        const agentId = body.agent_id as string;
        const guildId = await loadAgentGuild(agentId);
        await assertGuildAdmin(userId, guildId);
        const type = body.type as string;
        if (!["manual", "url"].includes(type)) {
          return json({ error: `type ${type} not yet supported` }, 400);
        }
        const { data: source, error } = await admin
          .from("guild_agent_sources")
          .insert({
            agent_id: agentId,
            type,
            title: body.title ?? null,
            config: body.config ?? {},
            created_by: userId,
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        // fire-and-forget ingest
        EdgeRuntime.waitUntil(ingestSource(source.id).catch(() => {}));
        return json({ source });
      }

      case "resync_source": {
        const sourceId = body.source_id as string;
        const { data: src } = await admin
          .from("guild_agent_sources")
          .select("agent_id")
          .eq("id", sourceId)
          .maybeSingle();
        if (!src) return json({ error: "source not found" }, 404);
        const guildId = await loadAgentGuild(src.agent_id);
        await assertGuildAdmin(userId, guildId);
        EdgeRuntime.waitUntil(ingestSource(sourceId).catch(() => {}));
        return json({ ok: true });
      }

      case "delete_source": {
        const sourceId = body.source_id as string;
        const { data: src } = await admin
          .from("guild_agent_sources")
          .select("agent_id")
          .eq("id", sourceId)
          .maybeSingle();
        if (!src) return json({ error: "source not found" }, 404);
        const guildId = await loadAgentGuild(src.agent_id);
        await assertGuildAdmin(userId, guildId);
        await admin.from("guild_agent_sources").delete().eq("id", sourceId);
        return json({ ok: true });
      }

      case "list_conversations": {
        const agentId = body.agent_id as string;
        const guildId = await loadAgentGuild(agentId);
        await assertGuildAdmin(userId, guildId);
        const { data } = await admin
          .from("guild_agent_conversations")
          .select("*")
          .eq("agent_id", agentId)
          .order("last_message_at", { ascending: false })
          .limit(50);
        return json({ conversations: data ?? [] });
      }

      case "list_messages": {
        const conversationId = body.conversation_id as string;
        const { data: conv } = await admin
          .from("guild_agent_conversations")
          .select("agent_id, member_user_id")
          .eq("id", conversationId)
          .maybeSingle();
        if (!conv) return json({ error: "conversation not found" }, 404);
        if (conv.member_user_id !== userId) {
          const guildId = await loadAgentGuild(conv.agent_id);
          await assertGuildAdmin(userId, guildId);
        }
        const { data } = await admin
          .from("guild_agent_messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });
        return json({ messages: data ?? [] });
      }

      case "chat": {
        // Guild member chatting with the agent via the web widget.
        const agentId = body.agent_id as string;
        const message = String(body.message ?? "").trim();
        if (!agentId || !message) return json({ error: "agent_id and message required" }, 400);
        const guildId = await loadAgentGuild(agentId);
        await assertGuildMember(userId, guildId);

        let conversationId = body.conversation_id as string | undefined;
        if (!conversationId) {
          const { data, error } = await admin
            .from("guild_agent_conversations")
            .insert({
              agent_id: agentId,
              member_user_id: userId,
              title: message.slice(0, 80),
            })
            .select()
            .single();
          if (error) throw new Error(error.message);
          conversationId = data.id;
        }

        const result = await answerWithRag({
          agentId,
          conversationId: conversationId!,
          userMessage: message,
        });
        return json({ conversation_id: conversationId, ...result });
      }

      default:
        return json({ error: `unknown action ${action}` }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.startsWith("forbidden") ? 403 : 500;
    return json({ error: msg }, status);
  }
});
