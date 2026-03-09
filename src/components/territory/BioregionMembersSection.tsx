/**
 * BioregionMembersSection.tsx — Shows the towns/localities included in a bioregion
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, Leaf, Loader2 } from "lucide-react";

interface BioregionMember {
  territory_id: string;
  name: string;
  level: string;
  slug: string | null;
}

export function useBioregionMembers(bioregionId: string | undefined) {
  return useQuery<BioregionMember[]>({
    queryKey: ["bioregion-members", bioregionId],
    enabled: !!bioregionId,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bioregion_members" as any)
        .select("territory_id")
        .eq("bioregion_id", bioregionId!);
      if (error) throw error;

      const ids = (data ?? []).map((d: any) => d.territory_id);
      if (ids.length === 0) return [];

      const { data: territories } = await supabase
        .from("territories")
        .select("id, name, level, slug")
        .in("id", ids);

      return (territories ?? []).map((t: any) => ({
        territory_id: t.id,
        name: t.name,
        level: t.level,
        slug: t.slug,
      }));
    },
  });
}

export function BioregionMembersSection({ bioregionId }: { bioregionId: string }) {
  const { data: members = [], isLoading } = useBioregionMembers(bioregionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Territories in this bioregion</h3>
        <Badge variant="secondary" className="text-[10px]">{members.length}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map(m => (
          <Link
            key={m.territory_id}
            to={`/territories/${m.slug ?? m.territory_id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-sm"
          >
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{m.name}</span>
            <Badge variant="outline" className="text-[9px] ml-1">{m.level}</Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
