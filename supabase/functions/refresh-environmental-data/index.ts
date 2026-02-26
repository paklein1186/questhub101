import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active territories with natural systems
    const { data: territories, error: tErr } = await supabase
      .from("territories")
      .select("id")
      .eq("is_deleted", false);

    if (tErr) throw tErr;

    let updated = 0;
    let errors = 0;

    for (const territory of (territories || [])) {
      try {
        // Run matching for each territory
        const { data: matches, error: mErr } = await supabase.rpc(
          "match_territory_with_datasets",
          { p_territory_id: territory.id }
        );

        if (mErr) { errors++; continue; }

        // Upsert matches
        for (const match of (matches || [])) {
          await supabase
            .from("territory_dataset_matches")
            .upsert({
              territory_id: territory.id,
              dataset_id: match.dataset_id,
              match_level: match.match_level,
              matched_granularity: match.matched_at_granularity,
              updated_at: new Date().toISOString(),
            }, { onConflict: "territory_id,dataset_id" });
        }

        // Update all natural systems in this territory
        const { data: systems } = await supabase
          .from("natural_systems")
          .select("id")
          .eq("territory_id", territory.id)
          .eq("is_deleted", false);

        for (const ns of (systems || [])) {
          await supabase.rpc("update_living_system_external_data", {
            p_natural_system_id: ns.id,
          });
        }

        updated++;
      } catch {
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        territories_processed: updated, 
        errors 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
