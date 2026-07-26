import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import searchQuests from "./tools/search-quests";
import getQuest from "./tools/get-quest";
import listMyQuests from "./tools/list-my-quests";
import listMyGuilds from "./tools/list-my-guilds";
import listMyTasks from "./tools/list-my-tasks";
import createPersonalTask from "./tools/create-personal-task";
import updatePersonalTask from "./tools/update-personal-task";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (inlined by Vite at build time) so this module stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "changethegame",
  title: "changethegame",
  version: "0.1.0",
  instructions:
    "Tools for changethegame, a regenerative collaboration platform of quests, guilds and territories. Every call acts as the signed-in human: use `whoami` for their profile and balances, `list_my_quests` / `list_my_guilds` / `list_my_tasks` for their commitments, `search_quests` and `get_quest` to explore work, and the personal-task tools to manage their to-do list. All data is scoped by the platform's access rules — only what this user may see is returned.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    searchQuests,
    getQuest,
    listMyQuests,
    listMyGuilds,
    listMyTasks,
    createPersonalTask,
    updatePersonalTask,
  ],
});
