import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FeedPostWithAttachments } from "@/hooks/useFeedPosts";

const CONTEXT_TYPES = ["USER", "GUILD", "COMPANY", "POD", "QUEST", "SERVICE", "COURSE", "EVENT", "TERRITORY"];

export function useFollowingFeed(filterType?: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<FeedPostWithAttachments[]>({
    queryKey: ["following-feed", userId, filterType],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return [];

      // 1. Fetch all follows for this user
      const { data: follows, error: fErr } = await supabase
        .from("follows")
        .select("target_type, target_id")
        .eq("follower_id", userId);
      if (fErr) throw fErr;
      if (!follows || follows.length === 0) return [];

      // 2. Build the set of (contextType, contextId) pairs to query
      let targets = follows.filter((f) =>
        CONTEXT_TYPES.includes(f.target_type)
      );

      // Apply filter if set
      if (filterType && filterType !== "ALL") {
        targets = targets.filter((f) => f.target_type === filterType);
      }

      if (targets.length === 0) return [];

      // 3. Query feed_posts using an OR filter
      // Supabase doesn't support multi-column IN, so we use .or()
      const orClauses = targets
        .map(
          (t) =>
            `and(context_type.eq.${t.target_type},context_id.eq.${t.target_id})`
        )
        .join(",");

      const { data: posts, error: pErr } = await supabase
        .from("feed_posts" as any)
        .select("*, post_attachments(*)")
        .eq("is_deleted", false)
        .or(orClauses)
        .order("created_at", { ascending: false })
        .limit(40);

      if (pErr) throw pErr;

      const result = (posts ?? []) as unknown as FeedPostWithAttachments[];

      // 4. Fetch author profiles
      const authorIds = [...new Set(result.map((p) => p.author_user_id))];
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url, email")
          .in("user_id", authorIds);
        const profileMap = new Map(
          (profiles ?? []).map((p) => [p.user_id, p])
        );
        for (const post of result) {
          post.author = profileMap.get(post.author_user_id) as any;
        }
      }

      // 5. Fetch context entity names for display
      const contextGroups: Record<string, string[]> = {};
      for (const post of result) {
        if (post.context_id) {
          const t = post.context_type;
          if (!contextGroups[t]) contextGroups[t] = [];
          if (!contextGroups[t].includes(post.context_id))
            contextGroups[t].push(post.context_id);
        }
      }

      const contextNames = new Map<string, string>();
      const nameFetches: Promise<void>[] = [];

      const tableMap: Record<string, { table: string; nameCol: string }> = {
        GUILD: { table: "guilds", nameCol: "name" },
        COMPANY: { table: "companies", nameCol: "name" },
        POD: { table: "pods", nameCol: "name" },
        QUEST: { table: "quests", nameCol: "title" },
        COURSE: { table: "courses", nameCol: "title" },
        SERVICE: { table: "services", nameCol: "title" },
        USER: { table: "profiles", nameCol: "name" },
      };

      for (const [type, ids] of Object.entries(contextGroups)) {
        const cfg = tableMap[type];
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

      // Attach context names to posts for display
      for (const post of result) {
        if (post.context_id) {
          (post as any).contextName =
            contextNames.get(`${post.context_type}:${post.context_id}`) || null;
        }
      }

      return result;
    },
  });
}
