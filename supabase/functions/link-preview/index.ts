import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "169.254.169.254", // cloud metadata
  "metadata.google.internal",
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

/** Extract Open Graph / meta info from a URL */
async function fetchPreview(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ChangeTheGame-Bot/1.0" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return { url, title: null, description: null, image: null, siteName: null };

    // Limit response size to 1MB
    const text = await res.text();
    const html = text.slice(0, 1_048_576);

    const getMetaContent = (property: string): string | null => {
      for (const attr of [`property="${property}"`, `name="${property}"`, `property="twitter:${property.replace("og:", "")}"`, `name="twitter:${property.replace("og:", "")}"`]) {
        const regex = new RegExp(`<meta[^>]+${attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]+content="([^"]*)"`, "i");
        const match = html.match(regex);
        if (match?.[1]) return match[1];
        const regex2 = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "i");
        const match2 = html.match(regex2);
        if (match2?.[1]) return match2[1];
      }
      return null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    return {
      url: res.url || url,
      title: getMetaContent("og:title") || titleMatch?.[1]?.trim() || null,
      description: getMetaContent("og:description") || getMetaContent("description") || null,
      image: getMetaContent("og:image") || null,
      siteName: getMetaContent("og:site_name") || null,
    };
  } catch {
    clearTimeout(timeout);
    return { url, title: null, description: null, image: null, siteName: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SSRF protection: only allow http/https
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only HTTP/HTTPS URLs allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SSRF protection: block private/internal IPs
    if (isBlockedHost(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: "URL not allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preview = await fetchPreview(url);

    return new Response(JSON.stringify(preview), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch preview" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
