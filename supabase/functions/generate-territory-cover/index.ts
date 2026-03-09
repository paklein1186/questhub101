import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_COUNT = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { territory_id, territory_name, territory_level, force } = await req.json();

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

    // Check if territory already has 5 covers (unless force=true)
    const { data: existing } = await supabase
      .from("territories")
      .select("stats")
      .eq("id", territory_id)
      .single();

    const stats = (existing?.stats as Record<string, unknown>) ?? {};
    const existingCovers = (stats.cover_urls as string[]) ?? [];

    if (!force && existingCovers.length >= IMAGE_COUNT) {
      return new Response(
        JSON.stringify({ cover_urls: existingCovers, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure bucket exists
    const { error: bucketError } = await supabase.storage.createBucket("territory-covers", {
      public: true,
      fileSizeLimit: 10485760,
    });
    if (bucketError && !bucketError.message?.includes("already exists")) {
      console.error("Bucket creation error:", bucketError);
    }

    // Build prompts with variety
    const levelHint = {
      GLOBAL: "a breathtaking panoramic view of Earth's diverse ecosystems, oceans and mountains",
      CONTINENT: `a sweeping aerial landscape of ${territory_name}, showing diverse terrain and lush nature`,
      NATIONAL: `a stunning natural landscape of ${territory_name}, showcasing its most iconic wilderness, forests, rivers and green hills`,
      REGION: `a beautiful nature panorama of the ${territory_name} region, featuring rolling hills, forests, meadows and rivers`,
      PROVINCE: `a serene natural landscape in ${territory_name}, with green valleys, trees and gentle light`,
      TOWN: `a green, nature-rich view of ${territory_name}, featuring parks, trees, gardens and surrounding countryside`,
      LOCALITY: `a peaceful green space in ${territory_name} with trees, flowers and natural beauty`,
      BIOREGION: `a rich ecological landscape of the ${territory_name} bioregion, showing interconnected ecosystems, rivers, forests and wildlife habitats`,
    }[territory_level?.toUpperCase?.()] ??
      `a beautiful natural landscape near ${territory_name} with lush greenery, trees and gentle light`;

    const variations = [
      "dawn lighting, misty atmosphere, soft pastels",
      "golden hour, warm tones, dramatic clouds",
      "midday sun, vibrant saturated colors, clear sky",
      "overcast, moody green tones, intimate forest detail",
      "sunset glow, long shadows, amber and purple sky",
    ];

    const coverUrls: string[] = [];

    for (let i = 0; i < IMAGE_COUNT; i++) {
      const prompt = `${levelHint}. ${variations[i]}. Photorealistic landscape photography, wide angle, no text, no people, no buildings in focus. Ultra high quality nature photograph.`;

      console.log(`Generating cover ${i + 1}/${IMAGE_COUNT} for ${territory_name}`);

      try {
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
          console.error(`AI error for image ${i}:`, aiResponse.status, errText);
          if (aiResponse.status === 429 || aiResponse.status === 402) {
            // Stop generating more if rate limited or out of credits
            console.warn("Rate limited or out of credits, stopping generation");
            break;
          }
          continue;
        }

        const aiData = await aiResponse.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl || !imageUrl.startsWith("data:image")) {
          console.error(`No image in AI response for ${i}`);
          continue;
        }

        // Decode base64 and upload
        const base64Data = imageUrl.split(",")[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        const filePath = `territory-covers/${territory_id}_${i}.png`;

        const { error: uploadError } = await supabase.storage
          .from("territory-covers")
          .upload(filePath, bytes.buffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for image ${i}:`, uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("territory-covers")
          .getPublicUrl(filePath);

        coverUrls.push(urlData.publicUrl);
        console.log(`Cover ${i + 1} uploaded:`, urlData.publicUrl);
      } catch (err) {
        console.error(`Error generating image ${i}:`, err);
        continue;
      }
    }

    if (coverUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to generate any images" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save URLs in territory stats (replace old cover_url with cover_urls array)
    const updatedStats = { ...stats, cover_urls: coverUrls, cover_url: coverUrls[0] };
    await supabase
      .from("territories")
      .update({ stats: updatedStats })
      .eq("id", territory_id);

    console.log(`Generated ${coverUrls.length} covers for ${territory_name}`);

    return new Response(
      JSON.stringify({ cover_urls: coverUrls, cached: false }),
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
