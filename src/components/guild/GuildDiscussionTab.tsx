import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { FeedSortControl, type FeedSortMode } from "@/components/feed/FeedSortControl";
import { usePostUpvotes } from "@/hooks/usePostUpvote";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, MessageSquare, Lock, Globe, Shield, Pin, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sortPosts } from "@/lib/feedSort";
import type { FeedPostWithAttachments } from "@/hooks/useFeedPosts";
import { useDiscussionRooms, type DiscussionRoom } from "@/hooks/useDiscussionRooms";
import { useEntityRoles } from "@/hooks/useEntityRoles";
import { usePermissionContext } from "@/hooks/usePermissionContext";
import { evaluateRoomPermissions, AUDIENCE_LABELS, type AudienceType } from "@/lib/permissions";
import { RoomCreationDialog } from "@/components/guild/RoomCreationDialog";
import { RoomSettingsDialog } from "@/components/guild/RoomSettingsDialog";
import { cn } from "@/lib/utils";

interface GuildDiscussionTabProps {
  guildId: string;
  guildName: string;
  isAdmin: boolean;
  isMember: boolean;
  canPost: boolean;
  initialTerritoryIds?: string[];
  initialTopicIds?: string[];
  /** For quest-level discussion */
  scopeType?: "GUILD" | "QUEST";
  scopeId?: string;
  membership?: { role: string };
  currentUserId?: string;
}

const VISIBILITY_LABELS: Record<string, { label: string; icon: typeof Globe }> = {
  public: { label: "Public", icon: Globe },
  members: { label: "Members only", icon: Lock },
  admins: { label: "Admins only", icon: Shield },
};

