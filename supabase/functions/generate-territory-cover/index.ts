import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { territory_id, territory_name, territory_level } = await req.json();

    if (!territory_id || !territory_name) {
      return new Response(
        JSON.stringify({ error: "territory_id and territory_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if territory already has a cover
    const { data: existing } = await supabase
      .from("territories")
      .select("stats")
      .eq("id", territory_id)
      .single();

    const stats = (existing?.stats as Record<string, unknown>) ?? {};
    if (stats.cover_url) {
      return new Response(
        JSON.stringify({ cover_url: stats.cover_url, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a nature-oriented prompt based on territory name and level
    const levelHint = {
      GLOBAL: "a breathtaking panoramic view of Earth's diverse ecosystems, oceans and mountains",
      CONTINENT: `a sweeping aerial landscape of ${territory_name}, showing diverse terrain and lush nature`,
      NATIONAL: `a stunning natural landscape of ${territory_name}, showcasing its most iconic wilderness, forests, rivers and green hills`,
      REGION: `a beautiful nature panorama of the ${territory_name} region, featuring rolling hills, forests, meadows and rivers`,
      PROVINCE: `a serene natural landscape in ${territory_name}, with green valleys, trees and gentle light`,
      TOWN: `a green, nature-rich view of ${territory_name}, featuring parks, trees, gardens and surrounding countryside`,
      LOCALITY: `a peaceful green space in ${territory_name} with trees, flowers and natural beauty`,
    }[territory_level?.toUpperCase?.()] ??
      `a beautiful natural landscape near ${territory_name} with lush greenery, trees and gentle light`;

    const prompt = `${levelHint}. Photorealistic landscape photography, golden hour lighting, vivid colors, wide angle, no text, no people, no buildings in focus. Ultra high quality nature photograph.`;

    console.log("Generating cover for:", territory_name, "prompt:", prompt);

    // Call Lovable AI image generation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to generate image" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl || !imageUrl.startsWith("data:image")) {
      console.error("No image in AI response");
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64 and upload to storage
    const base64Data = imageUrl.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const filePath = `territory-covers/${territory_id}.png`;

    // Ensure bucket exists
    const { error: bucketError } = await supabase.storage.createBucket("territory-covers", {
      public: true,
      fileSizeLimit: 10485760,
    });
    if (bucketError && !bucketError.message?.includes("already exists")) {
      console.error("Bucket creation error:", bucketError);
    }

    const { error: uploadError } = await supabase.storage
      .from("territory-covers")
      .upload(filePath, bytes.buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload image" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage
      .from("territory-covers")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Save URL in territory stats
    const updatedStats = { ...stats, cover_url: publicUrl };
    await supabase
      .from("territories")
      .update({ stats: updatedStats })
      .eq("id", territory_id);

    console.log("Cover generated and saved:", publicUrl);

    return new Response(
      JSON.stringify({ cover_url: publicUrl, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
