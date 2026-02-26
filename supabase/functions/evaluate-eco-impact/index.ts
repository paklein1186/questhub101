import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EcoImpactRule {
  id: string;
  quest_id: string;
  natural_system_id: string | null;
  target_indicator: string;
  comparison_type: string;
  target_value: unknown;
  reward_type: string;
  reward_amount: number;
  evaluation_period: string;
}

// Narrative templates
const NARRATIVE_TEMPLATES: Record<string, { improve: string; degrade: string }> = {
  forest_cover: {
    improve: "La canopée de {{system}} se densifie à nouveau. Grâce à la quête «{{quest}}», le territoire retrouve une part de sa résilience. 🌿",
    degrade: "{{system}} traverse une période de recul forestier. La couverture diminue, appelant de nouvelles quêtes de restauration. 🍂",
  },
  carbon_stock: {
    improve: "Le stock carbone de {{system}} progresse. Les efforts de séquestration liés à «{{quest}}» portent leurs fruits. 🌱",
    degrade: "{{system}} perd du carbone stocké. Les perturbations récentes appellent une action urgente. ⚠️",
  },
  disturbances_index: {
    improve: "Les perturbations dans {{system}} diminuent. L'écosystème montre des signes de stabilisation grâce à «{{quest}}». 🛡️",
    degrade: "{{system}} subit des perturbations croissantes. L'indice de stress augmente, nécessitant une intervention. 🔥",
  },
  forest_change_rate: {
    improve: "Le taux de changement forestier de {{system}} s'améliore. La quête «{{quest}}» contribue à cette dynamique positive. 📈",
    degrade: "Le changement forestier de {{system}} s'accélère dans le mauvais sens. De nouvelles quêtes de protection sont nécessaires. 📉",
  },
};

function generateNarrative(
  indicator: string,
  direction: "improve" | "degrade",
  systemName: string,
  questTitle: string
): string {
  const templates = NARRATIVE_TEMPLATES[indicator];
  if (!templates) {
    return direction === "improve"
      ? `${systemName} montre une amélioration de son indicateur ${indicator}. La quête «${questTitle}» a contribué à ce changement.`
      : `${systemName} montre une dégradation de son indicateur ${indicator}. De nouvelles actions sont nécessaires.`;
  }
  return templates[direction]
    .replace("{{system}}", systemName)
    .replace("{{quest}}", questTitle);
}

