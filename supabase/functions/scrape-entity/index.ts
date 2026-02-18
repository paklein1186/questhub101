import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "169.254.169.254", "metadata.google.internal",
];

const BLOCKED_IP_RANGES = [
  /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^fd[0-9a-f]{2}:/i, /^fe80:/i,
];

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(h)) return true;
  return BLOCKED_IP_RANGES.some((p) => p.test(h));
}

function getMetaContent(html: string, property: string): string | null {
  for (const attr of [
    `property="${property}"`, `name="${property}"`,
    `property="twitter:${property.replace("og:", "")}"`,
    `name="twitter:${property.replace("og:", "")}"`,
  ]) {
    const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const r1 = new RegExp(`<meta[^>]+${escaped}[^>]+content="([^"]*)"`, "i");
    const m1 = html.match(r1);
    if (m1?.[1]) return m1[1];
    const r2 = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${escaped}`, "i");
    const m2 = html.match(r2);
    if (m2?.[1]) return m2[1];
  }
  return null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut\s+)?icon["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut\s+)?icon["']/i);
  if (iconMatch?.[1]) {
    try { return new URL(iconMatch[1], baseUrl).href; } catch { /* ignore */ }
  }
  const appleMatch = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i);
  if (appleMatch?.[1]) {
    try { return new URL(appleMatch[1], baseUrl).href; } catch { /* ignore */ }
  }
  try { return new URL("/favicon.ico", baseUrl).href; } catch { return null; }
}

/** Strip HTML tags and collapse whitespace; return a plain-text snippet. */
function htmlToText(html: string, maxChars = 12_000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

/**
 * Rank internal links by how "informative" they are for entity identification.
 * Returns up to `limit` unique same-origin URLs, sorted by priority.
 */
const HIGH_VALUE_SLUGS = [
  "about", "mission", "vision", "values", "team", "who-we-are", "our-story",
  "what-we-do", "approach", "impact", "program", "project", "work",
  "manifesto", "philosophy", "strategy", "sector", "focus",
];

function extractInternalLinks(html: string, baseUrl: string, limit = 4): string[] {
  const origin = new URL(baseUrl).origin;
  const seen = new Set<string>();
  const priority: string[] = [];
  const fallback: string[] = [];

  // Match all <a href="...">
  const linkRe = /<a[^>]+href=["']([^"'#?][^"']*?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    let href = m[1].trim();
    try {
      const abs = new URL(href, baseUrl).href;
      // same origin only, skip files
      if (!abs.startsWith(origin)) continue;
      if (/\.(pdf|jpg|jpeg|png|gif|svg|css|js|ico|xml|zip)(\?|$)/i.test(abs)) continue;
      const path = new URL(abs).pathname.toLowerCase();
      if (path === "/" || path === "") continue;
      if (seen.has(abs)) continue;
      seen.add(abs);

      const isHighValue = HIGH_VALUE_SLUGS.some(slug => path.includes(slug));
      if (isHighValue) priority.push(abs);
      else fallback.push(abs);
    } catch { /* ignore */ }
  }

  // Interleave priority first, fill remaining from fallback
  const result: string[] = [];
  for (const u of priority) {
    if (result.length >= limit) break;
    result.push(u);
  }
  for (const u of fallback) {
    if (result.length >= limit) break;
    result.push(u);
  }
  return result;
}

/** Fetch a URL with a short timeout; return HTML text or null on failure. */
async function fetchPage(url: string, timeoutMs = 6000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ChangeTheGame-Bot/1.0" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) { await res.text(); return null; }
    const text = await res.text();
    return text.slice(0, 1_000_000);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function inferSector(text: string): string | null {
  const keywords: Record<string, string[]> = {
    "Technology": ["tech", "software", "saas", "ai", "machine learning", "data", "cloud", "digital"],
    "Sustainability": ["sustain", "green", "eco", "environment", "climate", "renewable", "clean energy"],
    "Education": ["education", "learning", "training", "school", "university", "teach", "course"],
    "Health": ["health", "medical", "wellness", "pharma", "biotech", "care"],
    "Finance": ["finance", "fintech", "banking", "invest", "insurance"],
    "Creative Arts": ["art", "design", "creative", "music", "film", "media", "content"],
    "Social Impact": ["non-profit", "nonprofit", "ngo", "social", "community", "charity", "impact"],
    "Agriculture": ["agri", "farm", "food", "organic"],
    "E-Commerce": ["shop", "store", "retail", "ecommerce", "e-commerce", "marketplace"],
  };
  const lower = text.toLowerCase();
  for (const [sector, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) return sector;
  }
  return null;
}

function inferTopicKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const topicMap: [string, string[]][] = [
    ["AI & Machine Learning", ["artificial intelligence", "machine learning", "deep learning", "neural network", "llm", "generative ai"]],
    ["Technology", ["software", "saas", "cloud", "developer", "api", "open source", "devops", "cybersecurity"]],
    ["Sustainability", ["sustainability", "circular economy", "net zero", "carbon", "climate change", "renewable energy", "biodiversity"]],
    ["Education", ["education", "learning", "e-learning", "curriculum", "pedagogy", "training", "mentoring", "bootcamp"]],
    ["Health & Wellbeing", ["health", "wellness", "mental health", "biotech", "medtech", "pharma", "healthcare"]],
    ["Finance & Impact Investing", ["finance", "fintech", "impact investing", "venture capital", "crowdfunding", "defi", "blockchain"]],
    ["Creative Arts", ["art", "design", "music", "film", "photography", "animation", "game", "fashion"]],
    ["Social Impact", ["social impact", "nonprofit", "ngo", "humanitarian", "community development", "social enterprise"]],
    ["Agriculture & Food", ["agriculture", "food", "farming", "agroecology", "food security", "urban farming"]],
    ["Governance & Policy", ["governance", "policy", "regulation", "democracy", "civic", "public sector"]],
    ["Research & Science", ["research", "science", "laboratory", "academic", "innovation", "r&d"]],
    ["Community Building", ["community", "co-op", "cooperative", "collective", "network", "peer-to-peer"]],
    ["Entrepreneurship", ["startup", "entrepreneur", "founder", "accelerator", "incubator", "growth hacking"]],
    ["Media & Communication", ["media", "journalism", "content creation", "podcast", "newsletter", "publishing"]],
    ["Mobility & Urban", ["mobility", "urban", "transportation", "smart city", "logistics", "infrastructure"]],
  ];
  const matches: string[] = [];
  for (const [label, words] of topicMap) {
    if (words.some(w => lower.includes(w))) {
      matches.push(label);
      if (matches.length >= 5) break;
    }
  }
  return matches;
}

function inferTerritoryKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const regionMap: [string, string[]][] = [
    ["Africa", ["africa", "african", "sub-saharan", "west africa", "east africa", "north africa"]],
    ["Asia", ["asia", "asian", "southeast asia", "south asia", "east asia", "pacific rim"]],
    ["Europe", ["europe", "european", "eu", "eurozone", "western europe", "eastern europe"]],
    ["Latin America", ["latin america", "latam", "south america", "central america", "caribbean"]],
    ["Middle East", ["middle east", "mena", "gulf", "arab world"]],
    ["North America", ["north america", "usa", "united states", "canada", "american"]],
    ["Oceania", ["oceania", "australia", "new zealand", "pacific islands"]],
    ["Global", ["global", "worldwide", "international", "cross-border", "transnational"]],
  ];
  const matches: string[] = [];
  for (const [label, words] of regionMap) {
    if (words.some(w => lower.includes(w))) {
      matches.push(label);
      if (matches.length >= 3) break;
    }
  }
  return matches;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only HTTP/HTTPS URLs allowed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isBlockedHost(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: "URL not allowed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result = {
      name: null as string | null,
      description: null as string | null,
      logo: null as string | null,
      sector: null as string | null,
      url: url,
      suggestedTopics: [] as string[],
      suggestedTerritories: [] as string[],
      pagesVisited: 1,
    };

    // ── Step 1: Fetch the homepage ───────────────────────────────────────────
    const homeHtml = await fetchPage(url);
    if (!homeHtml) {
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalUrl = url; // fetchPage follows redirects internally; use as-is
    const titleTag = homeHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitle = getMetaContent(homeHtml, "og:title");
    const ogDesc = getMetaContent(homeHtml, "og:description") || getMetaContent(homeHtml, "description");
    const ogImage = getMetaContent(homeHtml, "og:image");
    const siteName = getMetaContent(homeHtml, "og:site_name");

    result.name = siteName || ogTitle || titleTag?.[1]?.trim() || null;
    result.description = ogDesc || null;
    result.url = finalUrl;

    if (ogImage) {
      try { result.logo = new URL(ogImage, finalUrl).href; } catch { result.logo = ogImage; }
    } else {
      result.logo = extractFavicon(homeHtml, finalUrl);
    }

    // ── Step 2: Discover & fetch additional pages in parallel ────────────────
    // First try well-known slug paths directly (most reliable)
    const wellKnownPaths = [
      "/about", "/about-us", "/mission", "/vision", "/values",
      "/who-we-are", "/our-story", "/team", "/what-we-do", "/impact",
    ];
    const origin = new URL(url).origin;
    const wellKnownUrls = wellKnownPaths.map(p => origin + p);

    // Then extract links from the homepage HTML
    const linkedUrls = extractInternalLinks(homeHtml, url, 6);

    // Merge: prioritise well-known paths, deduplicate, take up to 4
    const seen = new Set<string>([url]);
    const candidates: string[] = [];
    for (const u of [...wellKnownUrls, ...linkedUrls]) {
      if (!seen.has(u) && candidates.length < 4) {
        seen.add(u);
        candidates.push(u);
      }
    }

    // Fetch all candidates concurrently (each has its own 6 s timeout)
    const extraHtmls = await Promise.all(candidates.map(u => fetchPage(u, 6000)));

    // ── Step 3: Build a combined corpus from all pages ───────────────────────
    const allText = [
      htmlToText(homeHtml, 12_000),
      ...extraHtmls
        .filter((h): h is string => h !== null)
        .map(h => htmlToText(h, 8_000)),
    ].join(" ");

    result.pagesVisited = 1 + extraHtmls.filter(Boolean).length;

    // Improve description if OG desc was missing / too short
    if (!result.description || result.description.length < 40) {
      // Try to grab first meaningful paragraph from homepage body
      const paraMatch = homeHtml.match(/<p[^>]*>([\s\S]{60,600}?)<\/p>/i);
      if (paraMatch) {
        const cleaned = paraMatch[1].replace(/<[^>]+>/g, "").trim();
        if (cleaned.length > 40) result.description = cleaned.slice(0, 300);
      }
    }

    // ── Step 4: Infer metadata from combined corpus ──────────────────────────
    const metaText = [result.name, result.description, ogTitle, titleTag?.[1]].filter(Boolean).join(" ");
    result.sector = inferSector(metaText + " " + allText.slice(0, 4000));
    result.suggestedTopics = inferTopicKeywords(allText);
    result.suggestedTerritories = inferTerritoryKeywords(allText);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch {
    return new Response(JSON.stringify({ error: "Failed to scrape" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
