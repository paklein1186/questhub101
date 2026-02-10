import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserRound, Shield, Building2, Compass, CircleDot, BookOpen, MapPin, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const TYPE_META: Record<string, { label: string; icon: React.ElementType; linkPrefix: string }> = {
  USER: { label: "People", icon: UserRound, linkPrefix: "/users" },
  GUILD: { label: "Guilds & Collectives", icon: Shield, linkPrefix: "/guilds" },
  COMPANY: { label: "Companies", icon: Building2, linkPrefix: "/companies" },
  QUEST: { label: "Quests", icon: Compass, linkPrefix: "/quests" },
  POD: { label: "Pods", icon: CircleDot, linkPrefix: "/pods" },
  SERVICE: { label: "Services", icon: Wrench, linkPrefix: "/services" },
  COURSE: { label: "Courses", icon: BookOpen, linkPrefix: "/courses" },
  TERRITORY: { label: "Territories", icon: MapPin, linkPrefix: "/topics" },
};

const TYPE_ORDER = ["USER", "GUILD", "COMPANY", "QUEST", "POD", "SERVICE", "COURSE", "TERRITORY"];

interface FollowRow {
  id: string;
  target_type: string;
  target_id: string;
  created_at: string;
}

export default function MyFollowing() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: follows = [], isLoading } = useQuery<FollowRow[]>({
    queryKey: ["my-follows", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("id, target_type, target_id, created_at")
        .eq("follower_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FollowRow[];
    },
  });

  // Fetch names for followed entities
  const { data: names = {} } = useQuery({
    queryKey: ["follow-names", follows.map((f) => f.id).join(",")],
    enabled: follows.length > 0,
    queryFn: async () => {
      const nameMap: Record<string, string> = {};
      const byType: Record<string, string[]> = {};
      for (const f of follows) {
        if (!byType[f.target_type]) byType[f.target_type] = [];
        byType[f.target_type].push(f.target_id);
      }
      const promises: Promise<void>[] = [];

      const fetchNames = async (table: string, ids: string[], nameCol = "name", idCol = "id") => {
        if (!ids.length) return;
        const { data } = await supabase.from(table as any).select(`${idCol}, ${nameCol}`).in(idCol, ids);
        for (const row of data ?? []) {
          nameMap[(row as any)[idCol]] = (row as any)[nameCol];
        }
      };

      if (byType.USER) promises.push(fetchNames("profiles", byType.USER, "name", "user_id"));
      if (byType.GUILD) promises.push(fetchNames("guilds", byType.GUILD));
      if (byType.COMPANY) promises.push(fetchNames("companies", byType.COMPANY));
      if (byType.QUEST) promises.push(fetchNames("quests", byType.QUEST, "title"));
      if (byType.POD) promises.push(fetchNames("pods", byType.POD));
      if (byType.SERVICE) promises.push(fetchNames("services", byType.SERVICE, "title"));
      if (byType.COURSE) promises.push(fetchNames("courses", byType.COURSE, "title"));
      if (byType.TERRITORY) promises.push(fetchNames("territories", byType.TERRITORY));

      await Promise.all(promises);
      return nameMap;
    },
  });

  const unfollowMut = useMutation({
    mutationFn: async (followId: string) => {
      const { error } = await supabase.from("follows").delete().eq("id", followId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-follows"] });
      qc.invalidateQueries({ queryKey: ["follow"] });
      toast.success("Unfollowed");
    },
  });

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    meta: TYPE_META[type],
    items: follows.filter((f) => f.target_type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-display font-bold mb-6">My Following</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            You're not following anything yet. Explore and follow entities to see them here.
          </p>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ type, meta, items }) => {
              const Icon = meta.icon;
              return (
                <section key={type}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4" /> {meta.label}
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </h2>
                  <div className="space-y-1">
                    {items.map((f) => (
                      <div key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
                        <Link
                          to={`${meta.linkPrefix}/${f.target_id}`}
                          className="text-sm font-medium hover:underline truncate flex-1"
                        >
                          {names[f.target_id] || f.target_id.slice(0, 8) + "…"}
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => unfollowMut.mutate(f.id)}
                          disabled={unfollowMut.isPending}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Unfollow
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
