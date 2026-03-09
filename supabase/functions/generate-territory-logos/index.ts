import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch territories without logos
    const { data: territories, error } = await supabase
      .from("territories")
      .select("id, name, level")
      .is("logo_url", null)
      .eq("is_deleted", false)
      .limit(5); // Process in batches of 5

    if (error) throw error;
    if (!territories || territories.length === 0) {
      return new Response(
        JSON.stringify({ message: "All territories already have logos", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; name: string; status: string }[] = [];

    for (const territory of territories) {
      try {
        const levelLabel = (territory.level || "region").toLowerCase().replace("_", " ");
        const prompt = `Create a tiny minimalist heraldic emblem icon for "${territory.name}" (${levelLabel} level territory). The emblem should be a simple shield or crest with symbolic elements representing this place. Use clean lines, bold shapes, minimal detail. Dark background with glowing accent colors (purple, teal, gold). Style: flat vector, game UI icon. On a solid dark background.`;

        const aiResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image-preview",
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
          }
        );

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${territory.name}:`, aiResponse.status, errText);
          results.push({ id: territory.id, name: territory.name, status: "ai_error" });
          continue;
        }

        const aiData = await aiResponse.json();
        const imageDataUrl =
          aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageDataUrl) {
          results.push({ id: territory.id, name: territory.name, status: "no_image" });
          continue;
        }

        // Extract base64 data
        const base64Match = imageDataUrl.match(
          /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/
        );
        if (!base64Match) {
          results.push({ id: territory.id, name: territory.name, status: "bad_format" });
          continue;
        }

        const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
        const base64Data = base64Match[2];
        const binaryData = Uint8Array.from(atob(base64Data), (c) =>
          c.charCodeAt(0)
        );

        const filePath = `${territory.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("territory-logos")
          .upload(filePath, binaryData, {
            contentType: `image/${base64Match[1]}`,
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${territory.name}:`, uploadError);
          results.push({ id: territory.id, name: territory.name, status: "upload_error" });
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from("territory-logos")
          .getPublicUrl(filePath);

        // Update territory record
        const { error: updateError } = await supabase
          .from("territories")
          .update({ logo_url: publicUrl.publicUrl })
          .eq("id", territory.id);

        if (updateError) {
          console.error(`Update error for ${territory.name}:`, updateError);
          results.push({ id: territory.id, name: territory.name, status: "db_error" });
          continue;
        }

        results.push({ id: territory.id, name: territory.name, status: "ok" });
      } catch (err) {
        console.error(`Error for ${territory.name}:`, err);
        results.push({ id: territory.id, name: territory.name, status: "error" });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-territory-logos error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
