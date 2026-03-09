/**
 * TerritoryPortalHero.tsx
 * Hero section for the Territory Portal with image gallery, breadcrumb, stats, pioneer CTA.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const LEVEL_FALLBACKS: Record<string, string[]> = {
  GLOBAL: [
    "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=1400&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=80",
  ],
  CONTINENT: [
    "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1400&q=80",
  ],
  NATIONAL: [
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1400&q=80",
  ],
  REGION: [
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1400&q=80",
  ],
  TOWN: [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1400&q=80",
    "https://images.unsplash.com/photo-1514565131-fce0801e6785?w=1400&q=80",
  ],
  BIOREGION: [
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1400&q=80",
  ],
};

function getFallbacks(level: string): string[] {
  return LEVEL_FALLBACKS[level?.toUpperCase()] ?? LEVEL_FALLBACKS["REGION"];
}

/* ── AI Cover generation hook (generates 5 covers) ── */
function useAiCovers(territoryId: string, territoryName: string, level: string, hasImages: boolean) {
  return useQuery({
    queryKey: ["territory-ai-covers", territoryId],
    enabled: !hasImages,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-territory-cover", {
        body: { territory_id: territoryId, territory_name: territoryName, territory_level: level },
      });
      if (error) throw error;
      const urls = (data as any)?.cover_urls as string[] | undefined;
      if (urls && urls.length > 0) return urls;
      // Fallback to single cover_url
      const single = (data as any)?.cover_url as string | null;
      return single ? [single] : null;
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

  // Image carousel — prefer stats.cover_urls or AI-generated, fallback to Unsplash
  const rawImages: string[] = territory.stats?.images ?? [];
  const statsCoverUrls = (territory.stats as any)?.cover_urls as string[] | undefined;
  const statsCoverUrl = (territory.stats as any)?.cover_url;
  const hasCustomImages = rawImages.length > 0 || (statsCoverUrls && statsCoverUrls.length > 0) || !!statsCoverUrl;

  const { data: aiCoverUrls, isLoading: aiCoverLoading } = useAiCovers(
    territory.id, territory.name, territory.level, hasCustomImages
  );

  const resolvedCovers = statsCoverUrls ?? (statsCoverUrl ? [statsCoverUrl] : null) ?? aiCoverUrls;
  const images = rawImages.length > 0
    ? rawImages
    : resolvedCovers && resolvedCovers.length > 0
      ? resolvedCovers
      : getFallbacks(territory.level);

  // Random start index so each visit shows a different cover first
  const [imgIdx, setImgIdx] = useState(() => Math.floor(Math.random() * 1000));
  const activeIdx = images.length > 0 ? imgIdx % images.length : 0;

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setImgIdx(i => i + 1), 5000);
    return () => clearInterval(t);
  }, [images.length]);

  const LevelIcon = LEVEL_ICON[territory.level?.toUpperCase()] ?? MapPin;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {/* ── Banner ── */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden">
        {images.map((src, i) => (
          <div
            key={src}
            className={cn(
              "absolute inset-0 bg-cover bg-center transition-opacity duration-1000",
              i === imgIdx ? "opacity-100" : "opacity-0"
            )}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        {aiCoverLoading && !hasCustomImages && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating landscape…
            </div>
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === imgIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"
                )}
              />
            ))}
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

          {stewards.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Stewards:</span>
              <div className="flex -space-x-2">
                {stewards.slice(0, 4).map(s => (
                  <Avatar key={s.user_id} className="h-6 w-6 ring-2 ring-background">
                    <AvatarImage src={s.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px]">
                      {s.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {stewards.length > 4 && (
                  <div className="h-6 w-6 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                    +{stewards.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}
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
