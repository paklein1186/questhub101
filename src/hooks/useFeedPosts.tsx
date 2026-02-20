import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeedPost {
  id: string;
  author_user_id: string;
  context_type: string;
  context_id: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  upvote_count: number;
  reshared_post_id: string | null;
}

export interface PostAttachment {
  id: string;
  post_id: string;
  type: "IMAGE" | "DOCUMENT" | "LINK" | "VIDEO_LINK";
  url: string;
  thumbnail_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  embed_provider: string | null;
  embed_meta: Record<string, any> | null;
  sort_order: number;
  created_at: string;
}

export interface FeedPostWithAttachments extends FeedPost {
  post_attachments: PostAttachment[];
  post_territories?: { territory_id: string; territories: { id: string; name: string; slug: string | null } }[];
  post_topics?: { topic_id: string; topics: { id: string; name: string; slug: string } }[];
  author?: { user_id: string; name: string; avatar_url: string | null; email: string };
  reshared_post?: FeedPostWithAttachments | null;
}

export function useFeedPosts(contextType: string, contextId?: string) {
  return useQuery<FeedPostWithAttachments[]>({
    queryKey: ["feed-posts", contextType, contextId],
    queryFn: async () => {
      let q = supabase
        .from("feed_posts")
        .select("*, post_attachments(*), post_territories(territory_id, territories(id, name, slug)), post_topics(topic_id, topics(id, name, slug))")
        .eq("context_type", contextType)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (contextId) {
        q = q.eq("context_id", contextId);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Fetch author profiles
      const posts = (data ?? []) as unknown as FeedPostWithAttachments[];
      const authorIds = [...new Set(posts.map((p) => p.author_user_id))];
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", authorIds);
        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        for (const post of posts) {
          post.author = profileMap.get(post.author_user_id) as any;
        }
      }

      // Fetch reshared posts
      const resharedIds = posts.map((p) => p.reshared_post_id).filter(Boolean) as string[];
      if (resharedIds.length > 0) {
        const { data: resharedPosts } = await supabase
          .from("feed_posts")
          .select("*, post_attachments(*), post_territories(territory_id, territories(id, name, slug)), post_topics(topic_id, topics(id, name, slug))")
          .in("id", resharedIds);
        if (resharedPosts) {
          const resharedTyped = resharedPosts as unknown as FeedPostWithAttachments[];
          // Fetch authors for reshared posts
          const resharedAuthorIds = [...new Set(resharedTyped.map((p) => p.author_user_id))];
          if (resharedAuthorIds.length > 0) {
            const { data: rProfiles } = await supabase
              .from("profiles_public")
              .select("user_id, name, avatar_url")
              .in("user_id", resharedAuthorIds);
            const rProfileMap = new Map((rProfiles ?? []).map((p) => [p.user_id, p]));
            for (const rp of resharedTyped) {
              rp.author = rProfileMap.get(rp.author_user_id) as any;
            }
          }
          const resharedMap = new Map(resharedTyped.map((p) => [p.id, p]));
          for (const post of posts) {
            if (post.reshared_post_id) {
              post.reshared_post = resharedMap.get(post.reshared_post_id) || null;
            }
          }
        }
      }

      return posts;
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      authorUserId,
      contextType,
      contextId,
      content,
      attachments,
      territoryIds = [],
      topicIds = [],
      visibility = "public",
      resharedPostId,
      roomId,
    }: {
      authorUserId: string;
      contextType: string;
      contextId?: string;
      content: string;
      attachments: Omit<PostAttachment, "id" | "post_id" | "created_at">[];
      territoryIds?: string[];
      topicIds?: string[];
      visibility?: string;
      resharedPostId?: string;
      roomId?: string;
    }) => {
      // Create the post
      const { data: post, error: postError } = await supabase
        .from("feed_posts")
        .insert({
          author_user_id: authorUserId,
          context_type: contextType,
          context_id: contextId || null,
          content: content || null,
          visibility,
          reshared_post_id: resharedPostId || null,
          room_id: roomId || null,
        } as any)
        .select("id")
        .single();

      if (postError) throw postError;
      const postId = post.id;

      // Insert attachments
      if (attachments.length > 0) {
        const rows = attachments.map((a, i) => ({
          post_id: postId,
          type: a.type,
          url: a.url,
          thumbnail_url: a.thumbnail_url || null,
          file_name: a.file_name || null,
          file_size_bytes: a.file_size_bytes || null,
          mime_type: a.mime_type || null,
          embed_provider: a.embed_provider || null,
          embed_meta: a.embed_meta || null,
          sort_order: i,
        }));
        const { error: attError } = await supabase
          .from("post_attachments")
          .insert(rows as any);
        if (attError) throw attError;
      }

      // Insert territory relations
      if (territoryIds.length > 0) {
        const terrRows = territoryIds.map((tid) => ({
          post_id: postId,
          territory_id: tid,
        }));
        const { error: terrError } = await supabase
          .from("post_territories")
          .insert(terrRows as any);
        if (terrError) throw terrError;
      }

      // Insert topic relations
      if (topicIds.length > 0) {
        const topicRows = topicIds.map((tid) => ({
          post_id: postId,
          topic_id: tid,
        }));
        const { error: topicError } = await supabase
          .from("post_topics")
          .insert(topicRows as any);
      if (topicError) throw topicError;
      }

      // ── Fire-and-forget notifications ──
      try {
        // Wall post: notify the wall owner
        if (contextType === "USER" && contextId && contextId !== authorUserId) {
          const { data: authorProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", authorUserId)
            .single();
          const authorName = authorProfile?.name || "Someone";
          await supabase.from("notifications").insert({
            user_id: contextId,
            type: "FOLLOWED_USER_NEW_POST",
            title: "New post on your wall",
            body: `${authorName} posted on your wall`,
            related_entity_type: "FEED_POST",
            related_entity_id: postId,
            deep_link_url: `/users/${contextId}`,
          } as any);
        }

        // Entity post: notify members of the entity (guild, company, pod, quest)
        const ENTITY_MEMBER_TABLES: Record<string, { table: string; idCol: string; deepPrefix: string }> = {
          GUILD: { table: "guild_members", idCol: "guild_id", deepPrefix: "/guilds" },
          GUILD_DISCUSSION: { table: "guild_members", idCol: "guild_id", deepPrefix: "/guilds" },
          COMPANY: { table: "company_members", idCol: "company_id", deepPrefix: "/companies" },
          POD: { table: "pod_members", idCol: "pod_id", deepPrefix: "/pods" },
          QUEST: { table: "quest_members", idCol: "quest_id", deepPrefix: "/quests" },
        };

        const entityConfig = ENTITY_MEMBER_TABLES[contextType];
        if (entityConfig && contextId) {
          const { data: members } = await supabase
            .from(entityConfig.table as any)
            .select("user_id")
            .eq(entityConfig.idCol, contextId)
            .limit(200);

          if (members && members.length > 0) {
            const { data: authorProfile } = await supabase
              .from("profiles")
              .select("name")
              .eq("user_id", authorUserId)
              .single();
            const authorName = authorProfile?.name || "Someone";
            const notifRows = (members as any[])
              .filter((m: any) => m.user_id !== authorUserId)
              .map((m: any) => ({
                user_id: m.user_id,
                type: "FOLLOWED_ENTITY_NEW_POST",
                title: "New post in your entity",
                body: `${authorName} published a new post`,
                related_entity_type: contextType.replace("_DISCUSSION", ""),
                related_entity_id: contextId,
                deep_link_url: `${entityConfig.deepPrefix}/${contextId}`,
              }));
            if (notifRows.length > 0) {
              await supabase.from("notifications").insert(notifRows as any);
            }
          }
        }
      } catch (notifErr) {
        console.error("[PostNotification] Error:", notifErr);
      }

      return postId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["profile-wall-feed"] });
      qc.invalidateQueries({ queryKey: ["following-feed"] });
    },
  });
}

