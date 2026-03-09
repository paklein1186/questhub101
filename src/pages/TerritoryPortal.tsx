/**
 * TerritoryPortal.tsx — Replaces TerritoryDetail.tsx
 * Route: /territories/:id
 */

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Globe, Leaf, Compass, BookOpen, Settings, Network, Swords, Brain, MessageSquarePlus } from "lucide-react";

import { TerritoryPortalHero } from "@/components/territory/TerritoryPortalHero";
import { TerritoryQuestGrid } from "@/components/territory/TerritoryQuestGrid";
import { TerritoryGuestPortal } from "@/components/territory/TerritoryGuestPortal";
import { TerritoryUnlockModal } from "@/components/territory/TerritoryUnlockModal";
import { TerritoryAdminPanel } from "@/components/territory/TerritoryAdminPanel";

import { TerritoryEcosystemTab } from "@/components/territory/TerritoryEcosystemTab";
import { TerritoryLibraryTab } from "@/components/territory/TerritoryLibraryTab";
import { TerritoryLivingDashboard } from "@/components/territory/TerritoryLivingDashboard";
import { TerritoryMemoryTab } from "@/components/territory/TerritoryMemoryTab";
import { TerritoryChatTab } from "@/components/territory/TerritoryChatTab";
import { TerritorySynthesis } from "@/components/territory/TerritorySynthesis";

import { GraphView } from "@/components/graph/GraphView";
import { BioregionMembersSection } from "@/components/territory/BioregionMembersSection";
import { PiContextSetter } from "@/components/assistant/PiContextSetter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTerritoryDetail, useTerritoryStats } from "@/hooks/useTerritoryDetail";

/* ── Types ── */
interface TerritoryAncestor {
  id: string;
  name: string;
  level: string | null;
  slug: string | null;
}

/* ── Hooks ── */

function useTerritoryAncestors(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-ancestors", territoryId],
    enabled: !!territoryId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_territory_ancestors" as any, { p_id: territoryId });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r: any) => ({
        id: r.id,
        name: r.name,
        level: r.level,
        slug: r.slug,
      }));
    },
  });
}

function useTerritoryMemberCount(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-member-count", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("user_territories")
        .select("user_id", { count: "exact", head: true })
        .eq("territory_id", territoryId!);
      return count ?? 0;
    },
  });
}

function useIsAlreadyMember(territoryId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["territory-is-member", territoryId, userId],
    enabled: !!territoryId && !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_territories")
        .select("id")
        .eq("territory_id", territoryId!)
        .eq("user_id", userId!)
        .maybeSingle();
      return !!data;
    },
  });
}

function useCurrentUserXpLevel(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-xp-level", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("xp_level")
        .eq("user_id", userId!)
        .single();
      return (data as any)?.xp_level ?? 1;
    },
  });
}

function useUserCtgBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-ctg-balance", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("ctg_balance")
        .eq("user_id", userId!)
        .single();
      return (data as any)?.ctg_balance ?? 0;
    },
  });
}

function useTerritoryNaturalSystemCount(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-ns-count", territoryId],
    enabled: !!territoryId,
    staleTime: 120_000,
    queryFn: async () => {
      const { count } = await (supabase
        .from("natural_system_territories" as any)
        .select("natural_system_id", { count: "exact", head: true }) as any)
        .eq("territory_id", territoryId!);
      return count ?? 0;
    },
  });
}

function useTerritoryPortalStewards(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-portal-stewards", territoryId],
    enabled: !!territoryId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data: edges } = await (supabase
        .from("trust_edges")
        .select("from_id") as any)
        .eq("to_id", territoryId!)
        .eq("edge_type", "stewardship")
        .eq("status", "active")
        .limit(6);

      const stewardIds = (edges ?? []).map((e: any) => e.from_id);
      if (stewardIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", stewardIds);

      return (profiles ?? []) as Array<{ user_id: string; name: string; avatar_url: string | null }>;
    },
  });
}

