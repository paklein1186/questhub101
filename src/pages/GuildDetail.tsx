import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { autoFollowEntity } from "@/hooks/useFollow";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import {
  Shield, Users, Compass, ArrowLeft, Heart, Briefcase, Star, Handshake,
  CircleDot, MapPin, Hash, CheckCircle, AlertCircle, Plus, Clock, Euro, Video,
  UserMinus, Settings, LayoutGrid, FileText, CalendarDays, Bot, Sparkles, Brain,
  MoreHorizontal, Pencil, Trash2, Vote, MessageCircle, ListChecks, Coins, Wallet, Calendar,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { EntityQuestsFilters } from "@/components/EntityQuestsFilters";
import { ImageUpload } from "@/components/ImageUpload";
import { CommentThread } from "@/components/CommentThread";
import { XpSpendDialog } from "@/components/XpSpendDialog";
import { PlanLimitBadge } from "@/components/PlanLimitBadge";
import { usePlanLimits, EXTRA_QUEST_CREDIT_COST, EXTRA_GUILD_CREDIT_COST } from "@/hooks/usePlanLimits";
import { CommentTargetType, FollowTargetType, GuildJoinPolicy, OnlineLocationType, ReportTargetType } from "@/types/enums";
import { ReportButton } from "@/components/ReportButton";
import { DraftBanner } from "@/components/DraftBanner";
import { useFollow } from "@/hooks/useFollow";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGuildById, useGuildMembersWithProfiles, useServicesForGuild, useQuestsForGuild, useAchievementsForQuests, usePublicProfile } from "@/hooks/useEntityQueries";
import { formatDistanceToNow } from "date-fns";
import { SocialLinksDisplay } from "@/components/SocialLinks";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { EntityJoinButton } from "@/components/EntityJoinButton";
import { EntityFollowersCount } from "@/components/FollowersDialog";
import { GuildKanbanBoard } from "@/components/guild/GuildKanbanBoard";
import { GuildDocsSpace } from "@/components/guild/GuildDocsSpace";
import { GuildEvents } from "@/components/guild/GuildEvents";
import { UnitChat } from "@/components/UnitChat";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { FacilitatorPanel } from "@/components/FacilitatorPanel";
import { MemoryEnginePanel } from "@/components/MemoryEnginePanel";
// FeedSection removed — Agora content merged into Discussions #General room
import { GuildDiscussionTab } from "@/components/guild/GuildDiscussionTab";
import { ServicesList } from "@/components/ServicesList";
import { GuildDecisions } from "@/components/guild/GuildDecisions";
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { computeLevelFromXp } from "@/lib/xpCreditsConfig";
import { PartnershipsTab } from "@/components/partnership/PartnershipsTab";
import { PartnersBlock } from "@/components/partnership/PartnersBlock";
import { PublicExploreCTA } from "@/components/PublicExploreCTA";
import { GuestOnboardingAssistant } from "@/components/GuestOnboardingAssistant";
import { InviteLinkButton } from "@/components/InviteLinkButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { GiveTrustButton } from "@/components/GiveTrustButton";
import { TrustNodeType } from "@/types/enums";
import { TopTrustedMembers } from "@/components/trust/TopTrustedMembers";
import { EntityApplicationsTab } from "@/components/EntityApplicationsTab";
import { useEntityRoles } from "@/hooks/useEntityRoles";
import { SortableTabsList, type TabDefinition } from "@/components/SortableTabsList";
import { HighlightedPostsTiles } from "@/components/guild/HighlightedPostsTiles";
import { UnitAgentsTab } from "@/components/UnitAgentsTab";
import { SendOfficialMessageDialog } from "@/components/SendOfficialMessageDialog";
import { BroadcastMessageDialog } from "@/components/BroadcastMessageDialog";
import { GuildRitualsTab } from "@/components/guild/GuildRitualsTab";
import { TrustTab } from "@/components/trust/TrustTab";
import { GraphView } from "@/components/graph/GraphView";

