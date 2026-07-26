import { defineTool } from "@lovable.dev/mcp-js";
import { dataResult, errorResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description:
    "Return the changethegame profile of the signed-in user: name, headline, XP, level and wallet balances (Coins, $CTG, Credits, Biopoints).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const userId = requireAuth(ctx);
    if (!userId) return errorResult("Not authenticated.");
    const { data, error } = await supabaseForUser(ctx)
      .from("profiles")
      .select(
        "user_id, name, headline, bio, location, xp_total, xp_level, coins_balance, ctg_balance, credits_balance, biopoints_balance, persona_type, current_plan_code",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("No profile found for this account.");
    return dataResult({ profile: data });
  },
});
