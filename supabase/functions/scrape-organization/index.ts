import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "169.254.169.254",
  "metadata.google.internal",
];

const BLOCKED_IP_RANGES = [
  /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./, /^0\./,
  /^fd[0-9a-f]{2}:/i, /^fe80:/i,
];

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(h)) return true;
  return BLOCKED_IP_RANGES.some((p) => p.test(h));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT auth check — only logged-in users can call this
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, linkedinUrl } = await req.json();
    const targetUrl = url || linkedinUrl;

    if (!targetUrl || typeof targetUrl !== "string") {
      return new Response(JSON.stringify({ error: "url or linkedinUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SSRF protection — block internal/private network URLs
    try {
      const parsed = new URL(targetUrl);
      if (isBlockedHost(parsed.hostname)) {
        throw new Error("Blocked URL");
      }
    } catch {
      return new Response(JSON.stringify({ error: "Invalid or blocked URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scrape the page for metadata + body text
    let html = "";
    let finalUrl = targetUrl;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ChangeTheGame-Bot/1.0; +https://changethegame.app)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5,fr;q=0.3",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (res.ok) {
        const text = await res.text();
        html = text.slice(0, 600_000);
        finalUrl = res.url || targetUrl;
      }
    } catch { /* ignore fetch errors */ }

    // Extract basic OG metadata
    function getMetaContent(property: string): string | null {
      for (const attr of [`property="${property}"`, `name="${property}"`]) {
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

    const ogTitle = getMetaContent("og:title");
    const ogDesc = getMetaContent("og:description") || getMetaContent("description");
    const ogImage = getMetaContent("og:image");
    const siteName = getMetaContent("og:site_name");
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const keywords = getMetaContent("keywords");

    const basicName = siteName || ogTitle || titleTag?.[1]?.trim() || null;
    const basicDesc = ogDesc || null;

    // Extract logo: try apple-touch-icon, then og:image, then favicon
    let logo = null;
    const appleTouchIcon = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i);
    if (appleTouchIcon?.[1]) {
      try { logo = new URL(appleTouchIcon[1], finalUrl).href; } catch {}
    }
    if (!logo && ogImage) {
      try { logo = new URL(ogImage, finalUrl).href; } catch { logo = ogImage; }
    }
    if (!logo) {
      const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut\s+)?icon["'][^>]+href=["']([^"']+)["']/i);
      if (iconMatch?.[1]) {
        try { logo = new URL(iconMatch[1], finalUrl).href; } catch {}
      }
    }

    // Extract visible text for AI, stripping scripts/styles/nav for cleaner content
    const cleanedHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");

    const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyText = (bodyMatch?.[1] || cleanedHtml)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Now use AI to extract richer organization data
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiResult: any = {};

    if (LOVABLE_API_KEY && (bodyText.length > 50 || basicDesc)) {
      const textForAI = [
        `URL: ${finalUrl}`,
        basicName ? `Page Title / Site Name: ${basicName}` : "",
        basicDesc ? `Meta Description: ${basicDesc}` : "",
        keywords ? `Meta Keywords: ${keywords}` : "",
        bodyText.length > 50 ? `Page Content (truncated):\n${bodyText.slice(0, 12000)}` : "",
      ].filter(Boolean).join("\n\n");

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are an expert at analyzing organization websites to extract structured data. Be thorough: read the entire page content carefully. Infer information where reasonable based on context clues (e.g. ".edu" domains are likely academic, mentions of "members" suggest size). Always provide a rich, well-written description and mission statement even if you need to synthesize from multiple page sections. For topics, extract specific thematic areas the organization works in (e.g. "climate adaptation", "digital literacy", "social entrepreneurship") — NOT generic sector labels. For territories, identify specific geographic locations mentioned. Return as much useful data as possible.`,
              },
              {
                role: "user",
                content: `Extract detailed organization information from this website content. Be thorough and extract as much as possible:\n\n${textForAI}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_org_info",
                  description: "Extract structured organization information from a website",
                  parameters: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Official organization name (clean, without taglines)" },
                      mission_statement: { type: "string", description: "A clear, compelling 1-3 sentence mission statement. Synthesize from the page if not explicitly stated." },
                      description: { type: "string", description: "A rich 2-4 sentence description of what the organization does, who it serves, and its key activities. Write it as a professional bio." },
                      org_type: {
                        type: "string",
                        enum: ["public_sector", "corporation", "academic", "foundation", "ngo", "cooperative", "other"],
                        description: "Type of organization. Use context clues to determine.",
                      },
                      size_estimate: {
                        type: "string",
                        enum: ["small", "medium", "large"],
                        description: "Estimated size: small (<50 people), medium (50-500), large (500+). Infer from team pages, social proof, etc.",
                      },
                      topics: {
                        type: "array",
                        items: { type: "string" },
                        description: "Specific thematic topics the org works in (e.g. 'renewable energy', 'youth empowerment', 'AI ethics'). Be specific, not generic. Max 10.",
                      },
                      territories: {
                        type: "array",
                        items: { type: "string" },
                        description: "Geographic areas of activity: cities, regions, or countries mentioned. Include headquarters location if identifiable.",
                      },
                      collaboration_interests: {
                        type: "array",
                        items: { type: "string" },
                        description: "Areas where the org might seek partnerships or collaboration based on their activities (max 5)",
                      },
                    },
                    required: ["name"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "extract_org_info" } },
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            try {
              aiResult = JSON.parse(toolCall.function.arguments);
            } catch { /* ignore parse errors */ }
          }
        }
      } catch (e) {
        console.error("AI extraction error:", e);
      }
    }

    const result = {
      name: aiResult.name || basicName,
      description: aiResult.description || basicDesc,
      mission_statement: aiResult.mission_statement || null,
      org_type: aiResult.org_type || "other",
      size_estimate: aiResult.size_estimate || null,
      topics: aiResult.topics || [],
      territories: aiResult.territories || [],
      collaboration_interests: aiResult.collaboration_interests || [],
      logo,
      url: finalUrl,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-organization error:", e);
    return new Response(JSON.stringify({ error: "Failed to scrape organization" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
