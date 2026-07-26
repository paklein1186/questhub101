import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { dataResult, errorResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_personal_task",
  title: "Create personal task",
  description:
    "Create a private personal task on the signed-in user's changethegame to-do list.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Short task title."),
    description: z.string().trim().max(2000).optional().describe("Optional task details."),
    priority: z.enum(["low", "medium", "high"]).default("medium").describe("Task priority."),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Optional due date in YYYY-MM-DD format."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, description, priority, due_date }, ctx) => {
    const userId = requireAuth(ctx);
    if (!userId) return errorResult("Not authenticated.");
    const { data, error } = await supabaseForUser(ctx)
      .from("personal_tasks")
      .insert({
        user_id: userId,
        title,
        description: description ?? null,
        priority: priority ?? "medium",
        due_date: due_date ?? null,
        status: "todo",
      })
      .select("id, title, status, priority, due_date")
      .single();
    if (error) return errorResult(error.message);
    return dataResult({ created: data });
  },
});
