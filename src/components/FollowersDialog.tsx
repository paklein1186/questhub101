import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserPlus, Users } from "lucide-react";

type Mode = "followers" | "following";

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  targetType: string; // "USER" | "GUILD" | "COMPANY" | "POD" | "TERRITORY" etc.
  mode: Mode;
}

interface UserRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

export function FollowersDialog({ open, onOpenChange, targetId, targetType, mode }: FollowersDialogProps) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["follow-list", targetId, targetType, mode],
    queryFn: async () => {
      if (mode === "followers") {
        // People who follow this entity
        const { data } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("target_id", targetId)
          .eq("target_type", targetType)
          .limit(200);
        if (!data || data.length === 0) return [];
        const ids = data.map((f) => f.follower_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", ids);
        return (profiles ?? []) as UserRow[];
      } else {
        // People this user follows (only for USER type)
        const { data } = await supabase
          .from("follows")
          .select("target_id, target_type")
          .eq("follower_id", targetId)
          .eq("target_type", "USER")
          .limit(200);
        if (!data || data.length === 0) return [];
        const ids = data.map((f) => f.target_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", ids);
        return (profiles ?? []) as UserRow[];
      }
    },
    enabled: open && !!targetId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "followers" ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {mode === "followers" ? "Followers" : "Following"}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto space-y-1 -mx-2 px-2 flex-1 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {mode === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          ) : (
            users.map((u) => (
              <Link
                key={u.user_id}
                to={`/users/${u.user_id}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{u.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{u.name}</span>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Clickable stat badge for followers count */
export function EntityFollowersCount({
  entityId,
  entityType,
  variant = "card",
}: {
  entityId: string;
  entityType: string;
  variant?: "card" | "inline";
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: count = 0 } = useQuery({
    queryKey: ["followers-count", entityId, entityType],
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("target_id", entityId)
        .eq("target_type", entityType)
        .limit(500);
      if (!data || data.length === 0) return 0;
      const ids = data.map((f) => f.follower_id);
      const { count: profileCount } = await supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .in("user_id", ids);
      return profileCount ?? 0;
    },
    enabled: !!entityId,
  });

  if (variant === "inline") {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className="text-sm font-medium text-primary hover:underline cursor-pointer"
        >
          {count} followers
        </button>
        <FollowersDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          targetId={entityId}
          targetType={entityType}
          mode="followers"
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="rounded-lg border border-border bg-card p-4 text-center hover:border-primary/30 transition-all cursor-pointer"
      >
        <p className="text-2xl font-bold text-primary">{count}</p>
        <p className="text-sm text-muted-foreground">Followers</p>
      </button>
      <FollowersDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetId={entityId}
        targetType={entityType}
        mode="followers"
      />
    </>
  );
}
