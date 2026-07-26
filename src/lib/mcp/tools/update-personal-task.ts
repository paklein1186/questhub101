import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dataResult, errorResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_personal_task",
  title: "Update personal task",
  description:
    "Update the status, priority or due date of one of the signed-in user's personal tasks.",
  inputSchema: {
    task_id: z.string().uuid().describe("The personal task id (from list_my_tasks)."),
    status: z.enum(["todo", "in_progress", "done"]).optional().describe("New status."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("New priority."),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("New due date in YYYY-MM-DD format."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ task_id, status, priority, due_date }, ctx) => {
    const userId = requireAuth(ctx);
    if (!userId) return errorResult("Not authenticated.");
    const patch: Record<string, unknown> = {};
    if (status) patch.status = status;
    if (priority) patch.priority = priority;
    if (due_date) patch.due_date = due_date;
    if (Object.keys(patch).length === 0) return errorResult("Nothing to update.");

    const { data, error } = await supabaseForUser(ctx)
      .from("personal_tasks")
      .update(patch)
      .eq("id", task_id)
      .eq("user_id", userId)
      .select("id, title, status, priority, due_date")
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Task not found or not yours.");
    return dataResult({ updated: data });
  },
});
