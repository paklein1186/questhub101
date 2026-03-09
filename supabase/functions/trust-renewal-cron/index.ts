import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Find active trust edges where last_confirmed_at is older than 12 months
    //    and renewal_notified_at is null (haven't been notified yet)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: renewableEdges, error: renewErr } = await supabase
      .from("trust_edges")
      .select("id, created_by, to_node_type, to_node_id, last_confirmed_at, tags")
      .eq("status", "active")
      .is("renewal_notified_at", null)
      .lt("last_confirmed_at", twelveMonthsAgo.toISOString())
      .limit(200);

    if (renewErr) throw renewErr;

    // Send notifications for edges needing renewal
    let notifiedCount = 0;
    for (const edge of renewableEdges ?? []) {
      // Resolve target name
      let targetName = "an entity";
      if (edge.to_node_type === "profile") {
        const { data: p } = await supabase.from("profiles").select("name").eq("user_id", edge.to_node_id).single();
        if (p?.name) targetName = p.name;
      } else if (edge.to_node_type === "guild") {
        const { data: g } = await supabase.from("guilds").select("name").eq("id", edge.to_node_id).single();
        if (g?.name) targetName = g.name;
      } else if (edge.to_node_type === "quest") {
        const { data: q } = await supabase.from("quests").select("title").eq("id", edge.to_node_id).single();
        if (q?.title) targetName = q.title;
      } else if (edge.to_node_type === "service") {
        const { data: s } = await supabase.from("services").select("title").eq("id", edge.to_node_id).single();
        if (s?.title) targetName = s.title;
      } else if (edge.to_node_type === "partner_entity") {
        const { data: c } = await supabase.from("companies").select("name").eq("id", edge.to_node_id).single();
        if (c?.name) targetName = c.name;
      }

      // Create notification
      await supabase.from("notifications").insert({
        user_id: edge.created_by,
        type: "TRUST_RENEWAL_DUE",
        title: "Trust renewal due",
        body: `Do you still vouch for ${targetName}? Renew your trust attestation to keep it active and earn $CTG.`,
        deep_link_url: "/network?tab=dashboard",
        data: { edge_id: edge.id, target_name: targetName },
      });

      // Mark as notified
      await supabase
        .from("trust_edges")
        .update({ renewal_notified_at: new Date().toISOString() })
        .eq("id", edge.id);

      notifiedCount++;
    }

    // 2. Mark edges as "outdated" if notified 6+ months ago and still not renewed
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: outdatedEdges, error: outErr } = await supabase
      .from("trust_edges")
      .select("id, created_by, to_node_type, to_node_id")
      .eq("status", "active")
      .not("renewal_notified_at", "is", null)
      .lt("renewal_notified_at", sixMonthsAgo.toISOString())
      .limit(200);

    if (outErr) throw outErr;

    let outdatedCount = 0;
    for (const edge of outdatedEdges ?? []) {
      await supabase
        .from("trust_edges")
        .update({ status: "outdated", updated_at: new Date().toISOString() })
        .eq("id", edge.id);

      // Notify the giver
      let targetName = "an entity";
      if (edge.to_node_type === "profile") {
        const { data: p } = await supabase.from("profiles").select("name").eq("user_id", edge.to_node_id).single();
        if (p?.name) targetName = p.name;
      }

      await supabase.from("notifications").insert({
        user_id: edge.created_by,
        type: "TRUST_EDGE_OUTDATED",
        title: "Trust attestation expired",
        body: `Your trust attestation for ${targetName} has been marked as outdated due to non-renewal.`,
        deep_link_url: "/network?tab=dashboard",
      });

      outdatedCount++;
    }

    return new Response(
      JSON.stringify({ notified: notifiedCount, outdated: outdatedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