function evaluateCondition(
  comparisonType: string,
  targetValue: unknown,
  valueBefore: number | null,
  valueAfter: number | null
): boolean {
  if (valueAfter == null) return false;
  const target = typeof targetValue === "number" ? targetValue : Number(targetValue);

  switch (comparisonType) {
    case "INCREASE":
      return valueBefore != null && valueAfter > valueBefore;
    case "DECREASE":
      return valueBefore != null && valueAfter < valueBefore;
    case "ABOVE":
      return valueAfter > target;
    case "BELOW":
      return valueAfter < target;
    case "BETWEEN": {
      const arr = Array.isArray(targetValue) ? targetValue : [0, 100];
      return valueAfter >= Number(arr[0]) && valueAfter <= Number(arr[1]);
    }
    default:
      return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Optional: evaluate a specific quest, otherwise evaluate all active rules
    let questFilter: string | null = null;
    try {
      const body = await req.json();
      questFilter = body.quest_id || null;
    } catch { /* no body = evaluate all */ }

    // Fetch active, unfulfilled rules
    let query = supabase
      .from("eco_impact_rules")
      .select("*")
      .eq("is_active", true)
      .eq("is_fulfilled", false);

    if (questFilter) {
      query = query.eq("quest_id", questFilter);
    }

    const { data: rules, error: rErr } = await query;
    if (rErr) throw rErr;

    let fulfilled = 0;
    let errors = 0;

    for (const rule of (rules || []) as EcoImpactRule[]) {
      try {
        // Get the natural system's current external_data_links
        let currentIndicators: Record<string, unknown> = {};
        if (rule.natural_system_id) {
          const { data: ns } = await supabase
            .from("natural_systems")
            .select("external_data_links, name, territory_id")
            .eq("id", rule.natural_system_id)
            .single();

          if (ns?.external_data_links) {
            currentIndicators = (typeof ns.external_data_links === "object" ? ns.external_data_links : {}) as Record<string, unknown>;
          }
        }

        // Get the quest title
        const { data: quest } = await supabase
          .from("quests")
          .select("title")
          .eq("id", rule.quest_id)
          .single();

        const { data: ns } = await supabase
          .from("natural_systems")
          .select("name, territory_id")
          .eq("id", rule.natural_system_id!)
          .single();

        const valueAfter = currentIndicators[rule.target_indicator] as number | null;
        // For now, value_before is estimated from previous events or null
        const { data: prevEvents } = await supabase
          .from("eco_impact_events")
          .select("value_after")
          .eq("natural_system_id", rule.natural_system_id!)
          .eq("indicator_name", rule.target_indicator)
          .order("created_at", { ascending: false })
          .limit(1);

        const valueBefore = prevEvents?.[0]?.value_after as number | null ?? null;

        const conditionMet = evaluateCondition(
          rule.comparison_type,
          rule.target_value,
          valueBefore,
          valueAfter
        );

        if (!conditionMet) continue;

        // Condition met! Distribute rewards
        // Get quest participants
        const { data: participants } = await supabase
          .from("quest_participants")
          .select("user_id")
          .eq("quest_id", rule.quest_id);

        const userIds = (participants || []).map((p: { user_id: string }) => p.user_id);

        // Generate narrative
        const direction = ["INCREASE", "ABOVE"].includes(rule.comparison_type) ? "improve" : "degrade";
        const narrativeText = generateNarrative(
          rule.target_indicator,
          direction as "improve" | "degrade",
          ns?.name || "Ecosystem",
          quest?.title || "Quest"
        );

        // Log the event
        const { data: event } = await supabase
          .from("eco_impact_events")
          .insert({
            rule_id: rule.id,
            quest_id: rule.quest_id,
            natural_system_id: rule.natural_system_id,
            indicator_name: rule.target_indicator,
            value_before: valueBefore,
            value_after: valueAfter,
            reward_type: rule.reward_type,
            reward_amount: rule.reward_amount,
            narrative_text: narrativeText,
            beneficiary_user_ids: userIds,
          })
          .select("id")
          .single();

        // Create narrative entry
        await supabase.from("eco_narratives").insert({
          natural_system_id: rule.natural_system_id,
          territory_id: ns?.territory_id || null,
          quest_id: rule.quest_id,
          event_id: event?.id || null,
          narrative_type: "IMPACT",
          narrative_text: narrativeText,
          indicator_key: rule.target_indicator,
          indicator_before: valueBefore,
          indicator_after: valueAfter,
        });

        // Distribute rewards to participants
        for (const userId of userIds) {
          if (rule.reward_type === "XP") {
            await supabase.from("xp_events").insert({
              user_id: userId,
              event_type: "eco_impact_reward",
              xp_amount: rule.reward_amount,
              source_type: "quest",
              source_id: rule.quest_id,
              description: `Eco-impact reward: ${rule.target_indicator} ${rule.comparison_type}`,
            });
          } else if (rule.reward_type === "CREDITS") {
            await supabase.from("credit_transactions").insert({
              user_id: userId,
              type: "eco_impact_reward",
              amount: rule.reward_amount,
              source: `quest:${rule.quest_id}`,
              related_entity_type: "quest",
              related_entity_id: rule.quest_id,
            });
          } else if (rule.reward_type === "BADGE") {
            await supabase.from("achievements").insert({
              user_id: userId,
              title: `EcoRegenerator: ${rule.target_indicator}`,
              description: narrativeText,
              quest_id: rule.quest_id,
            });
          }
        }

        // Mark rule as fulfilled if ON_COMPLETE
        if (rule.evaluation_period === "ON_COMPLETE") {
          await supabase
            .from("eco_impact_rules")
            .update({ is_fulfilled: true, fulfilled_at: new Date().toISOString() })
            .eq("id", rule.id);
        }

        // Log activity
        if (userIds.length > 0) {
          await supabase.from("activity_log").insert({
            actor_user_id: userIds[0],
            action_type: "eco_impact_triggered",
            target_type: "quest",
            target_id: rule.quest_id,
            target_name: quest?.title || null,
            metadata: {
              indicator: rule.target_indicator,
              reward_type: rule.reward_type,
              reward_amount: rule.reward_amount,
              natural_system_name: ns?.name,
            },
          });
        }

        fulfilled++;
      } catch {
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, rules_evaluated: (rules || []).length, fulfilled, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