/** Extracted tabs bar with admin-reorderable tabs — order stored in guild features_config */
function GuildTabsBar({ allTabs, defaultOrder, isAdmin, guildId, featuresConfig }: {
  allTabs: TabDefinition[]; defaultOrder: string[];
  isAdmin: boolean; guildId: string; featuresConfig: any;
}) {
  const qc = useQueryClient();
  const savedOrder: string[] = featuresConfig?.tabOrder || [];

  // Merge saved order with defaults
  const orderedTabs = useMemo(() => {
    if (!savedOrder.length) return defaultOrder;
    const valid = savedOrder.filter((t: string) => defaultOrder.includes(t));
    const remaining = defaultOrder.filter((t) => !valid.includes(t));
    return [...valid, ...remaining];
  }, [savedOrder, defaultOrder]);

  const saveOrder = async (newOrder: string[]) => {
    const updated = { ...featuresConfig, tabOrder: newOrder };
    await supabase.from("guilds").update({ features_config: updated }).eq("id", guildId);
    qc.invalidateQueries({ queryKey: ["guild", guildId] });
  };

  const resetOrder = async () => {
    const { tabOrder, ...rest } = featuresConfig || {};
    await supabase.from("guilds").update({ features_config: rest }).eq("id", guildId);
    qc.invalidateQueries({ queryKey: ["guild", guildId] });
  };

  if (isAdmin) {
    return (
      <div className="group/tabs flex items-center gap-1">
        <SortableTabsList
          tabs={allTabs}
          orderedKeys={orderedTabs}
          onReorder={saveOrder}
          onReset={resetOrder}
          isCustomized={savedOrder.length > 0}
        />
      </div>
    );
  }

  const sorted = allTabs
    .filter((t) => t.visible !== false)
    .sort((a, b) => {
      const ai = orderedTabs.indexOf(a.value);
      const bi = orderedTabs.indexOf(b.value);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  return (
    <TabsList>
      {sorted.map((t) => (
        <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
      ))}
    </TabsList>
  );
}

/** Clustered subtabs: Discussions, Docs, Decisions, Rituals */
function HumanInteractionsCluster({ guild, fc, isAdmin, isMember, currentUser, currentMembership, members, territories, topics }: {
  guild: any; fc: any; isAdmin: boolean; isMember: boolean; currentUser: any; currentMembership: any; members: any[]; territories: any[]; topics: any[];
}) {
  const [sub, setSub] = useState("discussions");
  return (
    <Tabs value={sub} onValueChange={setSub}>
      <TabsList>
        <TabsTrigger value="discussions"><MessageCircle className="h-3.5 w-3.5 mr-1" />Discussions</TabsTrigger>
        <TabsTrigger value="docs"><FileText className="h-3.5 w-3.5 mr-1" />Docs</TabsTrigger>
        <TabsTrigger value="decisions"><Vote className="h-3.5 w-3.5 mr-1" />Decisions</TabsTrigger>
        <TabsTrigger value="rituals"><Calendar className="h-3.5 w-3.5 mr-1" />Rituals</TabsTrigger>
      </TabsList>
      <TabsContent value="discussions" className="mt-4">
        {(fc as any).discussionTab ? (
          <GuildDiscussionTab
            guildId={guild.id}
            guildName={guild.name}
            isAdmin={isAdmin}
            isMember={isMember}
            canPost={isAdmin || (isMember && (fc as any).discussionPostPermission !== "ADMIN")}
            initialTerritoryIds={territories.map((t: any) => t.id)}
            initialTopicIds={topics.map((t: any) => t.id)}
          />
        ) : (
          <p className="text-muted-foreground">Discussions are disabled for this guild.</p>
        )}
      </TabsContent>
      <TabsContent value="docs" className="mt-4">
        {(fc as any).docsSpace ? (
          <GuildDocsSpace guildId={guild.id} isMember={isMember} isAdmin={isAdmin} />
        ) : (
          <p className="text-muted-foreground">Docs space is disabled for this guild.</p>
        )}
      </TabsContent>
      <TabsContent value="decisions" className="mt-4">
        {isMember ? (
          <GuildDecisions
            guildId={guild.id}
            isAdmin={isAdmin}
            isMember={isMember}
            currentUserId={currentUser.id}
            memberCount={members.length}
            currentUserRole={currentMembership?.role}
            featuresConfig={fc}
          />
        ) : (
          <p className="text-muted-foreground">Join the guild to participate in decisions.</p>
        )}
      </TabsContent>
      <TabsContent value="rituals" className="mt-4">
        {(fc as any).rituals ? (
          <GuildRitualsTab guildId={guild.id} isAdmin={isAdmin} isMember={isMember} />
        ) : (
          <p className="text-muted-foreground">Rituals are disabled for this guild.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}

/** Clustered subtabs: Chat & AI, Matchmaker, Facilitator, Memory, Agents */
function AIGuidanceCluster({ guild, isAdmin, isMember }: {
  guild: any; isAdmin: boolean; isMember: boolean;
}) {
  const [sub, setSub] = useState("ai-chat");
  return (
    <Tabs value={sub} onValueChange={setSub}>
      <TabsList>
        <TabsTrigger value="ai-chat"><Bot className="h-3.5 w-3.5 mr-1" />Chat & AI</TabsTrigger>
        {isAdmin && <TabsTrigger value="matchmaker"><Sparkles className="h-3.5 w-3.5 mr-1" />Matchmaker</TabsTrigger>}
        <TabsTrigger value="facilitator"><Sparkles className="h-3.5 w-3.5 mr-1" />Facilitator</TabsTrigger>
        <TabsTrigger value="memory"><Brain className="h-3.5 w-3.5 mr-1" />Memory</TabsTrigger>
        <TabsTrigger value="agents"><Bot className="h-3.5 w-3.5 mr-1" />Agents</TabsTrigger>
      </TabsList>
      <TabsContent value="ai-chat" className="mt-4">
        <UnitChat entityType="GUILD" entityId={guild.id} entityName={guild.name} />
      </TabsContent>
      {isAdmin && (
        <TabsContent value="matchmaker" className="mt-4">
          <MatchmakerPanel matchType="guild" guildId={guild.id} />
        </TabsContent>
      )}
      <TabsContent value="facilitator" className="mt-4">
        <FacilitatorPanel entityType="GUILD" entityId={guild.id} entityName={guild.name} isAdmin={isAdmin} />
      </TabsContent>
      <TabsContent value="memory" className="mt-4">
        <MemoryEnginePanel entityType="GUILD" entityId={guild.id} entityName={guild.name} />
      </TabsContent>
      <TabsContent value="agents" className="mt-4">
        <UnitAgentsTab unitType="guild" unitId={guild.id} unitName={guild.name} isAdmin={isAdmin} />
      </TabsContent>
    </Tabs>
  );
}

export default function GuildDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: guild, isLoading } = useGuildById(id);
  const { data: membersData } = useGuildMembersWithProfiles(id);
  const memberUserIds = useMemo(() => (membersData || []).map((m: any) => m.user_id), [membersData]);
  const { data: membersCreditSum = 0 } = useQuery({
    queryKey: ["guild-members-credits", id, memberUserIds],
    enabled: memberUserIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("credits_balance")
        .in("user_id", memberUserIds);
      return (data || []).reduce((sum: number, p: any) => sum + (p.credits_balance ?? 0), 0);
    },
  });
  const _fc = typeof guild?.features_config === "object" && guild?.features_config ? guild.features_config : {};
  const showMemberServices = (_fc as any).showMemberServices !== false;
  const { data: guildServices } = useServicesForGuild(id, showMemberServices);
  const { data: guildQuests } = useQuestsForGuild(id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.GUILD, id!);
  const { data: creator } = usePublicProfile(guild?.created_by_user_id);
  const { getRolesForUser, roles: entityRoles } = useEntityRoles("guild", id);

  const limits = usePlanLimits();
  
  const [showGuildXpDialog, setShowGuildXpDialog] = useState(false);
  const [guildSp, setGuildSp] = useSearchParams();
  const legacyTabMap: Record<string, string> = { discussion: "human-interactions", docs: "human-interactions", decisions: "human-interactions", rituals: "human-interactions", "ai-chat": "ai-guidance", matchmaker: "ai-guidance", facilitator: "ai-guidance", memory: "ai-guidance", agents: "ai-guidance", board: "overview" };
  const rawTab = guildSp.get("tab") || "overview";
  const activeTab = legacyTabMap[rawTab] || rawTab;
  const setActiveTab = (v: string) => setGuildSp(prev => {
    const next = new URLSearchParams(prev);
    if (v === "overview") next.delete("tab"); else next.set("tab", v);
    return next;
  }, { replace: true });
  const [editSvcId, setEditSvcId] = useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState("");

  // Service creation
  const [createSvcOpen, setCreateSvcOpen] = useState(false);
  const [svcTitle, setSvcTitle] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcDuration, setSvcDuration] = useState("60");
  const [svcPrice, setSvcPrice] = useState("0");
  const [svcLocationType, setSvcLocationType] = useState<OnlineLocationType>(OnlineLocationType.JITSI);
  const [svcImageUrl, setSvcImageUrl] = useState<string | undefined>();
  const [svcDraft, setSvcDraft] = useState(false);

  // Achievement query based on quest IDs
  const questIds = (guildQuests || []).map((q: any) => q.id);
  const { data: guildAchievements } = useAchievementsForQuests(questIds);

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!guild) return <PageShell><p>Guild not found.</p></PageShell>;
  if (guild.is_deleted && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>This guild has been removed.</p></PageShell>;
  if (guild.is_draft && guild.created_by_user_id !== currentUser.id && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>Guild not found.</p></PageShell>;

  const topics = (guild.guild_topics || []).map((gt: any) => gt.topics).filter(Boolean);
  const territories = (guild.guild_territories || []).map((gt: any) => gt.territories).filter(Boolean);
  const members = membersData || [];
  const quests = guildQuests || [];
  const services = guildServices || [];
  const achievements = guildAchievements || [];

  const isLoggedIn = !!currentUser.id;
  const currentMembership = isLoggedIn ? (guild.guild_members || []).find((gm: any) => gm.user_id === currentUser.id) : undefined;
  const isAdmin = currentMembership?.role === "ADMIN";
  const isMember = !!currentMembership;

  const requireAuth = (action: string, callback?: () => void) => {
    if (!isLoggedIn) {
      setAuthPromptAction(action);
      setAuthPromptOpen(true);
      return;
    }
    callback?.();
  };

  // Feature flags
  const defaultFeatures = { kanbanBoard: true, docsSpace: true, events: true, applicationProcess: true, subtasks: true, discussionTab: true, discussionAccess: "members", discussionPostPermission: "MEMBER", rituals: true };
  const fc = typeof guild.features_config === "object" && guild.features_config ? { ...defaultFeatures, ...guild.features_config } : defaultFeatures;

  const doJoinGuild = async () => {
    const { error } = await supabase.from("guild_members").insert({ guild_id: guild.id, user_id: currentUser.id, role: "MEMBER" as any });
    if (error) { toast({ title: "Failed to join", variant: "destructive" }); return; }
    autoFollowEntity(currentUser.id, "GUILD", guild.id);
    qc.invalidateQueries({ queryKey: ["guild", id] });
    qc.invalidateQueries({ queryKey: ["guild-members-profiles", id] });
    toast({ title: "Joined guild!" });
  };

  const leaveGuild = async () => {
    await supabase.from("guild_members").delete().eq("guild_id", guild.id).eq("user_id", currentUser.id);
    qc.invalidateQueries({ queryKey: ["guild", id] });
    qc.invalidateQueries({ queryKey: ["guild-members-profiles", id] });
    toast({ title: "Left guild" });
  };


  const createGuildService = async () => {
    if (!svcTitle.trim()) return;
    const { error } = await supabase.from("services").insert({
      title: svcTitle.trim(), description: svcDesc.trim() || null,
      provider_guild_id: guild.id, duration_minutes: Number(svcDuration) || 60,
      price_amount: Number(svcPrice) || 0, price_currency: "EUR",
      online_location_type: svcLocationType, is_active: true, image_url: svcImageUrl || null,
      is_draft: svcDraft,
      owner_type: "GUILD", owner_id: guild.id,
    } as any);
    if (error) { toast({ title: "Failed to create service", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["services-for-guild", id] });
    setSvcTitle(""); setSvcDesc(""); setSvcDuration("60"); setSvcPrice("0");
    setSvcLocationType(OnlineLocationType.JITSI); setSvcImageUrl(undefined); setSvcDraft(false);
    setCreateSvcOpen(false);
    toast({ title: "Guild service created" });
  };

  const openEditGuildService = (svc: any) => {
    setEditSvcId(svc.id);
    setSvcTitle(svc.title);
    setSvcDesc(svc.description || "");
    setSvcDuration(String(svc.duration_minutes ?? 60));
    setSvcPrice(String(svc.price_amount ?? 0));
    setSvcLocationType(svc.online_location_type || OnlineLocationType.JITSI);
    setSvcImageUrl(svc.image_url || undefined);
    setSvcDraft(!!svc.is_draft);
    setCreateSvcOpen(true);
  };

  const updateGuildService = async () => {
    if (!editSvcId || !svcTitle.trim()) return;
    const { error } = await supabase.from("services").update({
      title: svcTitle.trim(), description: svcDesc.trim() || null,
      duration_minutes: Number(svcDuration) || 60,
      price_amount: Number(svcPrice) || 0,
      online_location_type: svcLocationType, image_url: svcImageUrl || null,
      is_draft: svcDraft,
    }).eq("id", editSvcId);
    if (error) { toast({ title: "Failed to update service", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["services-for-guild", id] });
    setSvcTitle(""); setSvcDesc(""); setSvcDuration("60"); setSvcPrice("0");
    setSvcLocationType(OnlineLocationType.JITSI); setSvcImageUrl(undefined); setSvcDraft(false);
    setEditSvcId(null); setCreateSvcOpen(false);
    toast({ title: "Guild service updated" });
  };

  return (
    <PageShell>
      
      <GuestOnboardingAssistant open={authPromptOpen} onOpenChange={setAuthPromptOpen} actionLabel={authPromptAction} />

      <XpSpendDialog open={showGuildXpDialog} onOpenChange={setShowGuildXpDialog} canAfford={limits.canAffordExtraGuild} xpCost={EXTRA_GUILD_CREDIT_COST} userXp={limits.userCredits} actionLabel="join one more guild" limitLabel="guild memberships for your plan" onConfirm={async () => { const ok = await limits.spendCredits(EXTRA_GUILD_CREDIT_COST, `Extra guild membership: ${guild.name}`, "GUILD", guild.id); if (ok) doJoinGuild(); }} />

      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {guild.is_draft && <DraftBanner />}

      {guild.banner_url && (
        <div className="w-full h-40 md:h-56 rounded-xl overflow-hidden mb-6">
          <img src={guild.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3">
          {guild.logo_url && <img src={guild.logo_url} className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl" alt="" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold truncate">{guild.name}</h1>
              {guild.is_approved ? <CheckCircle className="h-5 w-5 text-primary shrink-0" /> : isAdmin && <Badge variant="outline" className="text-xs shrink-0"><AlertCircle className="h-3 w-3 mr-1" /> Awaiting moderation</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Badge variant="secondary" className="capitalize">{(guild.type || "guild").toLowerCase()}</Badge>
              <span>Created by <Link to={`/users/${creator?.user_id}`} className="text-primary hover:underline">{creator?.name}</Link></span>
            </div>
            <p className="text-muted-foreground max-w-2xl mt-2 line-clamp-2">{guild.description}</p>
          </div>
          <div className="flex flex-row sm:flex-col gap-2 shrink-0 flex-wrap">
              <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={() => requireAuth("follow this guild", toggleFollow)}>
                <Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} /> {isFollowing ? "Unfollow" : "Follow"}
              </Button>
              {!isMember && (
                isLoggedIn ? (
                  <div className="flex flex-col gap-1 items-end">
                    <EntityJoinButton entityType="guild" entityId={guild.id} entityName={guild.name} joinPolicy={guild.join_policy || "OPEN"} applicationQuestions={(guild.application_questions as string[]) || []} currentUserId={currentUser.id} currentUserName={currentUser.name} onJoined={() => { qc.invalidateQueries({ queryKey: ["guild", id] }); qc.invalidateQueries({ queryKey: ["guild-members-profiles", id] }); }} />
                    <PlanLimitBadge limitReached={limits.guildLimitReached} xpCost={EXTRA_GUILD_CREDIT_COST} itemLabel="guild slot" compact />
                  </div>
                ) : (
                  <Button size="sm" onClick={() => requireAuth("join this guild")}>
                    <Users className="h-4 w-4 mr-1" /> Join
                  </Button>
                )
              )}
              {isMember && !isAdmin && <Button size="sm" variant="ghost" onClick={leaveGuild}><UserMinus className="h-4 w-4 mr-1" /> Leave</Button>}
              {isAdmin && <Button size="sm" variant="outline" asChild><Link to={`/guilds/${guild.id}/settings`}><Settings className="h-4 w-4 mr-1" /> Settings</Link></Button>}
              {isAdmin && <InviteLinkButton entityType="guild" entityId={guild.id} entityName={guild.name} />}
              <ShareLinkButton entityType="guild" entityId={guild.id} entityName={guild.name} />
              {isLoggedIn && <GiveTrustButton targetNodeType={TrustNodeType.GUILD} targetNodeId={guild.id} targetName={guild.name} contextGuildId={guild.id} />}
              {isLoggedIn && <ReportButton targetType={ReportTargetType.GUILD} targetId={guild.id} />}
            </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topics.map((t: any) => <Link key={t.id} to={`/topics/${t.slug}`}><Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge></Link>)}
          {territories.map((t: any) => <Badge key={t.id} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
        </div>
        <div className="mt-3">
          <SocialLinksDisplay data={{ websiteUrl: guild.website_url, twitterUrl: guild.twitter_url, linkedinUrl: guild.linkedin_url, instagramUrl: guild.instagram_url }} />
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {(() => {
          const allTabs: TabDefinition[] = [
            { value: "overview", label: <><Shield className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Overview</span></> },
            { value: "members", label: <><Users className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Members</span> ({members.length})</> },
            { value: "quests", label: <><Compass className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Quests</span> ({quests.length})</> },
            { value: "human-interactions", label: <><MessageCircle className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Human Interactions</span></>, visible: isMember || ((fc as any).discussionTab && (fc as any).discussionAccess === "public") },
            { value: "services", label: <><Briefcase className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Services</span> ({services.length})</> },
            { value: "events", label: <><CalendarDays className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Events</span></>, visible: !!(fc as any).events },
            { value: "ai-guidance", label: <><Sparkles className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">AI Guidance</span></>, visible: isMember },
            { value: "achievements", label: <><Star className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Achievements</span></>, visible: achievements.length > 0 },
            { value: "partnerships", label: <><Handshake className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Partnerships</span></> },
            { value: "trust", label: <><Shield className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Trust</span></> },
            { value: "graph", label: <><Compass className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Graph</span></> },
          ];
          const defaultOrder = allTabs.map((t) => t.value);
          return <GuildTabsBar allTabs={allTabs} defaultOrder={defaultOrder} isAdmin={isAdmin} guildId={guild.id} featuresConfig={fc} />;
        })()}

        <TabsContent value="overview" className="mt-6 space-y-6">
          {guild.description && (
            <div>
              <h3 className="font-display font-semibold mb-2">About</h3>
              <div className="rounded-xl border border-border bg-card/50 p-4">
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{guild.description}</p>
              </div>
            </div>
          )}

          {/* Unit details */}
          <div>
            <h3 className="font-display font-semibold mb-2">Details</h3>
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Membership policy</span>
                <Badge variant={guild.join_policy === "OPEN" ? "default" : guild.join_policy === "INVITE_ONLY" ? "destructive" : "secondary"} className="capitalize text-xs">
                  {(guild.join_policy || "OPEN").replace(/_/g, " ").toLowerCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline" className="capitalize text-xs">{(guild.type || "guild").toLowerCase()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Founder</span>
                {creator ? (
                  <Link to={`/users/${creator.user_id}`} className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors">
                    <Avatar className="h-5 w-5"><AvatarImage src={creator.avatar_url ?? undefined} /><AvatarFallback className="text-[10px]">{creator.name?.[0]}</AvatarFallback></Avatar>
                    {creator.name}
                  </Link>
                ) : <span className="text-sm text-muted-foreground">—</span>}
              </div>
              {(() => {
                const admins = members.filter((m: any) => m.role === "ADMIN");
                if (admins.length === 0) return null;
                return (
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1.5">Admins</span>
                    <div className="flex flex-wrap gap-2">
                      {admins.map((m: any) => (
                        <Link key={m.id} to={`/users/${m.user_id}`} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:border-primary/30 transition-colors">
                          <Avatar className="h-4 w-4"><AvatarImage src={m.user?.avatar_url} /><AvatarFallback className="text-[8px]">{m.user?.name?.[0]}</AvatarFallback></Avatar>
                          {m.user?.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{guild.created_at && !isNaN(new Date(guild.created_at).getTime()) ? formatDistanceToNow(new Date(guild.created_at), { addSuffix: true }) : "—"}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <EntityFollowersCount entityId={guild.id} entityType="GUILD" />
            <button onClick={() => setActiveTab("members")} className="rounded-lg border border-border bg-card p-4 text-center hover:border-primary/30 transition-all cursor-pointer"><p className="text-2xl font-bold text-primary">{members.length}</p><p className="text-sm text-muted-foreground">Members</p></button>
            <button onClick={() => setActiveTab("quests")} className="rounded-lg border border-border bg-card p-4 text-center hover:border-primary/30 transition-all cursor-pointer"><p className="text-2xl font-bold text-primary">{quests.length}</p><p className="text-sm text-muted-foreground">Quests</p></button>
            <button onClick={() => setActiveTab("services")} className="rounded-lg border border-border bg-card p-4 text-center hover:border-primary/30 transition-all cursor-pointer"><p className="text-2xl font-bold text-primary">{services.length}</p><p className="text-sm text-muted-foreground">Services</p></button>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1"><Wallet className="h-5 w-5" />{guild.credits_balance ?? 0}</p>
              <p className="text-sm text-muted-foreground">Guild Wallet</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground flex items-center justify-center gap-1"><Coins className="h-5 w-5" />{membersCreditSum}</p>
              <p className="text-sm text-muted-foreground">Members' Credits</p>
            </div>
          </div>

          {/* Highlighted posts from Discussion/Posts tab */}
          <HighlightedPostsTiles guildId={guild.id} onViewAll={() => setActiveTab("discussion")} />
          <PartnersBlock entityType="GUILD" entityId={guild.id} />
        </TabsContent>

        <TabsContent value="partnerships" className="mt-6">
          <PartnershipsTab entityType="GUILD" entityId={guild.id} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="trust" className="mt-6">
          <TrustTab nodeType={TrustNodeType.GUILD} nodeId={guild.id} />
        </TabsContent>

        <TabsContent value="graph" className="mt-6">
          <GraphView centerType="guild" centerId={guild.id} />
        </TabsContent>


        <TabsContent value="members" className="mt-6 space-y-4">
          <TopTrustedMembers
            memberIds={memberUserIds}
            relevantTags={(guild.guild_topics || []).map((gt: any) => gt.topics?.name).filter(Boolean)}
          />
          {isAdmin && (
            <>
              <EntityApplicationsTab entityType="guild" entityId={guild.id} currentUserId={currentUser.id} />
              <div className="flex justify-end">
                <BroadcastMessageDialog
                  recipientIds={members.filter((m: any) => m.user_id !== currentUser.id).map((m: any) => m.user_id)}
                  recipientCount={members.filter((m: any) => m.user_id !== currentUser.id).length}
                  guildId={guild.id}
                  guildName={guild.name}
                />
              </div>
            </>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((m: any) => {
              const userRoles = getRolesForUser(m.user_id);
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                  <Link to={`/users/${m.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10"><AvatarImage src={m.user?.avatar_url} /><AvatarFallback>{m.user?.name?.[0]}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.user?.name}</p>
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        <span className="text-xs text-muted-foreground capitalize">{(m.role || "member").toLowerCase()}</span>
                        {userRoles.map((r) => (
                          <Badge key={r.id} variant="secondary" className="text-[10px] px-1.5 py-0" style={{ backgroundColor: r.color + "22", color: r.color, borderColor: r.color + "44" }}>
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {(m.user?.xp ?? 0) > 0 && (
                      <XpLevelBadge level={computeLevelFromXp(m.user?.xp ?? 0)} xp={m.user?.xp} compact />
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">Joined {m.joined_at && !isNaN(new Date(m.joined_at).getTime()) ? formatDistanceToNow(new Date(m.joined_at), { addSuffix: true }) : "recently"}</span>
                  </Link>
                  {isAdmin && m.user_id !== currentUser.id && (
                    <SendOfficialMessageDialog
                      recipientUserId={m.user_id}
                      recipientName={m.user?.name || "User"}
                      senderType="guild"
                      guildId={guild.id}
                      guildName={guild.name}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="quests" className="mt-6 space-y-3">
          {isMember && (
            <div className="flex items-center gap-3 mb-3">
              <Button size="sm" asChild>
                <Link to={`/guilds/${guild.id}/quests/new`}><Plus className="h-4 w-4 mr-1" /> Create Quest for this Guild</Link>
              </Button>
              <PlanLimitBadge freeRemaining={limits.freeQuestsRemaining} limitReached={limits.questLimitReached} xpCost={EXTRA_QUEST_CREDIT_COST} itemLabel="quest" />
            </div>
          )}
          <EntityQuestsFilters quests={quests}>
            {(filtered, viewMode) => (
              <>
                {filtered.length === 0 && <p className="text-muted-foreground">No quests match filters.</p>}
                <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                  {filtered.map((q: any) => (
                    <Link key={q.id} to={`/quests/${q.id}`} className="block rounded-lg border border-border bg-card hover:border-primary/30 transition-all overflow-hidden">
                      {q.cover_image_url && <div className={viewMode === "grid" ? "h-28 w-full" : "h-32 w-full"}><img src={q.cover_image_url} alt="" className="w-full h-full object-cover" /></div>}
                      <div className="p-4">
                        <div className="flex items-center justify-between"><h4 className="font-display font-semibold truncate">{q.title}</h4><Badge className="bg-primary/10 text-primary border-0 shrink-0">{q.reward_xp} XP</Badge></div>
                        {viewMode === "list" && <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{q.description}</p>}
                        <div className="flex items-center gap-2 mt-2"><Badge variant="outline" className="capitalize text-xs">{(q.status || "open").toLowerCase().replace("_", " ")}</Badge>{q.monetization_type && <Badge variant="secondary" className="capitalize text-xs">{q.monetization_type.toLowerCase()}</Badge>}{(q as any)._subtasks && (q as any)._subtasks.total > 0 && <Badge variant="secondary" className="text-[10px] gap-0.5"><ListChecks className="h-3 w-3" />{(q as any)._subtasks.done}/{(q as any)._subtasks.total}</Badge>}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </EntityQuestsFilters>
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="mt-6 space-y-3">
          {isMember && (
            <Dialog open={createSvcOpen} onOpenChange={setCreateSvcOpen}>
              <DialogTrigger asChild><Button size="sm" className="mb-3"><Plus className="h-4 w-4 mr-1" /> Create Service</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editSvcId ? "Edit Service" : "Create Guild Service"}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={svcTitle} onChange={e => setSvcTitle(e.target.value)} placeholder="e.g. Coaching Session" maxLength={120} /></div>
                  <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={svcDesc} onChange={e => setSvcDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
                  <ImageUpload label="Image (optional)" currentImageUrl={svcImageUrl} onChange={setSvcImageUrl} aspectRatio="16/9" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium mb-1 block">Duration (min)</label><Input type="number" value={svcDuration} onChange={e => setSvcDuration(e.target.value)} min={15} max={480} /></div>
                    <div><label className="text-sm font-medium mb-1 block">Price (€)</label><Input type="number" value={svcPrice} onChange={e => setSvcPrice(e.target.value)} min={0} step={5} /></div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Location type</label>
                    <Select value={svcLocationType} onValueChange={v => setSvcLocationType(v as OnlineLocationType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={OnlineLocationType.JITSI}>Jitsi</SelectItem>
                        <SelectItem value={OnlineLocationType.ZOOM}>Zoom</SelectItem>
                        <SelectItem value={OnlineLocationType.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between"><label className="text-sm font-medium">Save as draft</label><Switch checked={svcDraft} onCheckedChange={setSvcDraft} /></div>
                  <Button onClick={editSvcId ? updateGuildService : createGuildService} disabled={!svcTitle.trim()} className="w-full">{editSvcId ? "Update" : "Create"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <ServicesList services={services} isAdmin={isAdmin} onToggleActive={async (svc: any) => {
            const { error } = await supabase.from("services").update({ is_active: !svc.is_active }).eq("id", svc.id);
            if (!error) { qc.invalidateQueries({ queryKey: ["services-for-guild", id] }); toast({ title: svc.is_active ? "Service paused" : "Service resumed" }); }
          }} onDelete={async (svc: any) => {
            const { error } = await supabase.from("services").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", svc.id);
            if (!error) { qc.invalidateQueries({ queryKey: ["services-for-guild", id] }); toast({ title: "Service deleted" }); }
          }} />
        </TabsContent>

        {/* Human Interactions — clustered subtabs */}
        <TabsContent value="human-interactions" className="mt-6">
          <HumanInteractionsCluster
            guild={guild}
            fc={fc}
            isAdmin={isAdmin}
            isMember={isMember}
            currentUser={currentUser}
            currentMembership={currentMembership}
            members={members}
            territories={territories}
            topics={topics}
          />
        </TabsContent>

        {(fc as any).events && (
          <TabsContent value="events" className="mt-6">
            <GuildEvents guildId={guild.id} isMember={isMember} isAdmin={isAdmin} />
          </TabsContent>
        )}

        {/* AI Guidance — clustered subtabs */}
        {isMember && (
          <TabsContent value="ai-guidance" className="mt-6">
            <AIGuidanceCluster
              guild={guild}
              isAdmin={isAdmin}
              isMember={isMember}
            />
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}
