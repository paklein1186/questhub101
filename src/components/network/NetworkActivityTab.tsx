import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2, Shield, Users, Building2, CircleDot, Compass, Heart,
  Star, MessageSquare, GraduationCap, CalendarCheck, UserPlus,
  Rss, FileText, Activity, ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Action config ───────────────────────────────────────────
const ACTION_CONFIG: Record<string, {
  icon: React.ElementType;
  verb: string;
  color: string;
}> = {
  guild_joined:       { icon: Shield,        verb: "joined guild",            color: "text-emerald-500" },
  company_joined:     { icon: Building2,     verb: "joined organization",     color: "text-blue-500" },
  pod_joined:         { icon: CircleDot,     verb: "joined pod",              color: "text-violet-500" },
  quest_joined:       { icon: Compass,       verb: "joined quest",            color: "text-amber-500" },
  quest_highlighted:  { icon: Star,          verb: "highlighted quest",       color: "text-yellow-500" },
  followed:           { icon: UserPlus,      verb: "followed",               color: "text-pink-500" },
  post_created:       { icon: FileText,      verb: "published a post",        color: "text-primary" },
  post_upvoted:       { icon: Heart,         verb: "liked a post",            color: "text-rose-500" },
  comment_created:    { icon: MessageSquare,  verb: "commented on",            color: "text-sky-500" },
  course_enrolled:    { icon: GraduationCap, verb: "enrolled in course",      color: "text-indigo-500" },
  event_registered:   { icon: CalendarCheck, verb: "registered for event",    color: "text-teal-500" },
};

const FILTER_OPTIONS = [
  { key: "all",          label: "All" },
  { key: "social",       label: "Social" },
  { key: "membership",   label: "Membership" },
  { key: "content",      label: "Content" },
  { key: "engagement",   label: "Engagement" },
] as const;

const FILTER_ACTIONS: Record<string, string[]> = {
  social:     ["followed"],
  membership: ["guild_joined", "company_joined", "pod_joined", "quest_joined", "course_enrolled", "event_registered"],
  content:    ["post_created", "comment_created"],
  engagement: ["post_upvoted", "quest_highlighted"],
};

const TARGET_ROUTES: Record<string, string> = {
  guild: "/guilds",
  company: "/companies",
  pod: "/pods",
  quest: "/quests",
  course: "/courses",
  service: "/services",
  user: "/users",
  territory: "/territories",
};

type ActivityEntry = {
  id: string;
  actor_user_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  metadata: any;
  created_at: string;
  actor_name?: string;
  actor_avatar?: string | null;
};

const PAGE_SIZE = 30;

export default function NetworkActivityTab() {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["network-activity", filter, limit],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filter !== "all" && FILTER_ACTIONS[filter]) {
        query = query.in("action_type", FILTER_ACTIONS[filter]);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data?.length) return [] as ActivityEntry[];

      // Fetch actor profiles
      const actorIds = [...new Set(data.map((a: any) => a.actor_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", actorIds);

      const profileMap = new Map(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      );

      return data.map((a: any) => {
        const profile = profileMap.get(a.actor_user_id);
        return {
          ...a,
          actor_name: profile?.name || "Someone",
          actor_avatar: profile?.avatar_url,
        } as ActivityEntry;
      });
    },
    staleTime: 30_000,
  });

  const hasMore = activities.length >= limit;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Network Activity
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Recent actions from people across the platform.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => { setFilter(f.key); setLimit(PAGE_SIZE); }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Activity list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border space-y-3">
          <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground font-medium">No activity yet.</p>
          <p className="text-sm text-muted-foreground">
            Actions from other users will appear here as the community grows.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
                className="text-xs"
              >
                <ChevronDown className="h-3.5 w-3.5 mr-1" /> Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const config = ACTION_CONFIG[entry.action_type] || {
    icon: Rss,
    verb: entry.action_type.replace(/_/g, " "),
    color: "text-muted-foreground",
  };
  const Icon = config.icon;
  const targetRoute = entry.target_type ? TARGET_ROUTES[entry.target_type] : null;
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true });

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors group">
      {/* Icon */}
      <div className={`mt-0.5 shrink-0 rounded-full p-1.5 bg-muted/60 ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <Link
            to={`/users/${entry.actor_user_id}`}
            className="font-medium hover:text-primary transition-colors"
          >
            {entry.actor_name}
          </Link>
          <span className="text-muted-foreground"> {config.verb} </span>
          {entry.target_name && targetRoute && entry.target_id ? (
            <Link
              to={`${targetRoute}/${entry.target_id}`}
              className="font-medium hover:text-primary transition-colors"
            >
              {entry.target_name.length > 60
                ? entry.target_name.slice(0, 60) + "…"
                : entry.target_name}
            </Link>
          ) : entry.target_name ? (
            <span className="font-medium">
              {entry.target_name.length > 60
                ? entry.target_name.slice(0, 60) + "…"
                : entry.target_name}
            </span>
          ) : null}
        </p>
        <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
      </div>

      {/* Actor avatar */}
      <Link to={`/users/${entry.actor_user_id}`} className="shrink-0">
        <Avatar className="h-7 w-7">
          <AvatarImage src={entry.actor_avatar || undefined} />
          <AvatarFallback className="text-[10px]">
            {entry.actor_name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      </Link>
    </div>
  );
}
