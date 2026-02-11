import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FeedPostWithAttachments } from "@/hooks/useFeedPosts";

export type WallSourceFilter =
  | "ALL"
  | "PROFILE"
  | "GUILD"
  | "QUEST"
  | "COMPANY"
  | "POD"
  | "COURSE_EVENT";

const TABLE_MAP: Record<string, { table: string; nameCol: string }> = {
  GUILD: { table: "guilds", nameCol: "name" },
  COMPANY: { table: "companies", nameCol: "name" },
  POD: { table: "pods", nameCol: "name" },
  QUEST: { table: "quests", nameCol: "title" },
  COURSE: { table: "courses", nameCol: "title" },
  SERVICE: { table: "services", nameCol: "title" },
  USER: { table: "profiles", nameCol: "name" },
};

/**
 * Aggregated wall feed for a profile page.
 * Collects posts from:
 *  - the profile user's own wall (contextType=USER)
 *  - units the profile user is an accepted member/owner of
 * Filtered by what the viewer is allowed to see.
 */
export function useProfileWallFeed(profileUserId: string | undefined, sourceFilter: WallSourceFilter = "ALL") {
  const { user: viewer } = useAuth();
  const viewerId = viewer?.id;

  return useQuery<FeedPostWithAttachments[]>({
    queryKey: ["profile-wall-feed", profileUserId, viewerId, sourceFilter],
    enabled: !!profileUserId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!profileUserId) return [];

      // ──── 1. Collect unit IDs the profileUser is linked to ────
      const unitContexts: { context_type: string; context_id: string }[] = [];

      // Always include profile posts
      unitContexts.push({ context_type: "USER", context_id: profileUserId });

      // Fetch memberships in parallel
      const [guildsRes, podsRes, companiesRes, questsCreatedRes, questsJoinedRes, coursesRes] = await Promise.all([
        supabase.from("guild_members").select("guild_id, role").eq("user_id", profileUserId),
        supabase.from("pod_members").select("pod_id, role").eq("user_id", profileUserId),
        supabase.from("company_members").select("company_id, role").eq("user_id", profileUserId),
        supabase.from("quests").select("id").eq("created_by_user_id", profileUserId).eq("is_deleted", false),
        supabase.from("quest_participants").select("quest_id").eq("user_id", profileUserId),
        supabase.from("courses").select("id").eq("owner_user_id", profileUserId).eq("is_deleted", false),
      ]);

      // Guild memberships (accepted roles only — filter out pending applications)
      const guildIds = (guildsRes.data ?? []).map((g) => g.guild_id);
      if (guildIds.length > 0) {
        for (const gid of guildIds) unitContexts.push({ context_type: "GUILD", context_id: gid });
      }

      // Pod memberships
      const podIds = (podsRes.data ?? []).map((p) => p.pod_id);
      for (const pid of podIds) unitContexts.push({ context_type: "POD", context_id: pid });

      // Company memberships
      const companyIds = (companiesRes.data ?? []).map((c) => c.company_id);
      for (const cid of companyIds) unitContexts.push({ context_type: "COMPANY", context_id: cid });

      // Quests (created + joined)
      const questIds = new Set<string>();
      (questsCreatedRes.data ?? []).forEach((q) => questIds.add(q.id));
      (questsJoinedRes.data ?? []).forEach((q) => questIds.add(q.quest_id));
      for (const qid of questIds) unitContexts.push({ context_type: "QUEST", context_id: qid });

      // Courses
      (coursesRes.data ?? []).forEach((c) => unitContexts.push({ context_type: "COURSE", context_id: c.id }));

      // ──── 2. Apply source filter ────
      let filtered = unitContexts;
      if (sourceFilter === "PROFILE") {
        filtered = unitContexts.filter((c) => c.context_type === "USER");
      } else if (sourceFilter === "GUILD") {
        filtered = unitContexts.filter((c) => c.context_type === "USER" || c.context_type === "GUILD");
      } else if (sourceFilter === "QUEST") {
        filtered = unitContexts.filter((c) => c.context_type === "USER" || c.context_type === "QUEST");
      } else if (sourceFilter === "COMPANY") {
        filtered = unitContexts.filter((c) => c.context_type === "USER" || c.context_type === "COMPANY");
      } else if (sourceFilter === "POD") {
        filtered = unitContexts.filter((c) => c.context_type === "USER" || c.context_type === "POD");
      } else if (sourceFilter === "COURSE_EVENT") {
        filtered = unitContexts.filter((c) => c.context_type === "USER" || c.context_type === "COURSE" || c.context_type === "EVENT");
      }

      // For non-profile filters, exclude the profile posts
      if (sourceFilter !== "ALL" && sourceFilter !== "PROFILE") {
        filtered = filtered.filter((c) => c.context_type !== "USER");
      }

      if (filtered.length === 0) return [];

      // ──── 3. Visibility checks (for viewer) ────
      // If viewer is not the profile user, check access to private units
      let visibleContexts = filtered;
      if (viewerId && viewerId !== profileUserId) {
        // Check viewer's guild memberships for private guilds
        const privateGuildIds = filtered.filter((c) => c.context_type === "GUILD").map((c) => c.context_id);
        if (privateGuildIds.length > 0) {
          // Fetch which guilds are private (is_draft or non-public)
          const { data: guildInfo } = await supabase
            .from("guilds")
            .select("id, is_draft")
            .in("id", privateGuildIds);
          const draftGuildIds = new Set((guildInfo ?? []).filter((g) => g.is_draft).map((g) => g.id));

          if (draftGuildIds.size > 0) {
            // Check if viewer is member of draft guilds
            const { data: viewerGuilds } = await supabase
              .from("guild_members")
              .select("guild_id")
              .eq("user_id", viewerId)
              .in("guild_id", [...draftGuildIds]);
            const viewerGuildSet = new Set((viewerGuilds ?? []).map((g) => g.guild_id));

            visibleContexts = visibleContexts.filter((c) => {
              if (c.context_type === "GUILD" && draftGuildIds.has(c.context_id)) {
                return viewerGuildSet.has(c.context_id);
              }
              return true;
            });
          }
        }

        // Similarly check private pods
        const privatePodIds = filtered.filter((c) => c.context_type === "POD").map((c) => c.context_id);
        if (privatePodIds.length > 0) {
          const { data: podInfo } = await supabase
            .from("pods")
            .select("id, is_draft")
            .in("id", privatePodIds);
          const draftPodIds = new Set((podInfo ?? []).filter((p) => p.is_draft).map((p) => p.id));

          if (draftPodIds.size > 0) {
            const { data: viewerPods } = await supabase
              .from("pod_members")
              .select("pod_id")
              .eq("user_id", viewerId)
              .in("pod_id", [...draftPodIds]);
            const viewerPodSet = new Set((viewerPods ?? []).map((p) => p.pod_id));

            visibleContexts = visibleContexts.filter((c) => {
              if (c.context_type === "POD" && draftPodIds.has(c.context_id)) {
                return viewerPodSet.has(c.context_id);
              }
              return true;
            });
          }
        }
      }

      if (visibleContexts.length === 0) return [];

      // ──── 4. Fetch posts ────
      const orClauses = visibleContexts
        .map((c) => `and(context_type.eq.${c.context_type},context_id.eq.${c.context_id})`)
        .join(",");

      const { data: posts, error: pErr } = await supabase
        .from("feed_posts" as any)
        .select("*, post_attachments(*)")
        .eq("is_deleted", false)
        .or(orClauses)
        .order("created_at", { ascending: false })
        .limit(50);

      if (pErr) throw pErr;
      const result = (posts ?? []) as unknown as FeedPostWithAttachments[];

      // ──── 5. Author profiles ────
      const authorIds = [...new Set(result.map((p) => p.author_user_id))];
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url, email")
          .in("user_id", authorIds);
        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        for (const post of result) {
          post.author = profileMap.get(post.author_user_id) as any;
        }
      }

      // ──── 6. Context names ────
      const contextGroups: Record<string, string[]> = {};
      for (const post of result) {
        if (post.context_id) {
          const t = post.context_type;
          if (!contextGroups[t]) contextGroups[t] = [];
          if (!contextGroups[t].includes(post.context_id)) contextGroups[t].push(post.context_id);
        }
      }

      const contextNames = new Map<string, string>();
      const nameFetches: Promise<void>[] = [];

      for (const [type, ids] of Object.entries(contextGroups)) {
        const cfg = TABLE_MAP[type];
        if (!cfg || ids.length === 0) continue;
        nameFetches.push(
          (supabase
            .from(cfg.table as any)
            .select(`id, ${cfg.nameCol}${type === "USER" ? ", user_id" : ""}`)
            .in(type === "USER" ? "user_id" : "id", ids) as any)
            .then(({ data }: any) => {
              (data ?? []).forEach((row: any) => {
                const key = type === "USER" ? row.user_id : row.id;
                contextNames.set(`${type}:${key}`, row[cfg.nameCol]);
              });
            })
        );
      }
      await Promise.all(nameFetches);

      for (const post of result) {
        if (post.context_id) {
          (post as any).contextName = contextNames.get(`${post.context_type}:${post.context_id}`) || null;
        }
        // Add context link path
        const ct = post.context_type;
        const cid = post.context_id;
        if (ct === "GUILD" && cid) (post as any).contextLink = `/guilds/${cid}`;
        else if (ct === "QUEST" && cid) (post as any).contextLink = `/quests/${cid}`;
        else if (ct === "COMPANY" && cid) (post as any).contextLink = `/companies/${cid}`;
        else if (ct === "POD" && cid) (post as any).contextLink = `/pods/${cid}`;
        else if (ct === "COURSE" && cid) (post as any).contextLink = `/courses/${cid}`;
        else if (ct === "USER" && cid) (post as any).contextLink = `/users/${cid}`;
      }

      return result;
    },
  });

  // Count available sources for filter badges
}

