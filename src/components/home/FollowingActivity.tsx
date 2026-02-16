import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Loader2, Users, ChevronRight, UserPlus, Star, BookOpen,
  CalendarCheck, MessageSquare, ThumbsUp, Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { renderMentions } from "@/components/MentionTextarea";

interface NetworkItem {
  id: string;
  type: "post" | "activity";
  created_at: string;
  author?: { name: string; avatar_url: string | null; user_id: string };
  // Post fields
  content?: string;
  contextName?: string;
  context_type?: string;
  context_id?: string;
  // Activity fields
  action_type?: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  guild_joined: { label: "joined", icon: <UserPlus className="h-3 w-3 text-green-500" /> },
  company_joined: { label: "joined", icon: <UserPlus className="h-3 w-3 text-green-500" /> },
  pod_joined: { label: "joined", icon: <UserPlus className="h-3 w-3 text-green-500" /> },
  quest_joined: { label: "joined quest", icon: <Zap className="h-3 w-3 text-amber-500" /> },
  quest_highlighted: { label: "highlighted quest", icon: <Star className="h-3 w-3 text-yellow-500" /> },
  followed: { label: "started following", icon: <UserPlus className="h-3 w-3 text-primary" /> },
  course_enrolled: { label: "enrolled in course", icon: <BookOpen className="h-3 w-3 text-blue-500" /> },
  event_registered: { label: "registered for event", icon: <CalendarCheck className="h-3 w-3 text-purple-500" /> },
  comment_created: { label: "commented on", icon: <MessageSquare className="h-3 w-3 text-muted-foreground" /> },
  post_upvoted: { label: "upvoted a post", icon: <ThumbsUp className="h-3 w-3 text-pink-500" /> },
  post_created: { label: "posted", icon: <MessageSquare className="h-3 w-3 text-primary" /> },
};

const TARGET_ROUTES: Record<string, string> = {
  guild: "/guilds/",
  company: "/companies/",
  pod: "/pods/",
  quest: "/quests/",
  service: "/services/",
  course: "/courses/",
  event: "/events/",
  territory: "/territories/",
  post: "/feed",
};

