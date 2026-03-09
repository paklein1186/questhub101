/**
 * TerritoryPortalHero.tsx
 * Hero section for the Territory Portal with single AI cover, breadcrumb, stats.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Heart, ChevronRight, Users, Compass, Shield,
  Leaf, Sprout, Star, ArrowLeft, Globe, Mountain, TreePine, Building2,
  Loader2,
} from "lucide-react";
import { useFollow } from "@/hooks/useFollow";
import { FollowTargetType } from "@/types/enums";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/* ── Types ── */
interface TerritoryAncestor {
  id: string;
  name: string;
  level: string | null;
  slug: string | null;
}

interface TerritoryPortalHeroProps {
  territory: {
    id: string;
    name: string;
    level: string;
    summary?: string | null;
    stats?: Record<string, any> | null;
    latitude?: number | null;
    longitude?: number | null;
    parent_id?: string | null;
  };
  ancestors: TerritoryAncestor[];
  memberCount: number;
  questCount: number;
  guildCount: number;
  naturalSystemCount: number;
  stewards: Array<{ user_id: string; name: string; avatar_url: string | null }>;
  isPioneerTerritory: boolean;
  onUnlock: () => void;
  onBack: () => void;
}

/* ── Level helpers ── */
const LEVEL_ICON: Record<string, React.ElementType> = {
  GLOBAL: Globe,
  CONTINENT: Mountain,
  NATIONAL: Building2,
  REGION: Mountain,
  PROVINCE: MapPin,
  TOWN: MapPin,
  LOCALITY: MapPin,
  BIOREGION: Leaf,
};

const LEVEL_LABEL: Record<string, string> = {
  GLOBAL: "Global",
  CONTINENT: "Continent",
  NATIONAL: "Country",
  REGION: "Region / Bioregion",
  PROVINCE: "Province",
  TOWN: "Town",
  LOCALITY: "Locality",
  BIOREGION: "Bioregion",
};

const LEVEL_FALLBACKS: Record<string, string> = {
  GLOBAL: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=1400&q=80",
  CONTINENT: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1400&q=80",
  NATIONAL: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1400&q=80",
  REGION: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=80",
  TOWN: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1400&q=80",
  BIOREGION: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=80",
};

function getFallback(level: string): string {
  return LEVEL_FALLBACKS[level?.toUpperCase()] ?? LEVEL_FALLBACKS["REGION"];
}

/* ── AI Cover generation hook (generates 1 cover) ── */
function useAiCover(territoryId: string, territoryName: string, level: string, hasCover: boolean) {
  return useQuery({
    queryKey: ["territory-ai-cover", territoryId],
    enabled: !hasCover,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-territory-cover", {
        body: { territory_id: territoryId, territory_name: territoryName, territory_level: level },
      });
      if (error) throw error;
      return (data as any)?.cover_url as string | null;
    },
  });
}

/* ── Stat pill ── */
function StatPill({
  icon: Icon, value, label, color = "text-muted-foreground",
}: { icon: React.ElementType; value: number | string; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Icon className={cn("h-4 w-4", color)} />
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Main component ── */
export function TerritoryPortalHero({
  territory,
  ancestors,
  memberCount,
  questCount,
  guildCount,
  naturalSystemCount,
  stewards,
  isPioneerTerritory,
  onUnlock,
  onBack,
}: TerritoryPortalHeroProps) {
  const currentUser = useCurrentUser();
  const { isFollowing, toggle: toggleFollow, isLoading: followLoading } =
    useFollow(FollowTargetType.TERRITORY, territory.id);

  // Single cover image — prefer stats.cover_url, then AI-generated, fallback to Unsplash
  const statsCoverUrl = (territory.stats as any)?.cover_url as string | undefined;
  const hasCover = !!statsCoverUrl;

  const { data: aiCoverUrl, isLoading: aiCoverLoading } = useAiCover(
    territory.id, territory.name, territory.level, hasCover
  );

  const coverImage = statsCoverUrl ?? aiCoverUrl ?? getFallback(territory.level);

  const LevelIcon = LEVEL_ICON[territory.level?.toUpperCase()] ?? MapPin;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {/* ── Banner ── */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${coverImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        {aiCoverLoading && !hasCover && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating landscape…
            </div>
          </div>
        )}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 inline-flex items-center gap-1 text-xs text-white/80 hover:text-white bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        {isPioneerTerritory && (
          <div className="absolute top-4 right-4">
            <Badge className="gap-1.5 bg-amber-500/90 text-white border-0 backdrop-blur-sm">
              <Star className="h-3 w-3 fill-white" /> Uncharted Territory
            </Badge>
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="px-4 pb-4 -mt-10 relative z-10">
        {ancestors.length > 0 && (
          <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mb-3">
            {ancestors.map((a, i) => (
              <span key={a.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
                <Link
                  to={`/territories/${a.slug ?? a.id}`}
                  className="hover:text-foreground transition-colors"
                >
                  {a.name}
                </Link>
              </span>
            ))}
            <ChevronRight className="h-3 w-3 opacity-40" />
            <span className="text-foreground font-medium">{territory.name}</span>
          </nav>
        )}

        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <LevelIcon className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground leading-tight">
                {territory.name}
              </h1>
              <Badge variant="outline" className="text-[11px] shrink-0">
                {LEVEL_LABEL[territory.level?.toUpperCase()] ?? territory.level}
              </Badge>
            </div>
            {territory.summary && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{territory.summary}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPioneerTerritory ? (
              <Button size="sm" onClick={onUnlock} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
                <Sprout className="h-3.5 w-3.5" /> Pioneer
              </Button>
            ) : (
              <Button
                size="sm"
                variant={isFollowing ? "secondary" : "default"}
                onClick={toggleFollow}
                disabled={followLoading || !currentUser.id}
                className="gap-1.5"
              >
                <Heart className={cn("h-3.5 w-3.5", isFollowing && "fill-current")} />
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
            <ShareLinkButton
              entityType="territory"
              entityId={territory.id}
              entityName={territory.name}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border/60">
          <StatPill icon={Users} value={memberCount} label="members" color="text-blue-500" />
          <StatPill icon={Compass} value={questCount} label="quests" color="text-violet-500" />
          <StatPill icon={Shield} value={guildCount} label="guilds" color="text-amber-500" />
          <StatPill icon={Leaf} value={naturalSystemCount} label="natural systems" color="text-green-500" />
        </div>

        {isPioneerTerritory && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <TreePine className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  This territory has no steward yet
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Be the first to plant roots here. Unlock this territory, set up its portal, and earn the Pioneer badge.
                </p>
              </div>
              <Button
                size="sm"
                onClick={onUnlock}
                className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0"
              >
                Unlock
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
