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
  author?: { user_id: string; name: string; avatar_url: string | null; email: string };
}

export function useFeedPosts(contextType: string, contextId?: string) {
  return useQuery<FeedPostWithAttachments[]>({
    queryKey: ["feed-posts", contextType, contextId],
    queryFn: async () => {
      let q = supabase
        .from("feed_posts")
        .select("*, post_attachments(*)")
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
          .from("profiles")
          .select("user_id, name, avatar_url, email")
          .in("user_id", authorIds);
        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        for (const post of posts) {
          post.author = profileMap.get(post.author_user_id) as any;
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
    }: {
      authorUserId: string;
      contextType: string;
      contextId?: string;
      content: string;
      attachments: Omit<PostAttachment, "id" | "post_id" | "created_at">[];
    }) => {
      // Create the post
      const { data: post, error: postError } = await supabase
        .from("feed_posts")
        .insert({
          author_user_id: authorUserId,
          context_type: contextType,
          context_id: contextId || null,
          content: content || null,
        })
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

      return postId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase
        .from("feed_posts")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", postId)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Could not delete post. You may not have permission.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["following-feed"] });
    },
  });
}
