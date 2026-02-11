import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entityType, entityId, fieldName, text, targetLanguage, audienceUserIds } = await req.json();

    if (!text || !targetLanguage || !entityType || !entityId || !fieldName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // If audienceUserIds provided, determine priority languages from their spoken languages
    let priorityLanguages: string[] = [];
    if (audienceUserIds && Array.isArray(audienceUserIds) && audienceUserIds.length > 0) {
      const { data: spokenRows } = await adminClient
        .from("user_spoken_languages")
        .select("language_code")
        .in("user_id", audienceUserIds);
      const codes = new Set((spokenRows ?? []).map((r: any) => r.language_code));
      codes.add("en");
      codes.add("fr");
      priorityLanguages = Array.from(codes);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Translation service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LANG_NAMES: Record<string, string> = {
      en: "English",
      fr: "French",
      es: "Spanish",
      sv: "Swedish",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      nl: "Dutch",
    };

    const targetLangName = LANG_NAMES[targetLanguage] || targetLanguage;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text to ${targetLangName}. Return ONLY the translated text, nothing else. Preserve any markdown formatting. Keep proper nouns, brand names, and technical terms unchanged.`,
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Translation service credits depleted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "Translation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const translatedText = aiData.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      return new Response(JSON.stringify({ error: "No translation returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store in DB using service role
    const adminClient = createClient(supabaseUrl, supabaseKey);
    const { error: upsertError } = await adminClient
      .from("content_translations")
      .upsert(
        {
          entity_type: entityType,
          entity_id: entityId,
          field_name: fieldName,
          language_code: targetLanguage,
          translated_text: translatedText,
          translated_by: "AI",
          auto_generated: true,
        },
        { onConflict: "entity_type,entity_id,field_name,language_code" }
      );

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to store translation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ translatedText, language: targetLanguage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
