import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dataResult, errorResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_quests",
  title: "List my quests",
  description:
    "List the quests the signed-in user created or participates in, most recent first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum number of quests to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const userId = requireAuth(ctx);
    if (!userId) return errorResult("Not authenticated.");
    const supabase = supabaseForUser(ctx);
    const max = limit ?? 20;

    const [created, joined] = await Promise.all([
      supabase
        .from("quests")
        .select("id, title, status, guild_id, created_at")
        .eq("created_by_user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(max),
      supabase
        .from("quest_participants")
        .select("role, status, quests!inner(id, title, status, guild_id, created_at, is_deleted)")
        .eq("user_id", userId)
        .limit(max),
    ]);

    if (created.error) return errorResult(created.error.message);

    const participating = (joined.data ?? [])
      .map((row: Record<string, unknown>) => {
        const quest = row.quests as Record<string, unknown> | null;
        return quest && quest.is_deleted === false ? { ...quest, my_role: row.role, my_status: row.status } : null;
      })
      .filter(Boolean);

    return dataResult({ created: created.data ?? [], participating });
  },
});
