import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FeedPostWithAttachments } from "@/hooks/useFeedPosts";

const CONTEXT_TYPES = ["USER", "GUILD", "COMPANY", "POD", "QUEST", "SERVICE", "COURSE", "EVENT", "TERRITORY"];

/**
 * Ensures the user's memberships are reflected as follows.
 * Runs once per query cycle, fire-and-forget.
 */
async function syncMembershipFollows(userId: string) {
  const { data: follows } = await supabase
    .from("follows")
    .select("target_type, target_id")
    .eq("follower_id", userId);
  const followSet = new Set((follows || []).map(f => `${f.target_type}:${f.target_id}`));

  const missing: { follower_id: string; target_type: string; target_id: string }[] = [];

  const [gm, pm, cm] = await Promise.all([
    supabase.from("guild_members").select("guild_id").eq("user_id", userId),
    supabase.from("pod_members").select("pod_id").eq("user_id", userId),
    supabase.from("company_members").select("company_id").eq("user_id", userId),
  ]);

  (gm.data || []).forEach((r: any) => {
    if (!followSet.has(`GUILD:${r.guild_id}`)) missing.push({ follower_id: userId, target_type: "GUILD", target_id: r.guild_id });
  });
  (pm.data || []).forEach((r: any) => {
    if (!followSet.has(`POD:${r.pod_id}`)) missing.push({ follower_id: userId, target_type: "POD", target_id: r.pod_id });
  });
  (cm.data || []).forEach((r: any) => {
    if (!followSet.has(`COMPANY:${r.company_id}`)) missing.push({ follower_id: userId, target_type: "COMPANY", target_id: r.company_id });
  });

  if (missing.length > 0) {
    await supabase.from("follows").insert(missing as any);
  }
}

