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
  // Look for <link rel="icon" ...> or <link rel="shortcut icon" ...>
  const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut\s+)?icon["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut\s+)?icon["']/i);
  if (iconMatch?.[1]) {
    try {
      return new URL(iconMatch[1], baseUrl).href;
    } catch { /* ignore */ }
  }
  // Look for apple-touch-icon
  const appleMatch = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i);
  if (appleMatch?.[1]) {
    try {
      return new URL(appleMatch[1], baseUrl).href;
    } catch { /* ignore */ }
  }
  // Default favicon
  try {
    return new URL("/favicon.ico", baseUrl).href;
  } catch {
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let result = { name: null as string | null, description: null as string | null, logo: null as string | null, sector: null as string | null, url: url };

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "ChangeTheGame-Bot/1.0" },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const text = await res.text();
      const html = text.slice(0, 1_500_000);
      const finalUrl = res.url || url;

      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const ogTitle = getMetaContent(html, "og:title");
      const ogDesc = getMetaContent(html, "og:description") || getMetaContent(html, "description");
      const ogImage = getMetaContent(html, "og:image");
      const siteName = getMetaContent(html, "og:site_name");

      result.name = siteName || ogTitle || titleTag?.[1]?.trim() || null;
      result.description = ogDesc || null;

      // Prefer og:image, fallback to favicon
      if (ogImage) {
        try { result.logo = new URL(ogImage, finalUrl).href; } catch { result.logo = ogImage; }
      } else {
        result.logo = extractFavicon(html, finalUrl);
      }

      // Infer sector from combined text
      const combined = [result.name, result.description, ogTitle, titleTag?.[1]].filter(Boolean).join(" ");
      result.sector = inferSector(combined);
      result.url = finalUrl;
    } catch {
      clearTimeout(timeout);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to scrape" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