function useIsTerritoryAdmin(territoryId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["territory-is-admin", territoryId, userId],
    enabled: !!territoryId && !!userId,
    staleTime: 120_000,
    queryFn: async () => {
      const [stewardRes, profileRes] = await Promise.all([
        (supabase
          .from("trust_edges")
          .select("id") as any)
          .eq("from_id", userId!)
          .eq("to_id", territoryId!)
          .eq("edge_type", "stewardship")
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", userId!)
          .single(),
      ]);

      const isSteward = !!stewardRes.data;
      const isSuperAdmin = (profileRes.data as any)?.role === "admin";
      return { isSteward, isSuperAdmin };
    },
  });
}

/* ── Main page ── */
export default function TerritoryPortal() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "portal";

  const [unlockOpen, setUnlockOpen] = useState(false);

  const { data: territory, isLoading } = useTerritoryDetail(id);
  const resolvedId = territory?.id;

  const { data: ancestors = [] } = useTerritoryAncestors(resolvedId);
  const { data: stats } = useTerritoryStats(resolvedId);
  const { data: memberCount = 0, isLoading: memberCountLoading } = useTerritoryMemberCount(resolvedId);
  const { data: naturalSystemCount = 0 } = useTerritoryNaturalSystemCount(resolvedId);
  const { data: stewards = [], isLoading: stewardsLoading } = useTerritoryPortalStewards(resolvedId);

  const currentUser = useCurrentUser();
  const { data: adminStatus } = useIsTerritoryAdmin(resolvedId, currentUser.id);
  const { data: xpLevel = 1 } = useCurrentUserXpLevel(currentUser.id || undefined);
  const { data: ctgBalance = 0 } = useUserCtgBalance(currentUser.id || undefined);

  const isPioneerTerritory = !memberCountLoading && !stewardsLoading && memberCount === 0 && stewards.length === 0;
  const isAuthenticated = !!currentUser.id;
  const { data: isAlreadyMember = false } = useIsAlreadyMember(resolvedId, currentUser.id);

  const canAdmin = adminStatus?.isSteward || adminStatus?.isSuperAdmin;
  const canCreateQuest = isAuthenticated && !!canAdmin;

  const LEGACY_TABS: Record<string, string> = {
    overview: "portal",
    posts: "portal",
    contribute: "library",
  };
  useEffect(() => {
    if (LEGACY_TABS[tab]) {
      setTab(LEGACY_TABS[tab]);
      return;
    }
    if (tab === "admin" && adminStatus !== undefined && !canAdmin) {
      setTab("portal");
    }
  }, [tab, canAdmin, adminStatus]);

  const setTab = (t: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (t === "portal") next.delete("tab");
      else next.set("tab", t);
      return next;
    }, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!territory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <Globe className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground font-medium">Territory not found</p>
        <button onClick={() => navigate("/explore")} className="text-sm text-primary hover:underline">
          ← Back to Explore
        </button>
      </div>
    );
  }

  const heroTerritory = {
    id: territory.id,
    name: territory.name,
    level: territory.level,
    summary: territory.summary ?? null,
    stats: typeof territory.stats === "object" && territory.stats !== null ? territory.stats as Record<string, any> : null,
    latitude: territory.latitude ?? null,
    longitude: territory.longitude ?? null,
    parent_id: territory.parent_id ?? null,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {resolvedId && (
          <PiContextSetter contextType="territory" contextId={resolvedId} />
        )}

        <TerritoryPortalHero
          territory={heroTerritory}
          ancestors={ancestors}
          memberCount={memberCount}
          questCount={stats?.quests ?? 0}
          guildCount={stats?.guilds ?? 0}
          naturalSystemCount={naturalSystemCount}
          stewards={stewards}
          isPioneerTerritory={isPioneerTerritory}
          onUnlock={() => {
            if (!isAuthenticated) {
              navigate("/signup?reason=pioneer&territory=" + (territory.slug ?? territory.id));
              return;
            }
            setUnlockOpen(true);
          }}
          onBack={() => {
            if (!isAuthenticated) {
              navigate("/territories");
            } else {
              window.history.length > 1 ? navigate(-1) : navigate("/territories");
            }
          }}
        />

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className={cn("w-full justify-start overflow-x-auto", "scrollbar-none")}>
            <TabsTrigger value="portal" className="gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Portal
            </TabsTrigger>
            <TabsTrigger value="ecosystem" className="gap-1.5">
              <Compass className="h-3.5 w-3.5" /> Ecosystem
            </TabsTrigger>
            <TabsTrigger value="quests" className="gap-1.5">
              <Swords className="h-3.5 w-3.5" /> Quests
            </TabsTrigger>
            <TabsTrigger value="living" className="gap-1.5">
              <Leaf className="h-3.5 w-3.5" /> Living
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Library
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Intelligence
            </TabsTrigger>
            <TabsTrigger value="contribute" className="gap-1.5">
              <MessageSquarePlus className="h-3.5 w-3.5" /> Contribute
            </TabsTrigger>
            <TabsTrigger value="graph" className="gap-1.5">
              <Network className="h-3.5 w-3.5" /> Graph
            </TabsTrigger>
            {canAdmin && (
              <TabsTrigger value="admin" className="gap-1.5 ml-auto">
                <Settings className="h-3.5 w-3.5" /> Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="portal" className="mt-6 space-y-8">
            {territory.level === "BIOREGION" && (
              <BioregionMembersSection bioregionId={resolvedId!} />
            )}
            <TerritoryGuestPortal
              territory={heroTerritory}
              memberCount={memberCount}
              questCount={stats?.quests ?? 0}
              guildCount={stats?.guilds ?? 0}
              naturalSystemCount={naturalSystemCount}
              isAuthenticated={isAuthenticated}
              isAlreadyMember={isAlreadyMember}
            />
            {/* AI Synthesis on Portal tab */}
            <TerritorySynthesis
              territoryId={resolvedId!}
              territoryName={territory.name}
              isMember={isAlreadyMember}
            />
          </TabsContent>

          <TabsContent value="ecosystem" className="mt-6">
            <TerritoryEcosystemTab territoryId={resolvedId!} />
          </TabsContent>

          <TabsContent value="quests" className="mt-6">
            <TerritoryQuestGrid
              territoryId={resolvedId!}
              territoryName={territory.name}
              canCreateQuest={canCreateQuest}
            />
          </TabsContent>

          <TabsContent value="living" className="mt-6">
            <TerritoryLivingDashboard territoryId={resolvedId!} territoryName={territory.name} />
          </TabsContent>

          <TabsContent value="library" className="mt-6">
            <TerritoryLibraryTab territoryId={resolvedId!} territoryName={territory.name} userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="intelligence" className="mt-6">
            <TerritoryMemoryTab territoryId={resolvedId!} territoryName={territory.name} isMember={isAlreadyMember} />
          </TabsContent>

          <TabsContent value="contribute" className="mt-6">
            <TerritoryChatTab territoryId={resolvedId!} territoryName={territory.name} userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="graph" className="mt-6 -mx-3 sm:-mx-4">
            <GraphView centerType="territory" centerId={resolvedId!} height={700} />
          </TabsContent>

          {canAdmin && (
            <TabsContent value="admin" className="mt-6">
              <TerritoryAdminPanel
                territoryId={resolvedId!}
                territoryName={territory.name}
                currentUserXpLevel={xpLevel}
                currentUserCtgBalance={ctgBalance}
                isSuperAdmin={adminStatus?.isSuperAdmin}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {isAuthenticated && (
        <TerritoryUnlockModal
          open={unlockOpen}
          onClose={() => setUnlockOpen(false)}
          territory={{
            id: resolvedId!,
            name: territory.name,
            level: territory.level,
            slug: territory.slug,
          }}
          currentUserXpLevel={xpLevel}
          currentUserId={currentUser.id}
        />
      )}
    </div>
  );
}
