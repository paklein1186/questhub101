import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Compass, Shield, CircleDot, Brain, ArrowLeft, MessageSquare, Heart, Leaf } from "lucide-react";
import { useTerritoryDetail, useTerritoryStats } from "@/hooks/useTerritoryDetail";
import { TerritoryOverviewTab } from "@/components/territory/TerritoryOverviewTab";
import { TerritoryLibraryTab } from "@/components/territory/TerritoryLibraryTab";
import { TerritoryChatTab } from "@/components/territory/TerritoryChatTab";
import { TerritoryEcosystemTab } from "@/components/territory/TerritoryEcosystemTab";
import { TerritoryPostsTab } from "@/components/territory/TerritoryPostsTab";
import { TerritoryLivingDashboard } from "@/components/territory/TerritoryLivingDashboard";

import { ShareLinkButton } from "@/components/ShareLinkButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollow } from "@/hooks/useFollow";
import { FollowTargetType } from "@/types/enums";
import { cn } from "@/lib/utils";
import { GraphView } from "@/components/graph/GraphView";

export default function TerritoryDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const { data: territory, isLoading } = useTerritoryDetail(id);
  const resolvedId = territory?.id;
  const { data: stats } = useTerritoryStats(resolvedId);
  const currentUser = useCurrentUser();
  const { isFollowing, toggle: toggleFollow, isLoading: followLoading } = useFollow(
    FollowTargetType.TERRITORY,
    resolvedId ?? ""
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!territory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <MapPin className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Territory not found</p>
        <Link to="/explore" className="text-sm text-primary hover:underline">← Back to Explore</Link>
      </div>
    );
  }

  const setTab = (t: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (t === "overview") next.delete("tab"); else next.set("tab", t);
      return next;
    }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Back link */}
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/explore")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-display font-bold text-foreground">{territory.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {stats && (
                  <>
                    <span className="flex items-center gap-1"><Compass className="h-3 w-3" /> {stats.quests} quests</span>
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {stats.guilds} guilds</span>
                    <span className="flex items-center gap-1"><CircleDot className="h-3 w-3" /> {stats.pods} pods</span>
                    <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> {stats.memoryEntries} memory entries</span>
                  </>
                )}
              </div>
            </div>
            <div className="ml-auto shrink-0 flex items-center gap-2">
              <Button
                size="sm"
                variant={isFollowing ? "secondary" : "default"}
                onClick={toggleFollow}
                disabled={followLoading || !resolvedId}
                className="gap-1.5"
              >
                <Heart className={cn("h-3.5 w-3.5", isFollowing && "fill-current")} />
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <ShareLinkButton entityType="territory" entityId={territory.id} entityName={territory.name} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="ecosystem">Ecosystem</TabsTrigger>
            <TabsTrigger value="living"><Leaf className="h-3.5 w-3.5 mr-1" /> Living</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="contribute">Contribute</TabsTrigger>
            <TabsTrigger value="graph"><Compass className="h-3.5 w-3.5 mr-1" /> Graph</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <TerritoryOverviewTab territoryId={resolvedId!} territoryName={territory.name} />
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <TerritoryPostsTab territoryId={resolvedId!} territoryName={territory.name} />
          </TabsContent>

          <TabsContent value="ecosystem" className="mt-6">
            <TerritoryEcosystemTab territoryId={resolvedId!} />
          </TabsContent>

          <TabsContent value="living" className="mt-6">
            <TerritoryLivingDashboard territoryId={resolvedId!} territoryName={territory.name} />
          </TabsContent>

          <TabsContent value="library" className="mt-6">
            <TerritoryLibraryTab territoryId={resolvedId!} territoryName={territory.name} userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="contribute" className="mt-6">
            <TerritoryChatTab territoryId={resolvedId!} territoryName={territory.name} userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="graph" className="mt-6 -mx-3 sm:-mx-4">
            <GraphView centerType="territory" centerId={resolvedId!} height={700} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
