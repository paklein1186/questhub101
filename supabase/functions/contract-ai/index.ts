import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Extract the first balanced JSON object/array from an LLM answer. */
function extractJson(raw: string): any {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through */
  }
  const start = cleaned.search(/[[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function callAi(systemPrompt: string, userPrompt: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 402) throw new Error("NO_CREDITS");
  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

const AREAS = [
  "objectifs / purpose of the contract",
  "roles & responsibilities of each party",
  "financial terms (budget, FMV rate, distribution, external spending)",
  "key milestones & deadlines",
  "termination / renewal conditions",
  "expected deliverables",
  "specific legal or regulatory obligations (IP, licence, data, liability)",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !userData.user) return json({ error: "Unauthorized" }, 401);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

  try {
    const body = await req.json();
    const {
      action,
      language = "en",
      mode = "create",
      context = {},
      draftHtml = "",
      answers = [],
    } = body ?? {};

    const answersBlock =
      Array.isArray(answers) && answers.length
        ? answers
            .map((a: any, i: number) => `${i + 1}. Q: ${a.question}\n   A: ${a.answer || "(skipped)"}`)
            .join("\n")
        : "(no answers yet)";

    const contextBlock = `Quest: "${context.questTitle ?? "—"}"
Quest description: ${context.questDescription || "—"}
Host entity: ${context.hostName || "—"}
Members involved: ${context.members || "—"}
FMV rate per half-day: €${context.fmvRate ?? "—"}
Budget: ${context.budget ?? "—"}
Governance model: ${context.governance || "—"}
Contract mode: ${mode === "edit" ? "editing an existing contract" : "creating a new contract"}
Current contract draft (HTML, may be a template with placeholders):
"""
${String(draftHtml).slice(0, 12000) || "(empty)"}
"""`;

    const languageDirective = `Always write questions, options and contract content in the user's interface language (BCP-47 code: "${language}"). Translate source material if needed.`;

    if (action === "next_questions") {
      const system = `You are a contract co-drafting assistant for a collaborative "Open Contributive Unit" (OCU) platform where contributors log work valued at a fair-market-value rate and share the quest value pie.
${languageDirective}
Your job: ask targeted, adaptive questions to fill the gaps in the contract. Never ask a fixed questionnaire: skip anything already answered or already clearly covered by the draft, and follow up on previous answers when they are vague or inconsistent.
Cover, when relevant and still missing: ${AREAS.join("; ")}.`;

      const user = `${contextBlock}

Answers already collected:
${answersBlock}

Return ONLY valid JSON:
{
  "completeness": <0-100 integer, how complete the contract is>,
  "gaps": ["short label of a missing or unclear element", ...],
  "inconsistencies": ["short description of a contradiction found between the draft and the answers", ...],
  "questions": [
    { "id": "slug", "topic": "objectives|roles|financials|milestones|termination|deliverables|legal|other",
      "question": "one concrete question in the user's language",
      "why": "one short sentence explaining why it matters",
      "suggestions": ["up to 3 realistic short answers the user can pick"] }
  ],
  "done": <true if the contract has enough information and no question is needed>
}
Ask at most 3 questions in this round, ordered by importance. If done is true, questions must be an empty array.`;

      const raw = await callAi(system, user, LOVABLE_API_KEY);
      const parsed = extractJson(raw);
      if (!parsed) return json({ error: "AI returned an unreadable answer" }, 502);
      return json(parsed);
    }

    if (action === "generate") {
      const system = `You are a contract drafting assistant for an OCU collaborative platform.
${languageDirective}
Produce a clear, well-structured contract as semantic HTML only (h2, h3, p, ul, li, ol, strong, hr). No <html>, <head>, <body>, no markdown fences, no CSS, no scripts.
Rules:
- Keep every element of the current draft that is still valid; integrate the collected answers into the right sections.
- Replace bracketed placeholders such as [ ... ] with real content derived from the answers; if information is genuinely missing, keep an explicit "[to be specified: ...]" marker instead of inventing facts.
- Add sections adapted to the context (objectives, parties & responsibilities, financial terms, deliverables, milestones, IP & licence, termination/renewal, dispute resolution, legal obligations) — only those that make sense here.
- Stay factual and neutral. No flowery language.`;

      const user = `${contextBlock}

Answers collected from the user:
${answersBlock}

Return ONLY valid JSON:
{ "title": "short contract title", "html": "the full contract as HTML", "notes": ["short note about a remaining gap or a clause you added", ...] }`;

      const raw = await callAi(system, user, LOVABLE_API_KEY);
      const parsed = extractJson(raw);
      if (!parsed?.html) return json({ error: "AI returned an unreadable answer" }, 502);
      return json(parsed);
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "RATE_LIMIT") return json({ error: "Rate limit reached, please retry in a moment." }, 429);
    if (msg === "NO_CREDITS") return json({ error: "AI credits exhausted. Please top up your workspace credits." }, 402);
    console.error("contract-ai error", msg);
    return json({ error: msg }, 500);
  }
});
