import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dataResult, errorResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_guilds",
  title: "List my guilds",
  description:
    "List the guilds, networks and collectives the signed-in user is a member of, with their role in each.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(50).describe("Maximum number of guilds to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const userId = requireAuth(ctx);
    if (!userId) return errorResult("Not authenticated.");
    const { data, error } = await supabaseForUser(ctx)
      .from("guild_members")
      .select("role, joined_at, guilds!inner(id, name, description, type, is_deleted)")
      .eq("user_id", userId)
      .limit(limit ?? 50);
    if (error) return errorResult(error.message);
    const guilds = (data ?? [])
      .map((row: Record<string, unknown>) => {
        const guild = row.guilds as Record<string, unknown> | null;
        return guild && guild.is_deleted === false
          ? { id: guild.id, name: guild.name, description: guild.description, type: guild.type, my_role: row.role, joined_at: row.joined_at }
          : null;
      })
      .filter(Boolean);
    return dataResult({ count: guilds.length, guilds });
  },
});