export function useEditPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      content,
      territoryIds,
      topicIds,
      newAttachments,
      removedAttachmentIds,
    }: {
      postId: string;
      content: string;
      territoryIds?: string[];
      topicIds?: string[];
      newAttachments?: Omit<PostAttachment, "id" | "post_id" | "created_at">[];
      removedAttachmentIds?: string[];
    }) => {
      const { error } = await supabase
        .from("feed_posts")
        .update({ content: content || null, updated_at: new Date().toISOString() })
        .eq("id", postId);
      if (error) throw error;

      // Clear cached translations so they get re-generated
      await supabase
        .from("content_translations")
        .delete()
        .eq("entity_type", "feed_post")
        .eq("entity_id", postId);

      // Remove deleted attachments
      if (removedAttachmentIds && removedAttachmentIds.length > 0) {
        await supabase
          .from("post_attachments")
          .delete()
          .in("id", removedAttachmentIds);
      }

      // Insert new attachments
      if (newAttachments && newAttachments.length > 0) {
        const rows = newAttachments.map((a) => ({ ...a, post_id: postId }));
        await supabase.from("post_attachments").insert(rows as any);
      }

      // Sync territories if provided
      if (territoryIds !== undefined) {
        await supabase.from("post_territories").delete().eq("post_id", postId);
        if (territoryIds.length > 0) {
          const rows = territoryIds.map((territory_id) => ({ post_id: postId, territory_id }));
          await supabase.from("post_territories").insert(rows as any);
        }
      }

      // Sync topics if provided
      if (topicIds !== undefined) {
        await supabase.from("post_topics").delete().eq("post_id", postId);
        if (topicIds.length > 0) {
          const rows = topicIds.map((topic_id) => ({ post_id: postId, topic_id }));
          await supabase.from("post_topics").insert(rows as any);
        }
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["profile-wall-feed"] });
      qc.invalidateQueries({ queryKey: ["following-feed"] });
      qc.invalidateQueries({ queryKey: ["territory-posts"] });
      qc.invalidateQueries({ queryKey: ["post-translation", variables.postId] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("feed_posts")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["following-feed"] });
      qc.invalidateQueries({ queryKey: ["profile-wall-feed"] });
    },
  });
}
