import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TerritorySynthesis } from "./TerritorySynthesis";
import { useTerritoryStats } from "@/hooks/useTerritoryDetail";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronUp, ChevronDown, ArrowLeftRight } from "lucide-react";
import { FollowersDialog } from "@/components/FollowersDialog";

interface Props {
  territoryId: string;
  territoryName: string;
}

interface RelatedTerritory {
  id: string;
  name: string;
  level: string | null;
  slug: string | null;
}

function useTerritoryRelations(territoryId: string) {
  return useQuery({
    queryKey: ["territory-relations", territoryId],
    queryFn: async () => {
      // Get current territory to know its parent_id
      const { data: current } = await supabase
        .from("territories")
        .select("id, name, level, slug, parent_id")
        .eq("id", territoryId)
        .single();
      if (!current) return { parent: null, children: [], siblings: [] };

      const [parentRes, childrenRes, siblingsRes] = await Promise.all([
        // Parent
        current.parent_id
          ? supabase
              .from("territories")
              .select("id, name, level, slug")
              .eq("id", current.parent_id)
              .eq("is_deleted", false)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // Children
        supabase
          .from("territories")
          .select("id, name, level, slug")
          .eq("parent_id", territoryId)
          .eq("is_deleted", false)
          .order("name"),
        // Siblings (same parent, excluding self)
        current.parent_id
          ? supabase
              .from("territories")
              .select("id, name, level, slug")
              .eq("parent_id", current.parent_id)
              .eq("is_deleted", false)
              .neq("id", territoryId)
              .order("name")
          : Promise.resolve({ data: [] }),
      ]);

      return {
        parent: parentRes.data as RelatedTerritory | null,
        children: (childrenRes.data ?? []) as RelatedTerritory[],
        siblings: (siblingsRes.data ?? []) as RelatedTerritory[],
      };
    },
    enabled: !!territoryId,
  });
}

const LEVEL_LABELS: Record<string, string> = {
  GLOBAL: "🌍 Global",
  CONTINENT: "🌐 Continent",
  COUNTRY: "🏳️ Country",
  REGION: "🗺️ Region",
  PROVINCE: "📍 Province",
  LOCALITY: "📌 Locality",
};

function TerritoryChip({ territory }: { territory: RelatedTerritory }) {
  return (
    <Link to={`/territories/${territory.id}`}>
      <Badge
        variant="outline"
        className="cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors gap-1.5 py-1 px-2.5"
      >
        <MapPin className="h-3 w-3 shrink-0" />
        <span>{territory.name}</span>
        {territory.level && (
          <span className="text-[9px] text-muted-foreground ml-0.5">
            {LEVEL_LABELS[territory.level]?.split(" ")[0] || ""}
          </span>
        )}
      </Badge>
    </Link>
  );
}

function RelatedTerritoriesSection({ territoryId }: { territoryId: string }) {
  const { data, isLoading } = useTerritoryRelations(territoryId);

  if (isLoading || !data) return null;

  const { parent, children, siblings } = data;
  const hasAny = parent || children.length > 0 || siblings.length > 0;
  if (!hasAny) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-display text-base font-semibold flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" /> Related Territories
      </h3>

      {parent && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ChevronUp className="h-3 w-3" /> Parent
          </p>
          <div className="flex flex-wrap gap-2">
            <TerritoryChip territory={parent} />
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ChevronDown className="h-3 w-3" /> Sub-territories
            <span className="text-[10px] ml-0.5">({children.length})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {children.map((t) => (
              <TerritoryChip key={t.id} territory={t} />
            ))}
          </div>
        </div>
      )}

      {siblings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ArrowLeftRight className="h-3 w-3" /> Neighbours
            <span className="text-[10px] ml-0.5">({siblings.length})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {siblings.map((t) => (
              <TerritoryChip key={t.id} territory={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TerritoryOverviewTab({ territoryId, territoryName }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <TerritoryPeopleCount territoryId={territoryId} />
      </div>
      <RelatedTerritoriesSection territoryId={territoryId} />
      <TerritorySynthesis
        territoryId={territoryId}
        territoryName={territoryName}
        isMember={true}
      />
    </div>
  );
}

/** Connected Humans = user_territories associations (direct) + descendants */
/** Followers = people who explicitly follow but are NOT associated via user_territories */
function TerritoryPeopleCount({ territoryId }: { territoryId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["territory-people-count", territoryId],
    queryFn: async () => {
      // Get descendant territory IDs from closure table
      const { data: closureData } = await supabase
        .from("territory_closure" as any)
        .select("descendant_id")
        .eq("ancestor_id", territoryId);
      const allTerritoryIds = (closureData ?? []).map((c: any) => c.descendant_id as string);
      if (allTerritoryIds.length === 0) allTerritoryIds.push(territoryId);

      // Connected Humans: users associated via user_territories (including descendants)
      const { data: utData } = await supabase
        .from("user_territories" as any)
        .select("user_id")
        .in("territory_id", allTerritoryIds);
      const associatedIds = new Set<string>();
      (utData ?? []).forEach((u: any) => associatedIds.add(u.user_id));

      // Followers: users who follow THIS territory but are NOT in user_territories for it
      const { data: followData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("target_id", territoryId)
        .eq("target_type", "TERRITORY")
        .limit(500);
      const followerIds = new Set<string>();
      (followData ?? []).forEach((f: any) => {
        if (!associatedIds.has(f.follower_id)) {
          followerIds.add(f.follower_id);
        }
      });

      return {
        connectedHumans: associatedIds.size,
        exclusiveFollowers: followerIds.size,
      };
    },
    enabled: !!territoryId,
  });

  const connectedHumans = data?.connectedHumans ?? 0;
  const exclusiveFollowers = data?.exclusiveFollowers ?? 0;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="rounded-lg border border-border bg-card p-4 text-center hover:border-primary/30 transition-all cursor-pointer"
      >
        <p className="text-2xl font-bold text-primary">{connectedHumans}</p>
        <p className="text-sm text-muted-foreground">Connected Humans</p>
        {exclusiveFollowers > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            + {exclusiveFollowers} follower{exclusiveFollowers !== 1 ? "s" : ""}
          </p>
        )}
      </button>
      <FollowersDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetId={territoryId}
        targetType="TERRITORY"
        mode="followers"
      />
    </>
  );
}
