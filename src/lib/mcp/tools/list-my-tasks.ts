import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dataResult, errorResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_tasks",
  title: "List my tasks",
  description:
    "List the signed-in user's open work: personal tasks plus quest subtasks assigned to them.",
  inputSchema: {
    include_done: z.boolean().default(false).describe("Include tasks already marked as done."),
    limit: z.number().int().min(1).max(100).default(30).describe("Maximum number of items per list."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_done, limit }, ctx) => {
    const userId = requireAuth(ctx);
    if (!userId) return errorResult("Not authenticated.");
    const supabase = supabaseForUser(ctx);
    const max = limit ?? 30;

    let personalQuery = supabase
      .from("personal_tasks")
      .select("id, title, description, status, priority, due_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(max);
    if (!include_done) personalQuery = personalQuery.neq("status", "done");

    let subtaskQuery = supabase
      .from("quest_subtasks")
      .select("id, quest_id, title, status, priority, due_date, xp_reward, ctg_reward")
      .contains("assignee_user_ids", [userId])
      .order("due_date", { ascending: true })
      .limit(max);
    if (!include_done) subtaskQuery = subtaskQuery.neq("status", "done");

    const [personal, subtasks] = await Promise.all([personalQuery, subtaskQuery]);
    if (personal.error) return errorResult(personal.error.message);

    return dataResult({
      personal_tasks: personal.data ?? [],
      assigned_quest_subtasks: subtasks.data ?? [],
    });
  },
});
