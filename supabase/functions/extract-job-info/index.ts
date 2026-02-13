import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Naive text extraction from a PDF binary buffer.
 *  Works for PDFs that embed text streams (most modern PDFs). */
function extractTextFromPdf(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const textChunks: string[] = [];

  // Extract text between BT ... ET blocks (PDF text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    // Extract strings in parentheses (Tj / TJ operators)
    const strRegex = /\(([^)]*)\)/g;
    let strMatch;
    while ((strMatch = strRegex.exec(block)) !== null) {
      if (strMatch[1].trim()) textChunks.push(strMatch[1]);
    }
    // Extract hex strings < ... >
    const hexRegex = /<([0-9a-fA-F]+)>/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(block)) !== null) {
      const hex = hexMatch[1];
      let str = "";
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
      }
      if (str.trim()) textChunks.push(str);
    }
  }

  // Fallback: if no BT/ET blocks found, try to grab readable ASCII
  if (textChunks.length === 0) {
    const asciiRegex = /[\x20-\x7E]{10,}/g;
    let asciiMatch;
    while ((asciiMatch = asciiRegex.exec(raw)) !== null) {
      textChunks.push(asciiMatch[0]);
    }
  }

  return textChunks.join(" ").slice(0, 15000);
}

/** Extract readable text from an HTML page */
function extractTextFromHtml(html: string): string {
  // Remove scripts, styles, tags
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url, web_url } = await req.json();
    const sourceUrl = file_url || web_url;

    if (!sourceUrl) {
      return new Response(
        JSON.stringify({ error: "file_url or web_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the content
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let contentText = "";

    try {
      const res = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "ChangeTheGame-Bot/1.0" },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch: ${res.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/pdf")) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        contentText = extractTextFromPdf(bytes);
      } else if (contentType.includes("text/html") || web_url) {
        const html = await res.text();
        contentText = extractTextFromHtml(html);
      } else {
        // Try as plain text
        contentText = (await res.text()).slice(0, 15000);
      }
    } catch (e) {
      clearTimeout(timeout);
      return new Response(
        JSON.stringify({ error: "Could not fetch document" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!contentText || contentText.trim().length < 20) {
      return new Response(
        JSON.stringify({
          error: "Could not extract enough text from the document",
          extracted: {},
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call AI to extract structured job info
    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
              content: `You are a job posting information extractor. Given text from a job description document or webpage, extract the following fields. Return ONLY a valid JSON object with these keys:
- "title": string (job title)
- "description": string (job description, summarized to max 1500 chars)
- "contract_type": one of "full-time", "part-time", "contract", "freelance", "internship", "volunteer" or null
- "remote_policy": one of "on-site", "remote", "hybrid" or null
- "location": string (city, country) or null

If a field cannot be determined, set it to null. Return ONLY the JSON, no markdown, no explanation.`,
            },
            {
              role: "user",
              content: `Extract job information from this document:\n\n${contentText}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      }
    );

    if (!aiRes.ok) {
      console.error("AI error:", await aiRes.text());
      return new Response(
        JSON.stringify({ error: "AI extraction failed", extracted: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";

    // Parse the JSON response (strip markdown fences if any)
    let extracted: Record<string, unknown> = {};
    try {
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", raw);
    }

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-job-info error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
