import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, linkedinUrl } = await req.json();
    const targetUrl = url || linkedinUrl;

    if (!targetUrl || typeof targetUrl !== "string") {
      return new Response(JSON.stringify({ error: "url or linkedinUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // First, scrape the page for basic metadata
    let html = "";
    let finalUrl = targetUrl;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "ChangeTheGame-Bot/1.0" },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (res.ok) {
        const text = await res.text();
        html = text.slice(0, 500_000);
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

    const basicName = siteName || ogTitle || titleTag?.[1]?.trim() || null;
    const basicDesc = ogDesc || null;
    let logo = null;
    if (ogImage) {
      try { logo = new URL(ogImage, finalUrl).href; } catch { logo = ogImage; }
    } else {
      const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut\s+)?icon["'][^>]+href=["']([^"']+)["']/i);
      if (iconMatch?.[1]) {
        try { logo = new URL(iconMatch[1], finalUrl).href; } catch {}
      }
    }

    // Now use AI to extract richer organization data
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiResult: any = {};

    if (LOVABLE_API_KEY && (html.length > 100 || basicDesc)) {
      const textForAI = [
        basicName ? `Organization Name: ${basicName}` : "",
        basicDesc ? `Description: ${basicDesc}` : "",
        html.length > 100
          ? `Page text (truncated): ${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8000)}`
          : "",
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
                content: `You are an AI that extracts structured organization data from webpage content. Return a JSON object using the provided tool.`,
              },
              {
                role: "user",
                content: `Extract organization information from this content:\n\n${textForAI}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_org_info",
                  description: "Extract structured organization information",
                  parameters: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Organization name" },
                      mission_statement: { type: "string", description: "Mission statement or purpose (1-2 sentences)" },
                      org_type: {
                        type: "string",
                        enum: ["public_sector", "corporation", "academic", "foundation", "ngo", "cooperative", "other"],
                        description: "Type of organization",
                      },
                      sector: { type: "string", description: "Primary sector (e.g. Technology, Education, Health, Sustainability)" },
                      size_estimate: {
                        type: "string",
                        enum: ["small", "medium", "large"],
                        description: "Estimated organization size",
                      },
                      topics: {
                        type: "array",
                        items: { type: "string" },
                        description: "Key topics and themes (max 8)",
                      },
                      territories: {
                        type: "array",
                        items: { type: "string" },
                        description: "Geographic territories of activity (cities, regions, countries)",
                      },
                      collaboration_interests: {
                        type: "array",
                        items: { type: "string" },
                        description: "Areas where they might seek collaboration (max 5)",
                      },
                      causes: {
                        type: "array",
                        items: { type: "string" },
                        description: "Causes or SDGs they align with (max 5)",
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
      description: basicDesc,
      mission_statement: aiResult.mission_statement || null,
      org_type: aiResult.org_type || "other",
      sector: aiResult.sector || null,
      size_estimate: aiResult.size_estimate || null,
      topics: aiResult.topics || [],
      territories: aiResult.territories || [],
      collaboration_interests: aiResult.collaboration_interests || [],
      causes: aiResult.causes || [],
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
