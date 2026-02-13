import { useState, useMemo } from "react";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { PostTile } from "@/components/feed/PostTile";
import { FeedSortControl, type FeedSortMode } from "@/components/feed/FeedSortControl";
import { FeedDisplayToggle, type FeedDisplayMode } from "@/components/feed/FeedDisplayToggle";
import { useProfileWallFeed, useProfileUnitCounts, type WallSourceFilter } from "@/hooks/useProfileWallFeed";
import { usePostUpvotes } from "@/hooks/usePostUpvote";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Shield, CircleDot, Compass, Building2, GraduationCap, User, LayoutGrid } from "lucide-react";
import { sortPosts } from "@/lib/feedSort";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface ProfileWallSectionProps {
  profileUserId: string;
  isOwnProfile: boolean;
  allowComments?: boolean;
  className?: string;
}

const SOURCE_FILTERS: { key: WallSourceFilter; label: string; icon: React.ReactNode }[] = [
  { key: "ALL", label: "All activity", icon: <LayoutGrid className="h-3 w-3" /> },
  { key: "PROFILE", label: "Profile", icon: <User className="h-3 w-3" /> },
  { key: "GUILD", label: "Guilds", icon: <Shield className="h-3 w-3" /> },
  { key: "QUEST", label: "Quests", icon: <Compass className="h-3 w-3" /> },
  { key: "COMPANY", label: "Companies", icon: <Building2 className="h-3 w-3" /> },
  { key: "POD", label: "Pods", icon: <CircleDot className="h-3 w-3" /> },
  { key: "COURSE_EVENT", label: "Courses", icon: <GraduationCap className="h-3 w-3" /> },
];

const EMPTY_MESSAGES: Record<WallSourceFilter, string> = {
   ALL: "No recent activity to show here yet.",
   PROFILE: "No posts on this profile yet.",
   GUILD: "No visible activity from guilds connected to this person yet.",
   QUEST: "No visible activity from quests connected to this person yet.",
   COMPANY: "No visible activity from companies connected to this person yet.",
   POD: "No visible activity from pods connected to this person yet.",
   COURSE_EVENT: "No visible activity from courses or events yet.",
};

const gridClasses: Record<Exclude<FeedDisplayMode, "list">, string> = {
  small: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
  medium: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
  large: "grid grid-cols-1 sm:grid-cols-2 gap-5",
};

export function ProfileWallSection({ profileUserId, isOwnProfile, allowComments = true, className }: ProfileWallSectionProps) {
   const { session } = useAuth();
   const [sourceFilter, setSourceFilter] = useState<WallSourceFilter>("ALL");
   const [sortMode, setSortMode] = useState<FeedSortMode>("recent");
   const [displayMode, setDisplayMode] = useState<FeedDisplayMode>("list");
   const isLoggedIn = !!session;

  const { data: posts = [], isLoading } = useProfileWallFeed(profileUserId, sourceFilter);
  const { data: unitCounts } = useProfileUnitCounts(profileUserId);

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { data: myUpvotes = [] } = usePostUpvotes(postIds);
  const upvotedSet = useMemo(() => new Set(myUpvotes.map((u) => u.post_id)), [myUpvotes]);

  const sortedPosts = useMemo(() => sortPosts(posts, sortMode), [posts, sortMode]);

  // Hide filter options that have no units
  const visibleFilters = SOURCE_FILTERS.filter((f) => {
    if (f.key === "ALL" || f.key === "PROFILE") return true;
    if (f.key === "GUILD") return (unitCounts?.guilds ?? 0) > 0;
    if (f.key === "QUEST") return (unitCounts?.quests ?? 0) > 0;
    if (f.key === "COMPANY") return (unitCounts?.companies ?? 0) > 0;
    if (f.key === "POD") return (unitCounts?.pods ?? 0) > 0;
    if (f.key === "COURSE_EVENT") return (unitCounts?.courses ?? 0) > 0;
    return true;
  });

  return (
    <div className={className}>
      {/* Source filter control */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {visibleFilters.map((f) => (
          <Button
            key={f.key}
            variant={sourceFilter === f.key ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs gap-1"
            onClick={() => setSourceFilter(f.key)}
          >
            {f.icon}
            {f.label}
          </Button>
        ))}
      </div>

      {/* Post composer for own profile wall */}
       {isLoggedIn && isOwnProfile && (sourceFilter === "PROFILE" || sourceFilter === "ALL") && (
         <PostComposer contextType="USER" contextId={profileUserId} />
       )}

      {/* Controls */}
       {posts.length > 0 && (
         <div className="mt-4 flex items-center justify-between gap-3">
           <FeedDisplayToggle value={displayMode} onChange={setDisplayMode} />
           <FeedSortControl value={sortMode} onChange={setSortMode} />
         </div>
       )}

       {/* Feed */}
       <div className="mt-3">
         {isLoading ? (
           <div className="flex justify-center py-8">
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
           </div>
         ) : sortedPosts.length === 0 ? (
           <div className="text-center py-8 space-y-3">
             <p className="text-sm text-muted-foreground italic">
               {EMPTY_MESSAGES[sourceFilter]}
             </p>
             {isOwnProfile && (
               <div className="flex items-center justify-center gap-2">
                 <Button size="sm" variant="outline" asChild>
                   <Link to="/quests/new">
                     <Compass className="h-4 w-4 mr-1" /> Start a quest
                   </Link>
                 </Button>
               </div>
             )}
             {!isOwnProfile && (
               <p className="text-xs text-muted-foreground">
                 Follow this person to see more of their activity in your network feed.
               </p>
             )}
           </div>
         ) : displayMode === "list" ? (
           <div className="space-y-4">
             {sortedPosts.map((post) => (
               <PostCard key={post.id} post={post} hasUpvoted={upvotedSet.has(post.id)} allowComments={allowComments} />
             ))}
           </div>
         ) : (
           <div className={gridClasses[displayMode]}>
             {sortedPosts.map((post) => (
               <PostTile key={post.id} post={post} hasUpvoted={upvotedSet.has(post.id)} size={displayMode} />
             ))}
           </div>
         )}
       </div>
    </div>
  );
}