export function useFollowingFeed(filterType?: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<FeedPostWithAttachments[]>({
    queryKey: ["following-feed", userId, filterType],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return [];

      // Sync membership follows (backfill any missing)
      await syncMembershipFollows(userId);
      // 1. Fetch all follows for this user
      const { data: follows, error: fErr } = await supabase
        .from("follows")
        .select("target_type, target_id")
        .eq("follower_id", userId);
      if (fErr) throw fErr;
      if (!follows || follows.length === 0) return [];

      // Separate user follows from entity follows
      const userFollows = follows.filter(f => f.target_type === "USER");
      const entityFollows = follows.filter(f => f.target_type !== "USER");

      let targets = entityFollows.filter((f) =>
        CONTEXT_TYPES.includes(f.target_type)
      );

      // Apply filter if set
      if (filterType && filterType !== "ALL") {
        if (filterType === "USER") {
          targets = [];
        } else {
          targets = targets.filter((f) => f.target_type === filterType);
        }
      }

      // Build OR clauses for entity context matches
      const orParts: string[] = [];

      if (targets.length > 0) {
        const entityClauses = targets
          .map(
            (t) =>
              `and(context_type.eq.${t.target_type},context_id.eq.${t.target_id})`
          )
          .join(",");
        orParts.push(entityClauses);
      }

      // Also include posts authored by followed users (regardless of context)
      const followedUserIds = (!filterType || filterType === "ALL" || filterType === "USER")
        ? userFollows.map(f => f.target_id)
        : [];

      if (followedUserIds.length > 0) {
        const userClauses = followedUserIds
          .map(id => `author_user_id.eq.${id}`)
          .join(",");
        orParts.push(userClauses);
      }

      if (orParts.length === 0) return [];

      const { data: posts, error: pErr } = await supabase
        .from("feed_posts" as any)
        .select("*, post_attachments(*), post_territories(territory_id, territories(id, name, slug)), post_topics(topic_id, topics(id, name, slug))")
        .eq("is_deleted", false)
        .or(orParts.join(","))
        .order("created_at", { ascending: false })
        .limit(60);

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

      // 5. Resolve WHERE the post lives (origin)
      const ORIGIN_TYPES = ["GUILD", "GUILD_DISCUSSION", "QUEST", "QUEST_DISCUSSION", "USER", "POD", "GUILD_EVENT"];
      const lookupTypeMap: Record<string, string> = {
        GUILD: "GUILD", GUILD_DISCUSSION: "GUILD",
        QUEST: "QUEST", QUEST_DISCUSSION: "QUEST",
        USER: "USER", POD: "POD", GUILD_EVENT: "GUILD_EVENT",
      };
      const contextGroups: Record<string, string[]> = {};
      for (const post of result) {
        if (post.context_id && ORIGIN_TYPES.includes(post.context_type)) {
          const lt = lookupTypeMap[post.context_type] || post.context_type;
          if (!contextGroups[lt]) contextGroups[lt] = [];
          if (!contextGroups[lt].includes(post.context_id))
            contextGroups[lt].push(post.context_id);
        }
      }

      const contextNames = new Map<string, string>();
      const nameFetches: Promise<void>[] = [];

      const tableMap: Record<string, { table: string; nameCol: string; idCol?: string }> = {
        GUILD: { table: "guilds", nameCol: "name" },
        QUEST: { table: "quests", nameCol: "title" },
        USER: { table: "profiles", nameCol: "name", idCol: "user_id" },
        POD: { table: "pods", nameCol: "name" },
        GUILD_EVENT: { table: "guild_events", nameCol: "title" },
      };

      for (const [type, ids] of Object.entries(contextGroups)) {
        const cfg = tableMap[type];
        if (!cfg || ids.length === 0) continue;
        const idCol = cfg.idCol || "id";
        nameFetches.push(
          (supabase
            .from(cfg.table as any)
            .select(`id, ${cfg.nameCol}${idCol !== "id" ? `, ${idCol}` : ""}`)
            .in(idCol, ids) as any)
            .then(({ data }: any) => {
              (data ?? []).forEach((row: any) => {
                const key = idCol !== "id" ? row[idCol] : row.id;
                contextNames.set(`${type}:${key}`, row[cfg.nameCol]);
              });
            })
        );
      }

      // Resolve discussion room names for posts with room_id
      const roomIds = [...new Set(result.map((p: any) => p.room_id).filter(Boolean))];
      if (roomIds.length > 0) {
        nameFetches.push(
          (supabase
            .from("discussion_rooms" as any)
            .select("id, name")
            .in("id", roomIds) as any)
            .then(({ data }: any) => {
              (data ?? []).forEach((row: any) => {
                contextNames.set(`ROOM:${row.id}`, row.name);
              });
            })
        );
      }

      await Promise.all(nameFetches);

      // Attach origin context names and links
      const linkMap: Record<string, string> = {
        GUILD: "/guilds/",
        GUILD_DISCUSSION: "/guilds/",
        QUEST: "/quests/",
        QUEST_DISCUSSION: "/quests/",
        USER: "/users/",
        POD: "/pods/",
        GUILD_EVENT: "/events/",
      };

      for (const post of result) {
        if (!post.context_id || !ORIGIN_TYPES.includes(post.context_type)) continue;

        const lt = lookupTypeMap[post.context_type] || post.context_type;
        let name = contextNames.get(`${lt}:${post.context_id}`) || null;

        // For discussion posts, append room name if available
        const roomId = (post as any).room_id;
        if (roomId && name) {
          const roomName = contextNames.get(`ROOM:${roomId}`);
          if (roomName && roomName !== "General") {
            name = `${name} › ${roomName}`;
          }
        }

        // For user walls, format as "Name's wall"
        if (post.context_type === "USER" && name) {
          name = `${name}'s wall`;
        }

        (post as any).contextName = name;
        const prefix = linkMap[post.context_type];
        if (prefix) (post as any).contextLink = prefix + post.context_id;
      }

      return result;
    },
  });
}
