import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Shield, Compass } from "lucide-react";

type EntityType = "GUILD" | "QUEST";

interface FollowedEntitiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  entityType: EntityType;
}

interface EntityRow {
  id: string;
  name: string;
  logo_url?: string | null;
}

export function FollowedEntitiesDialog({ open, onOpenChange, userId, entityType }: FollowedEntitiesDialogProps) {
  const { data: entities = [], isLoading } = useQuery({
    queryKey: ["followed-entities", userId, entityType],
    queryFn: async () => {
      const { data: follows } = await supabase
        .from("follows")
        .select("target_id")
        .eq("follower_id", userId)
        .eq("target_type", entityType)
        .limit(200);
      if (!follows || follows.length === 0) return [];

      const ids = follows.map((f) => f.target_id);

      if (entityType === "GUILD") {
        const { data } = await supabase
          .from("guilds")
          .select("id, name, logo_url")
          .in("id", ids)
          .eq("is_deleted", false);
        return (data ?? []) as EntityRow[];
      } else {
        const { data } = await supabase
          .from("quests")
          .select("id, title, cover_image_url")
          .in("id", ids)
          .eq("is_deleted", false);
        return (data ?? []).map((q: any) => ({
          id: q.id,
          name: q.title,
          logo_url: q.cover_image_url,
        })) as EntityRow[];
      }
    },
    enabled: open && !!userId,
  });

  const Icon = entityType === "GUILD" ? Shield : Compass;
  const label = entityType === "GUILD" ? "Guilds Followed" : "Quests Followed";
  const linkPrefix = entityType === "GUILD" ? "/guilds/" : "/quests/";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {label}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto space-y-1 -mx-2 px-2 flex-1 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : entities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No {entityType.toLowerCase()}s followed yet
            </p>
          ) : (
            entities.map((e) => (
              <Link
                key={e.id}
                to={`${linkPrefix}${e.id}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9 rounded-lg">
                  <AvatarImage src={e.logo_url ?? undefined} />
                  <AvatarFallback><Icon className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{e.name}</span>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Hook to get the count of followed entities of a given type */
export function useFollowedEntityCount(userId: string | undefined, entityType: EntityType) {
  return useQuery({
    queryKey: ["followed-entity-count", userId, entityType],
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId!)
        .eq("target_type", entityType);
      return count ?? 0;
    },
    enabled: !!userId,
  });
}