/**
 * Hook to get counts of posts by source type for filter badges.
 */
export function useProfileUnitCounts(profileUserId: string | undefined) {
  return useQuery({
    queryKey: ["profile-unit-counts", profileUserId],
    enabled: !!profileUserId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!profileUserId) return {};
      const [guilds, pods, companies, questsC, questsJ, courses] = await Promise.all([
        supabase.from("guild_members").select("guild_id", { count: "exact", head: true }).eq("user_id", profileUserId),
        supabase.from("pod_members").select("pod_id", { count: "exact", head: true }).eq("user_id", profileUserId),
        supabase.from("company_members").select("company_id", { count: "exact", head: true }).eq("user_id", profileUserId),
        supabase.from("quests").select("id", { count: "exact", head: true }).eq("created_by_user_id", profileUserId).eq("is_deleted", false),
        supabase.from("quest_participants").select("quest_id", { count: "exact", head: true }).eq("user_id", profileUserId),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("owner_user_id", profileUserId).eq("is_deleted", false),
      ]);
      return {
        guilds: guilds.count ?? 0,
        pods: pods.count ?? 0,
        companies: companies.count ?? 0,
        quests: (questsC.count ?? 0) + (questsJ.count ?? 0),
        courses: courses.count ?? 0,
      };
    },
  });
}
