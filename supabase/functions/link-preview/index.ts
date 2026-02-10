import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const html = await res.text();

    const getMetaContent = (property: string): string | null => {
      // Try og: first, then twitter:, then generic name
      for (const attr of [`property="${property}"`, `name="${property}"`, `property="twitter:${property.replace("og:", "")}"`, `name="twitter:${property.replace("og:", "")}"`]) {
        const regex = new RegExp(`<meta[^>]+${attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]+content="([^"]*)"`, "i");
        const match = html.match(regex);
        if (match?.[1]) return match[1];
        // Also check content before property
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
    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preview = await fetchPreview(url);

    return new Response(JSON.stringify(preview), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