export function GuildDiscussionTab({
  guildId,
  guildName,
  isAdmin,
  isMember,
  canPost,
  initialTerritoryIds,
  initialTopicIds,
  scopeType = "GUILD",
  scopeId,
  membership,
  currentUserId: externalUserId,
}: GuildDiscussionTabProps) {
  const { session } = useAuth();
  const isLoggedIn = !!session;
  const userId = externalUserId || session?.user?.id;
  const [sortMode, setSortMode] = useState<FeedSortMode>("recent");
  const qc = useQueryClient();
  const { toast } = useToast();

  const effectiveScopeId = scopeId || guildId;
  const { rooms, isLoading: roomsLoading, createRoom, updateRoom, deleteRoom } = useDiscussionRooms(scopeType, effectiveScopeId);
  const { roles: entityRoles } = useEntityRoles("guild", guildId);
  const permCtx = usePermissionContext(guildId, userId, membership || (isMember ? { role: isAdmin ? "ADMIN" : "MEMBER" } : undefined));

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Auto-select first room
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      const defaultRoom = rooms.find((r) => r.is_default) || rooms[0];
      setSelectedRoomId(defaultRoom.id);
    }
  }, [rooms, selectedRoomId]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const roomPerms = selectedRoom ? evaluateRoomPermissions(selectedRoom, permCtx) : { canView: true, canPost: canPost, canReply: true, canManage: isAdmin };

  // Visible rooms based on permissions
  const visibleRooms = useMemo(() => {
    return rooms.filter((room) => evaluateRoomPermissions(room, permCtx).canView);
  }, [rooms, permCtx]);

  // Fetch guild features_config for highlighted posts
  const { data: guildConfig } = useQuery({
    queryKey: ["guild-config-highlights", guildId],
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("features_config").eq("id", guildId).single();
      return data;
    },
  });
  const highlightedPosts: string[] = (guildConfig?.features_config as any)?.highlightedPosts || [];

  const toggleHighlight = async (postId: string) => {
    const currentConfig = (guildConfig?.features_config as any) || {};
    const current: string[] = currentConfig.highlightedPosts || [];
    const updated = current.includes(postId)
      ? current.filter((id: string) => id !== postId)
      : [...current, postId];
    await supabase.from("guilds").update({ features_config: { ...currentConfig, highlightedPosts: updated } }).eq("id", guildId);
    qc.invalidateQueries({ queryKey: ["guild-config-highlights", guildId] });
    qc.invalidateQueries({ queryKey: ["guild", guildId] });
    qc.invalidateQueries({ queryKey: ["highlighted-posts", guildId] });
    toast({ title: current.includes(postId) ? "Post unhighlighted" : "Post highlighted in Overview" });
  };

  const contextType = scopeType === "QUEST" ? "QUEST_DISCUSSION" : "GUILD_DISCUSSION";
  const isDefaultRoom = selectedRoom?.is_default ?? false;

  const { data: posts = [], isLoading } = useQuery<FeedPostWithAttachments[]>({
    queryKey: ["guild-discussion", effectiveScopeId, selectedRoomId, isDefaultRoom],
    queryFn: async () => {
      // For the default room, also include legacy posts (room_id is null) and GUILD context posts
      if (isDefaultRoom) {
        // Fetch room-specific + legacy posts in one go using OR filter
        const { data, error } = await supabase
          .from("feed_posts")
          .select("*, post_attachments(*), post_territories(territory_id, territories(id, name, slug)), post_topics(topic_id, topics(id, name, slug))")
          .or(`and(context_type.eq.${contextType},context_id.eq.${effectiveScopeId},room_id.eq.${selectedRoomId}),and(context_type.in.(GUILD,${contextType}),context_id.eq.${effectiveScopeId},room_id.is.null)`)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        const result = (data ?? []) as unknown as FeedPostWithAttachments[];
        return await enrichPosts(result);
      }

      let query = supabase
        .from("feed_posts")
        .select("*, post_attachments(*), post_territories(territory_id, territories(id, name, slug)), post_topics(topic_id, topics(id, name, slug))")
        .eq("context_type", contextType)
        .eq("context_id", effectiveScopeId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (selectedRoomId) {
        query = query.eq("room_id", selectedRoomId);
      }

      const { data, error } = await query;
      if (error) throw error;
      const result = (data ?? []) as unknown as FeedPostWithAttachments[];
      return await enrichPosts(result);
    },
    enabled: !!selectedRoomId || rooms.length === 0,
  });

  async function enrichPosts(result: FeedPostWithAttachments[]) {
    const authorIds = [...new Set(result.map((p) => p.author_user_id))];
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", authorIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      for (const post of result) {
        post.author = profileMap.get(post.author_user_id) as any;
      }
    }
    return result;
  }

  // Filter posts by visibility based on user role
  const visiblePosts = useMemo(() => {
    return posts.filter((post: any) => {
      const vis = post.visibility || "public";
      if (vis === "public") return true;
      if (vis === "members") return isMember;
      if (vis === "admins") return isAdmin;
      return true;
    });
  }, [posts, isMember, isAdmin]);

  const postIds = useMemo(() => visiblePosts.map((p) => p.id), [visiblePosts]);
  const { data: myUpvotes = [] } = usePostUpvotes(postIds);
  const upvotedSet = useMemo(() => new Set(myUpvotes.map((u) => u.post_id)), [myUpvotes]);
  const sortedPosts = useMemo(() => sortPosts(visiblePosts, sortMode), [visiblePosts, sortMode]);

  return (
    <div className="space-y-4">
      {/* Room Selector */}
      {visibleRooms.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {visibleRooms.map((room) => {
            const roomP = evaluateRoomPermissions(room, permCtx);
            return (
              <div key={room.id} className="flex items-center">
                <button
                  onClick={() => setSelectedRoomId(room.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                    selectedRoomId === room.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/30"
                  )}
                >
                  <Hash className="h-3.5 w-3.5" />
                  {room.name}
                  {room.audience_type !== "MEMBERS" && room.audience_type !== "PUBLIC" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 ml-0.5">
                      {AUDIENCE_LABELS[room.audience_type as AudienceType]}
                    </Badge>
                  )}
                  {roomP.canManage && (
                    <RoomSettingsDialog
                      room={room}
                      roles={entityRoles}
                      onUpdate={(id, updates) => { updateRoom(id, updates); }}
                      onDelete={(id) => { deleteRoom(id); setSelectedRoomId(null); }}
                    />
                  )}
                </button>
              </div>
            );
          })}
          {(isAdmin || permCtx.isSource) && (
            <RoomCreationDialog
              roles={entityRoles}
              onSubmit={(roomData) => {
                if (userId) {
                  createRoom({ ...roomData, created_by_user_id: userId });
                }
              }}
            />
          )}
        </div>
      )}

      {/* Room description */}
      {selectedRoom?.description && (
        <p className="text-xs text-muted-foreground">{selectedRoom.description}</p>
      )}

      {isLoggedIn && roomPerms.canPost && (
        <PostComposer
          contextType={contextType}
          contextId={effectiveScopeId}
          showVisibilityPicker
          initialTerritoryIds={initialTerritoryIds}
          initialTopicIds={initialTopicIds}
          roomId={selectedRoomId || undefined}
        />
      )}

      {visiblePosts.length > 0 && (
        <div className="flex items-center justify-end">
          <FeedSortControl value={sortMode} onChange={setSortMode} />
        </div>
      )}

      {isLoading || roomsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !roomPerms.canView ? (
        <div className="text-center py-12 text-muted-foreground">
          <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">You don't have access to this room</p>
        </div>
      ) : sortedPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No discussions in {selectedRoom?.name || guildName} yet</p>
          {roomPerms.canPost && <p className="text-xs mt-1">Start a conversation!</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map((post) => {
            const vis = (post as any).visibility || "public";
            const visInfo = VISIBILITY_LABELS[vis];
            const isHighlighted = highlightedPosts.includes(post.id);
            return (
              <div key={post.id} className="relative">
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                  {isAdmin && scopeType === "GUILD" && (
                    <Button
                      variant={isHighlighted ? "default" : "outline"}
                      size="icon"
                      className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                      onClick={() => toggleHighlight(post.id)}
                      title={isHighlighted ? "Remove from Overview" : "Highlight in Overview"}
                    >
                      <Pin className={`h-3.5 w-3.5 ${isHighlighted ? "fill-current" : ""}`} />
                    </Button>
                  )}
                  {vis !== "public" && (
                    <Badge variant="outline" className="text-[10px] gap-1 bg-background/80 backdrop-blur-sm">
                      {visInfo && <visInfo.icon className="h-3 w-3" />}
                      {visInfo?.label}
                    </Badge>
                  )}
                </div>
                <PostCard post={post} hasUpvoted={upvotedSet.has(post.id)} guildContext={{ guildId, guildName, isAdmin }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
