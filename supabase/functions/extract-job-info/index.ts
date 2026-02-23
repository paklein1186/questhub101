import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Extract readable text from an HTML page */
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

const SYSTEM_PROMPT = `You are a job posting information extractor. Given text from a job description document or webpage, extract the following fields. Return ONLY a valid JSON object with these keys:
- "title": string (job title)
- "description": string (job description, summarized to max 1500 chars)
- "organization_name": string (name of the recruiting organization/company/association) or null
- "contract_type": one of "full-time", "part-time", "contract", "freelance", "internship", "volunteer" or null
- "remote_policy": one of "on-site", "remote", "hybrid" or null
- "location": string (city, country) or null

If a field cannot be determined, set it to null. Return ONLY the JSON, no markdown, no explanation.`;

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
    const timeout = setTimeout(() => controller.abort(), 20000);
    let isPdf = false;
    let pdfBase64 = "";
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
      const urlLower = sourceUrl.toLowerCase();

      if (contentType.includes("application/pdf") || urlLower.endsWith(".pdf")) {
        // Send PDF directly to Gemini as multimodal input
        const bytes = new Uint8Array(await res.arrayBuffer());
        // Convert to base64
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        pdfBase64 = btoa(binary);
        isPdf = true;
        console.log("PDF detected, size:", bytes.length, "base64 length:", pdfBase64.length);
      } else if (contentType.includes("text/html") || web_url) {
        const html = await res.text();
        contentText = extractTextFromHtml(html);
      } else {
        contentText = (await res.text()).slice(0, 15000);
      }
    } catch (e) {
      clearTimeout(timeout);
      console.error("Fetch error:", e);
      return new Response(
        JSON.stringify({ error: "Could not fetch document" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isPdf && (!contentText || contentText.trim().length < 20)) {
      return new Response(
        JSON.stringify({
          error: "Could not extract enough text from the document",
          extracted: {},
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI request - use multimodal for PDFs, text for others
    let messages: any[];
    if (isPdf) {
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: "job_description.pdf",
                file_data: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
            {
              type: "text",
              text: "Extract job information from this PDF document.",
            },
          ],
        },
      ];
    } else {
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract job information from this document:\n\n${contentText}`,
        },
      ];
    }

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
          messages,
          temperature: 0.1,
          max_tokens: 2000,
        }),
      }
    );

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", errText);
      return new Response(
        JSON.stringify({ error: "AI extraction failed", extracted: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";

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