export function FollowingActivity() {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery<NetworkItem[]>({
    queryKey: ["network-activity-home", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return [];

      // Get who we follow
      const { data: follows } = await supabase
        .from("follows")
        .select("target_type, target_id")
        .eq("follower_id", userId);
      if (!follows || follows.length === 0) return [];

      const followedUserIds = follows.filter(f => f.target_type === "USER").map(f => f.target_id);
      const entityFollows = follows.filter(f => f.target_type !== "USER");

      // Fetch recent activity_log from followed users
      let activities: any[] = [];
      if (followedUserIds.length > 0) {
        const { data } = await supabase
          .from("activity_log")
          .select("*")
          .in("actor_user_id", followedUserIds)
          .neq("action_type", "post_created") // avoid duplication with posts
          .order("created_at", { ascending: false })
          .limit(20);
        activities = data ?? [];
      }

      // Fetch recent posts from followed users + entity contexts
      const orParts: string[] = [];
      if (followedUserIds.length > 0) {
        orParts.push(followedUserIds.map(id => `author_user_id.eq.${id}`).join(","));
      }
      if (entityFollows.length > 0) {
        const entityClauses = entityFollows
          .map(t => `and(context_type.eq.${t.target_type},context_id.eq.${t.target_id})`)
          .join(",");
        orParts.push(entityClauses);
      }

      let posts: any[] = [];
      if (orParts.length > 0) {
        const { data } = await supabase
          .from("feed_posts" as any)
          .select("id, content, context_type, context_id, author_user_id, created_at")
          .eq("is_deleted", false)
          .or(orParts.join(","))
          .order("created_at", { ascending: false })
          .limit(20);
        posts = data ?? [];
      }

      // Fetch profiles for all actors/authors
      const allUserIds = [
        ...new Set([
          ...posts.map((p: any) => p.author_user_id),
          ...activities.map((a: any) => a.actor_user_id),
        ]),
      ];
      const profileMap = new Map<string, any>();
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", allUserIds);
        (profiles ?? []).forEach(p => profileMap.set(p.user_id, p));
      }

      // Fetch context names for posts
      const contextGroups: Record<string, string[]> = {};
      for (const post of posts) {
        if (post.context_id) {
          if (!contextGroups[post.context_type]) contextGroups[post.context_type] = [];
          if (!contextGroups[post.context_type].includes(post.context_id))
            contextGroups[post.context_type].push(post.context_id);
        }
      }
      const contextNames = new Map<string, string>();
      const tableMap: Record<string, { table: string; nameCol: string }> = {
        GUILD: { table: "guilds", nameCol: "name" },
        COMPANY: { table: "companies", nameCol: "name" },
        POD: { table: "pods", nameCol: "name" },
        QUEST: { table: "quests", nameCol: "title" },
        COURSE: { table: "courses", nameCol: "title" },
        SERVICE: { table: "services", nameCol: "title" },
        USER: { table: "profiles", nameCol: "name" },
      };
      await Promise.all(
        Object.entries(contextGroups).map(async ([type, ids]) => {
          const cfg = tableMap[type];
          if (!cfg || ids.length === 0) return;
          const { data } = await (supabase
            .from(cfg.table as any)
            .select(`id, ${cfg.nameCol}${type === "USER" ? ", user_id" : ""}`)
            .in(type === "USER" ? "user_id" : "id", ids) as any);
          (data ?? []).forEach((row: any) => {
            const key = type === "USER" ? row.user_id : row.id;
            contextNames.set(`${type}:${key}`, row[cfg.nameCol]);
          });
        })
      );

      // Merge into unified items
      const merged: NetworkItem[] = [];

      for (const p of posts) {
        merged.push({
          id: p.id,
          type: "post",
          created_at: p.created_at,
          author: profileMap.get(p.author_user_id),
          content: p.content,
          context_type: p.context_type,
          context_id: p.context_id,
          contextName: contextNames.get(`${p.context_type}:${p.context_id}`) || undefined,
        });
      }

      for (const a of activities) {
        merged.push({
          id: a.id,
          type: "activity",
          created_at: a.created_at,
          author: profileMap.get(a.actor_user_id),
          action_type: a.action_type,
          target_type: a.target_type,
          target_id: a.target_id,
          target_name: a.target_name,
        });
      }

      // Sort by created_at descending
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return merged.slice(0, 12);
    },
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-3">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> From your network
        </h2>
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full space-y-3">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> From your network
        </h2>
        <p className="text-sm text-muted-foreground text-center py-6">
          No recent activity from people you follow yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" /> From your network
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <Card
            key={item.id}
            className="flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/40 transition-colors"
            onClick={() => {
              if (item.type === "post") {
                if (item.context_type && item.context_id) {
                  const base = TARGET_ROUTES[item.context_type.toLowerCase()];
                  if (base) navigate(`${base}${item.context_id}`);
                }
              } else if (item.target_type && item.target_id) {
                const base = TARGET_ROUTES[item.target_type.toLowerCase()];
                if (base) navigate(`${base}${item.target_id}`);
              }
            }}
          >
            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
              <AvatarImage src={item.author?.avatar_url || ""} />
              <AvatarFallback className="text-xs">
                {(item.author?.name || "?")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-0.5">
              {item.type === "post" ? (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {item.author?.name || "Someone"}
                    </span>
                    {item.contextName && (
                      <>
                        <span className="text-muted-foreground text-xs">in</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {item.contextName}
                        </Badge>
                      </>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {item.content && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {renderMentions(
                        item.content.length > 140
                          ? item.content.slice(0, 140) + "…"
                          : item.content
                      )}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ACTION_LABELS[item.action_type || ""]?.icon}
                  <span className="text-sm font-medium truncate">
                    {item.author?.name || "Someone"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ACTION_LABELS[item.action_type || ""]?.label || item.action_type}
                  </span>
                  {item.target_name && (
                    <Badge variant="secondary" className="text-[10px] shrink-0 max-w-[180px] truncate">
                      {item.target_name}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          </Card>
        ))}
      </div>
    </div>
  );
}
