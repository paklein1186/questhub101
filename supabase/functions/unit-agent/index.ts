import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

async function extractPdfText(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return "";
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.byteLength > 20 * 1024 * 1024) return "";
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    return (text || "").slice(0, 30000);
  } catch (e) {
    console.error("PDF extract failed", url, e);
    return "";
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractDocxText(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return "";
    const buf = await resp.arrayBuffer();
    if (buf.byteLength > 20 * 1024 * 1024) return "";
    const zip = await JSZip.loadAsync(buf);
    const xmlParts = [
      "word/document.xml",
      "word/footnotes.xml",
      "word/endnotes.xml",
    ];
    const chunks: string[] = [];
    for (const part of xmlParts) {
      const file = zip.file(part);
      if (!file) continue;
      const xml = await file.async("text");
      const text = decodeXmlEntities(xml)
        .replace(/<w:tab\/?\s*>/g, "\t")
        .replace(/<w:br\/?\s*>/g, "\n")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s+/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      if (text) chunks.push(text);
    }
    return chunks.join("\n\n").slice(0, 30000);
  } catch (e) {
    console.error("DOCX extract failed", url, e);
    return "";
  }
}

async function extractAttachmentText(att: { url: string; mime_type: string; file_name: string }): Promise<string> {
  const fileName = att.file_name || "document";
  const mime = att.mime_type || "";
  if (/pdf/i.test(mime) || /\.pdf$/i.test(fileName)) return await extractPdfText(att.url);
  if (/wordprocessingml\.document/i.test(mime) || /\.docx$/i.test(fileName)) return await extractDocxText(att.url);
  return "";
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MUSE_MAP: Record<string, { name: string; style: string }> = {
  "house-of-light": { name: "The Prism", style: "Visual, colorful, metaphorical. Speaks in imagery and aesthetics." },
  "house-of-sound": { name: "The Echo", style: "Rhythmic, harmonic, sound-based. Thinks in patterns and resonance." },
  "house-of-story": { name: "The Storykeeper", style: "Narrative, mythic. Weaves meaning through arcs and characters." },
  "house-of-movement": { name: "The Mover", style: "Embodied, flow-based. Thinks through gesture and presence." },
  "house-of-form": { name: "The Shaper", style: "Structural, constructive. Builds meaning through form and function." },
  "house-of-nature": { name: "The Green One", style: "Ecological, grounded, regenerative. Rooted in living systems." },
  "house-of-ritual": { name: "The Threshold", style: "Liminal, experiential, ceremonial. Holds space for transformation." },
};

function resolveMuseFromTopicNames(topicNames: string[]): { name: string; style: string } | null {
  for (const n of topicNames) {
    const slug = n.toLowerCase().replace(/\s+/g, "-");
    if (MUSE_MAP[slug]) return MUSE_MAP[slug];
  }
  return null;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian",
  pt: "Portuguese", nl: "Dutch", pl: "Polish", ro: "Romanian", ar: "Arabic",
};
function languageDirective(code?: string | null): string {
  const lang = (code || "en").split("-")[0].toLowerCase();
  const name = LANGUAGE_NAMES[lang] || lang;
  return `

MULTILINGUAL RULES:
- The reader's interface language is ${name} (${lang}). ALWAYS write your answer in ${name}, whatever language the question or the source material is in.
- The activity, discussions, member profiles and uploaded documents you scan may be in other languages. Read them in their original language and translate the relevant parts into ${name} when you quote or summarise them.
- Keep proper nouns, entity names, quest titles, file names and mention tokens of the form @[Name](type:id) verbatim — never translate or alter them.
- If a term has no good equivalent, keep the original and add a short gloss in ${name} in parentheses.`;
}

function buildSystemPrompt(entityType: string, entityName: string, contextSummary: string, starredSummary: string, topicNames: string[] = [], language?: string) {
  const agentNames: Record<string, string> = {
    GUILD: "Guild Spirit",
    QUEST: "Quest Companion",
    POD: "Pod Facilitator",
    COMPANY: "Company Advisor",
    TERRITORY: "Territory Steward",
    COURSE: "Course Guide",
    EVENT: "Event Coordinator",
  };
  const agentName = agentNames[entityType] || "Unit Agent";

  let starredSection = "";
  if (starredSummary) {
    starredSection = `

Important past insights for this unit (starred by members):
${starredSummary}

Use these to recognise recurring themes, avoid repeating old advice, and build continuity.`;
  }

  const muse = resolveMuseFromTopicNames(topicNames);
  let museSection = "";
  if (muse) {
    museSection = `

You are also known as "${muse.name}" — a creative AI muse.
Your style: ${muse.style}
Adapt your language, metaphors, and suggestions to match this creative sensibility. Offer creative prompts and artistic inspiration when appropriate.`;
  }

  return `You are the "${agentName} of ${entityName}" — a helpful, non-authoritarian AI assistant embedded in a collaborative platform unit.

Your role:
- Help members coordinate, plan, and decide — never replace them.
- Make proactive suggestions when you see patterns (missing skills, stalled tasks, decision points).
- Present ideas as suggestions or reflections, not commands.
- Be warm, concise, and action-oriented. Use emojis sparingly.

IMPORTANT — Document access:
The "Unit context" section below may include the extracted text of documents (PDFs) uploaded by members to the Discussion tab, wrapped in "--- Content of attached document ... ---" markers. When members ask about an uploaded document, READ that content and answer directly with specifics, quotes, and references. NEVER say you can't access uploaded documents if their content appears below — it does.

Unit context:
${contextSummary}${starredSection}${museSection}

When making suggestions, you can include structured suggestions in your response using this JSON format within your message:
- For decision polls: [POLL:{"question":"...","options":["A","B","C"]}]
- For next steps: [STEPS:{"items":["Step 1","Step 2"]}]
- For missing skills: [SKILLS:{"skills":["skill1","skill2"],"suggestion":"..."}]

Only include these when genuinely useful. Most responses should be plain text.
Always respond helpfully even if context is limited. Highlight when you're uncertain.${languageDirective(language)}`;
}

// profiles has NO foreign key to other tables, so PostgREST embeds like
// `profiles:user_id(name)` silently return null. Always hydrate manually
// through profiles.user_id (NOT profiles.id, which is a distinct column).
async function hydrateProfiles(sb: any, rows: any[] | null, key: string): Promise<any[]> {
  const list = rows || [];
  const ids = Array.from(new Set(list.map((r: any) => r?.[key]).filter(Boolean)));
  if (!ids.length) return list;
  const { data } = await sb.from("profiles").select("user_id,name,headline").in("user_id", ids);
  const map = new Map<string, any>((data || []).map((p: any) => [p.user_id, p]));
  for (const r of list) r.profiles = map.get(r?.[key]) || null;
  return list;
}


async function gatherContext(supabase: any, entityType: string, entityId: string): Promise<{ name: string; summary: string; topicNames: string[]; attachments: { url: string; mime_type: string; file_name: string }[] }> {
  let name = "Unknown";
  const parts: string[] = [];
  const relatedQuestIds = new Set<string>();

  try {
    if (entityType === "GUILD") {
      const { data: guild } = await supabase.from("guilds").select("name, description, type, join_policy").eq("id", entityId).single();
      if (guild) {
        name = guild.name;
        parts.push(`Guild: ${guild.name} (${guild.type}, ${guild.join_policy})`);
        if (guild.description) parts.push(`Description: ${guild.description.slice(0, 300)}`);
      }
      const { data: rawMembers } = await supabase.from("guild_members").select("role, user_id").eq("guild_id", entityId).limit(20);
      const members = await hydrateProfiles(supabase, rawMembers, "user_id");
      if (members?.length) parts.push(`Members (${members.length}): ${members.map((m: any) => `${m.profiles?.name || "Unnamed member"} (${m.role})`).join(", ")}`);
      const { data: quests } = await supabase.from("quests").select("title, status").eq("guild_id", entityId).eq("is_deleted", false).limit(10);
      if (quests?.length) parts.push(`Quests: ${quests.map((q: any) => `${q.title} [${q.status}]`).join(", ")}`);
      const { data: topics } = await supabase.from("guild_topics").select("topics(name)").eq("guild_id", entityId);
      if (topics?.length) parts.push(`Houses: ${topics.map((t: any) => t.topics?.name).filter(Boolean).join(", ")}`);
    } else if (entityType === "QUEST") {
      relatedQuestIds.add(entityId);
      const { data: quest } = await supabase.from("quests").select("title, description, status, credit_budget, escrow_credits, reward_xp").eq("id", entityId).single();
      if (quest) {
        name = quest.title;
        parts.push(`Quest: ${quest.title} [${quest.status}]`);
        if (quest.description) parts.push(`Description: ${quest.description.slice(0, 300)}`);
        parts.push(`Rewards: ${quest.reward_xp} XP, Budget: ${quest.credit_budget} credits, Escrow: ${quest.escrow_credits}`);
      }
      const { data: rawParticipants } = await supabase.from("quest_participants").select("role, status, user_id").eq("quest_id", entityId).limit(20);
      const participants = await hydrateProfiles(supabase, rawParticipants, "user_id");
      if (participants?.length) parts.push(`Participants: ${participants.map((p: any) => `${p.profiles?.name || "Unnamed member"} (${p.role})`).join(", ")}`);
      const { data: subtasks } = await supabase.from("quest_subtasks").select("title, status").eq("quest_id", entityId).order("order_index").limit(20);
      if (subtasks?.length) parts.push(`Subtasks: ${subtasks.map((s: any) => `${s.title} [${s.status}]`).join(", ")}`);
      const { data: proposals } = await supabase.from("quest_proposals").select("title, status, requested_credits, upvotes_count").eq("quest_id", entityId).limit(10);
      if (proposals?.length) parts.push(`Proposals: ${proposals.map((p: any) => `${p.title} [${p.status}] ${p.requested_credits}cr, ${p.upvotes_count} votes`).join(", ")}`);
    } else if (entityType === "POD") {
      const { data: pod } = await supabase.from("pods").select("name, description, type, start_date, end_date").eq("id", entityId).single();
      if (pod) {
        name = pod.name;
        parts.push(`Pod: ${pod.name} (${pod.type})`);
        if (pod.description) parts.push(`Description: ${pod.description.slice(0, 300)}`);
      }
      const { data: rawPodMembers } = await supabase.from("pod_members").select("role, user_id").eq("pod_id", entityId).limit(20);
      const members = await hydrateProfiles(supabase, rawPodMembers, "user_id");
      if (members?.length) parts.push(`Members: ${members.map((m: any) => `${m.profiles?.name || "Unnamed member"} (${m.role})`).join(", ")}`);
    } else if (entityType === "COMPANY") {
      const { data: company } = await supabase.from("companies").select("name, description, sector, size").eq("id", entityId).single();
      if (company) {
        name = company.name;
        parts.push(`Company: ${company.name} (${company.sector || "N/A"}, ${company.size || "N/A"})`);
        if (company.description) parts.push(`Description: ${company.description.slice(0, 300)}`);
      }

      const { data: members } = await supabase.from("company_members").select("role, user_id").eq("company_id", entityId).limit(30);
      if (members?.length) {
        const userIds = members.map((m: any) => m.user_id).filter(Boolean);
        const { data: profiles } = userIds.length
          ? await supabase.from("profiles").select("id,name").in("id", userIds)
          : { data: [] };
        const profileMap = new Map<string, string>((profiles || []).map((p: any) => [p.id, p.name]));
        parts.push(`Company members (${members.length}): ${members.map((m: any) => `${profileMap.get(m.user_id) || "Member"} (${m.role || "member"})`).join(", ")}`);
      }

      const questMap = new Map<string, any>();
      const { data: directQuests } = await supabase
        .from("quests")
        .select("id, title, status, description")
        .eq("company_id", entityId)
        .eq("is_deleted", false)
        .limit(30);
      for (const quest of directQuests || []) questMap.set(quest.id, quest);

      const { data: hostedRows } = await supabase
        .from("quest_hosts")
        .select("quest_id")
        .eq("entity_type", "COMPANY")
        .eq("entity_id", entityId)
        .limit(50);
      const hostedIds = Array.from(new Set((hostedRows || []).map((r: any) => r.quest_id).filter(Boolean)));
      if (hostedIds.length) {
        const { data: hostedQuests } = await supabase
          .from("quests")
          .select("id, title, status, description")
          .in("id", hostedIds)
          .eq("is_deleted", false)
          .limit(30);
        for (const quest of hostedQuests || []) questMap.set(quest.id, quest);
      }

      const companyQuests = Array.from(questMap.values());
      for (const quest of companyQuests) relatedQuestIds.add(quest.id);
      if (companyQuests.length) {
        parts.push(`Hosted/linked quests (${companyQuests.length}): ${companyQuests.map((q: any) => `${q.title} [${q.status}]`).join(", ")}`);
        const questDescriptions = companyQuests
          .filter((q: any) => q.description)
          .slice(0, 5)
          .map((q: any) => `- ${q.title}: ${String(q.description).slice(0, 350)}`);
        if (questDescriptions.length) parts.push(`Quest summaries:\n${questDescriptions.join("\n")}`);
      }
    } else if (entityType === "TERRITORY") {
      const { data: territory } = await supabase.from("territories").select("name, level").eq("id", entityId).single();
      if (territory) {
        name = territory.name;
        parts.push(`Territory: ${territory.name} (${territory.level})`);
      }
    } else if (entityType === "COURSE") {
      const { data: course } = await supabase.from("courses").select("title, description, level, is_free").eq("id", entityId).single();
      if (course) {
        name = course.title;
        parts.push(`Course: ${course.title} (${course.level}, ${course.is_free ? "free" : "paid"})`);
        if (course.description) parts.push(`Description: ${course.description.slice(0, 300)}`);
      }
    }
  } catch (e) {
    console.error("Context gathering error:", e);
  }

  const topicNames: string[] = [];
  try {
    const topicTable: Record<string, { table: string; fk: string }> = {
      GUILD: { table: "guild_topics", fk: "guild_id" },
      QUEST: { table: "quest_topics", fk: "quest_id" },
      COURSE: { table: "course_topics", fk: "course_id" },
    };
    const mapping = topicTable[entityType];
    if (mapping) {
      const { data: topicRows } = await supabase.from(mapping.table).select("topics(name)").eq(mapping.fk, entityId);
      if (topicRows?.length) {
        for (const r of topicRows) {
          if (r.topics?.name) topicNames.push(r.topics.name);
        }
      }
    }
  } catch { }

  // Recent posts + attachments for this entity (Discussion tab content)
  const attachments: { url: string; mime_type: string; file_name: string }[] = [];
  try {
    // Posts can live under the entity itself OR a discussion/event sub-context
    const contextTypes = [
      entityType,
      `${entityType}_DISCUSSION`,
      `${entityType}_EVENT`,
    ];
    const postSelect = "id, content, created_at, author_user_id, context_type, context_id, posted_as_entity_type, posted_as_entity_id, post_attachments(url, mime_type, file_name, type)";
    const postBuckets: any[][] = [];

    const { data: directPosts, error: directPostsErr } = await supabase
      .from("feed_posts")
      .select(postSelect)
      .in("context_type", contextTypes)
      .eq("context_id", entityId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(20);
    if (directPosts?.length) postBuckets.push(directPosts);

    const relatedQuestIdList = Array.from(relatedQuestIds);
    if (relatedQuestIdList.length) {
      const { data: questPosts, error: questPostsErr } = await supabase
        .from("feed_posts")
        .select(postSelect)
        .in("context_type", ["QUEST", "QUEST_DISCUSSION", "QUEST_EVENT"])
        .in("context_id", relatedQuestIdList)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (questPostsErr) console.error("Quest posts gathering error:", questPostsErr.message);
      if (questPosts?.length) postBuckets.push(questPosts);
    }

    const { data: actingPosts, error: actingPostsErr } = await supabase
      .from("feed_posts")
      .select(postSelect)
      .eq("posted_as_entity_type", entityType)
      .eq("posted_as_entity_id", entityId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(30);
    if (actingPosts?.length) postBuckets.push(actingPosts);

    const postsById = new Map<string, any>();
    for (const bucket of postBuckets) {
      for (const post of bucket) postsById.set(post.id, post);
    }
    const posts = Array.from(postsById.values())
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 40);

    console.log(`[unit-agent] posts query: direct=${directPosts?.length || 0} relatedQuests=${relatedQuestIdList.length} acting=${actingPosts?.length || 0} total=${posts.length} err=${directPostsErr?.message || actingPostsErr?.message || "none"}`);
    if (posts.length) {
      const authorIds = Array.from(new Set((posts as any[]).map(p => p.author_user_id).filter(Boolean)));
      const { data: profs } = await supabase.from("profiles").select("id,name").in("id", authorIds);
      const nameMap = new Map<string, string>((profs || []).map((p: any) => [p.id, p.name]));
      const postLines: string[] = [];
      for (const p of posts as any[]) {
        const author = nameMap.get(p.author_user_id) || "Member";
        const snippet = (p.content || "").slice(0, 400);
        const scope = p.context_type?.startsWith("QUEST") && p.context_id !== entityId ? ` (${p.context_type})` : "";
        const atts = (p.post_attachments || []) as any[];
        const attDesc = atts.length
          ? ` [Attachments: ${atts.map(a => `${a.file_name || a.type}${a.mime_type ? ` (${a.mime_type})` : ""}`).join(", ")}]`
          : "";
        postLines.push(`- ${author}${scope}: ${snippet}${attDesc}`);
        for (const a of atts) {
          if (a.url && a.mime_type) attachments.push({ url: a.url, mime_type: a.mime_type, file_name: a.file_name || "file" });
        }
      }
      parts.push(`Recent discussion posts (${posts.length}):\n${postLines.join("\n")}`);
    }

    const attachmentTargetIds = Array.from(new Set([entityId, ...relatedQuestIdList]));
    const { data: unitAttachments, error: unitAttachmentsErr } = await supabase
      .from("attachments")
      .select("id, title, file_name, file_url, mime_type, target_type, target_id, created_at")
      .in("target_id", attachmentTargetIds)
      .order("created_at", { ascending: false })
      .limit(30);
    if (unitAttachmentsErr) console.error("Unit attachments gathering error:", unitAttachmentsErr.message);
    if (unitAttachments?.length) {
      const fileLines = unitAttachments.map((a: any) => `- ${a.title || a.file_name || "file"}${a.mime_type ? ` (${a.mime_type})` : ""} on ${a.target_type || "unit"}`);
      parts.push(`Uploaded files/resources (${unitAttachments.length}):\n${fileLines.join("\n")}`);
      for (const a of unitAttachments as any[]) {
        if (a.file_url && a.mime_type) attachments.push({ url: a.file_url, mime_type: a.mime_type, file_name: a.file_name || a.title || "file" });
      }
    }

    // Extract text from readable document attachments so the agent can answer about file contents
    const readableAtts = attachments
      .filter(a => /pdf/i.test(a.mime_type) || /wordprocessingml\.document/i.test(a.mime_type) || /\.(pdf|docx)$/i.test(a.file_name))
      .slice(0, 6);
    console.log(`[unit-agent] Found ${readableAtts.length} readable attachments to extract`);
    for (const a of readableAtts) {
      console.log(`[unit-agent] Extracting document: ${a.file_name} from ${a.url}`);
      const text = await extractAttachmentText(a);
      console.log(`[unit-agent] Extracted ${text.length} chars from ${a.file_name}`);
      if (text) {
        parts.push(`\n--- Content of attached document "${a.file_name}" ---\n${text}\n--- End of document ---`);
      }
    }
  } catch (e) {
    console.error("Posts gathering error:", e);
  }

  return { name, summary: parts.join("\n") || "No additional context available.", topicNames, attachments };
}

async function getConversationFromDB(supabase: any, entityType: string, entityId: string, limit = 20) {
  const { data: thread } = await supabase
    .from("unit_chat_threads")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  if (!thread) return { threadId: null, messages: [], starredSummary: "" };

  const { data: msgs } = await supabase
    .from("unit_chat_messages")
    .select("sender_type, sender_user_id, message_text, profiles:sender_user_id(name)")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const recentMsgs = (msgs || []).reverse().map((m: any) => ({
    role: m.sender_type === "AGENT" ? "assistant" as const : "user" as const,
    content: m.sender_type === "USER"
      ? `[${m.profiles?.name || "User"}]: ${m.message_text}`
      : m.message_text,
  }));

  const { data: starred } = await supabase
    .from("starred_excerpts")
    .select("title, excerpt_text, upvotes_count")
    .eq("thread_id", thread.id)
    .eq("is_deleted", false)
    .order("upvotes_count", { ascending: false })
    .limit(10);

  let starredSummary = "";
  if (starred?.length) {
    starredSummary = starred.map((s: any) => {
      const title = s.title || "";
      const snippet = s.excerpt_text.slice(0, 80);
      const votes = s.upvotes_count > 0 ? ` (${s.upvotes_count} upvotes)` : "";
      return `- ${title ? title + ": " : ""}${snippet}${votes}`;
    }).join("\n");
  }

  return { threadId: thread.id, messages: recentMsgs, starredSummary };
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
  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !authData.user) return unauthorizedResponse();
  // --- End auth check ---

  try {
    const { entityType, entityId, message, language } = await req.json();
    
    if (!entityType || !entityId || !message) {
      return new Response(JSON.stringify({ error: "Missing entityType, entityId, or message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { name: entityName, summary: contextSummary, attachments } = await gatherContext(supabase, entityType, entityId);
    const { threadId: existingThreadId, messages: dbHistory, starredSummary } = await getConversationFromDB(supabase, entityType, entityId);

    const systemPrompt = buildSystemPrompt(entityType, entityName, contextSummary, starredSummary, [], language);

    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];
    for (const msg of dbHistory) {
      aiMessages.push(msg);
    }

    // Inline only images (PDFs are already extracted as text in contextSummary)
    const userContent: any[] = [{ type: "text", text: message }];
    const inlineable = attachments
      .filter(a => /^image\//i.test(a.mime_type))
      .slice(0, 5);
    for (const att of inlineable) {
      try {
        const resp = await fetch(att.url);
        if (!resp.ok) continue;
        const buf = new Uint8Array(await resp.arrayBuffer());
        if (buf.byteLength > 8 * 1024 * 1024) continue;
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        const b64 = btoa(bin);
        userContent.push({ type: "image_url", image_url: { url: `data:${att.mime_type};base64,${b64}` } });
      } catch (e) {
        console.error("Attachment fetch failed", att.url, e);
      }
    }
    aiMessages.push({ role: "user", content: userContent.length > 1 ? userContent : message });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content ?? "I'm not sure how to help with that right now.";

    const suggestions: any[] = [];
    const pollMatch = replyText.match(/\[POLL:(.*?)\]/s);
    if (pollMatch) {
      try { suggestions.push({ type: "DECISION_POLL", ...JSON.parse(pollMatch[1]) }); } catch { }
    }
    const stepsMatch = replyText.match(/\[STEPS:(.*?)\]/s);
    if (stepsMatch) {
      try { suggestions.push({ type: "NEXT_STEPS", ...JSON.parse(stepsMatch[1]) }); } catch { }
    }
    const skillsMatch = replyText.match(/\[SKILLS:(.*?)\]/s);
    if (skillsMatch) {
      try { suggestions.push({ type: "MISSING_SKILLS", ...JSON.parse(skillsMatch[1]) }); } catch { }
    }

    const cleanText = replyText
      .replace(/\[POLL:.*?\]/s, "")
      .replace(/\[STEPS:.*?\]/s, "")
      .replace(/\[SKILLS:.*?\]/s, "")
      .trim();

    let threadId = existingThreadId;
    if (!threadId) {
      const { data: newThread } = await supabase
        .from("unit_chat_threads")
        .insert({ entity_type: entityType, entity_id: entityId })
        .select("id")
        .single();
      threadId = newThread?.id;
    }

    if (threadId) {
      const metadataJson: any = {};
      if (suggestions.length > 0) metadataJson.suggestions = suggestions;
      if (suggestions.length > 0) {
        metadataJson.isSuggestion = true;
        metadataJson.suggestionTypes = suggestions.map(s => s.type);
      }

      await supabase.from("unit_chat_messages").insert({
        thread_id: threadId,
        sender_type: "AGENT",
        message_text: cleanText,
        metadata_json: metadataJson,
      });
    }

    return new Response(JSON.stringify({
      reply: cleanText,
      suggestions,
      entityName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("unit-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
