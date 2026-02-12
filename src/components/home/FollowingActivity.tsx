import { useFollowingFeed } from "@/hooks/useFollowingFeed";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Users, MessageSquare, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function FollowingActivity() {
  const { data: posts = [], isLoading } = useFollowingFeed();
  const navigate = useNavigate();

  const recent = posts.slice(0, 8);

  if (isLoading) {
    return (
      <div className="w-full space-y-3">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          From your network
        </h2>
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (recent.length === 0) {
    return (
      <div className="w-full space-y-3">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          From your network
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
        <Users className="h-5 w-5 text-primary" />
        From your network
      </h2>
      <div className="space-y-2">
        {recent.map((post) => {
          const author = (post as any).author;
          const contextName = (post as any).contextName;
          const snippet = post.content
            ? post.content.length > 120
              ? post.content.slice(0, 120) + "…"
              : post.content
            : "";
          return (
            <Card
              key={post.id}
              className="flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/40 transition-colors"
              onClick={() => {
                if (post.context_type && post.context_id) {
                  const typeRoutes: Record<string, string> = {
                    GUILD: "/guilds/",
                    COMPANY: "/companies/",
                    POD: "/pods/",
                    QUEST: "/quests/",
                    SERVICE: "/services/",
                    COURSE: "/courses/",
                  };
                  const base = typeRoutes[post.context_type];
                  if (base) navigate(`${base}${post.context_id}`);
                }
              }}
            >
              <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                <AvatarImage src={author?.avatar_url || ""} />
                <AvatarFallback className="text-xs">
                  {(author?.name || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium truncate">
                    {author?.name || "Someone"}
                  </span>
                  {contextName && (
                    <>
                      <span className="text-muted-foreground text-xs">in</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {contextName}
                      </Badge>
                    </>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
                {snippet && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {snippet}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
