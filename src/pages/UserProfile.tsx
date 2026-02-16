import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Zap, MapPin, Hash, UserPlus, UserMinus,
  Briefcase, Shield, Compass, CircleDot, Pencil, Users, Ban, Coins,
  Plus, ExternalLink, Sparkles, Settings, Globe, Twitter, Linkedin, Instagram, Building2, Map as MapIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { ProfileWallSection } from "@/components/feed/ProfileWallSection";
import { CommentTargetType, FollowTargetType, ReportTargetType } from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ReportButton } from "@/components/ReportButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { useFollow } from "@/hooks/useFollow";
import { useBlock } from "@/hooks/useBlock";
import { useProfileData, type ProfileData } from "@/hooks/useProfileData";
import { AdminBadge } from "@/components/AdminBadge";
import { useUserRoles } from "@/lib/admin";
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { XP_LEVEL_THRESHOLDS, LEVEL_LABELS, computeLevelFromXp } from "@/lib/xpCreditsConfig";
import { getLabel, type PersonaType } from "@/lib/personaLabels";
import { Loader2 } from "lucide-react";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { EntityCreationWizard } from "@/components/EntityCreationWizard";
import { useOpenChatBubble } from "@/hooks/useOpenChatBubble";
import { MessageSquare } from "lucide-react";
import { ProfileQuestsTab } from "@/components/profile/ProfileQuestsTab";
import { ProfileTerritoriesTab } from "@/components/profile/ProfileTerritoriesTab";
import { FollowersDialog } from "@/components/FollowersDialog";
import { FollowedEntitiesDialog, useFollowedEntityCount } from "@/components/FollowedEntitiesDialog";
import { ProfileListDialog } from "@/components/ProfileListDialog";

// ─── Persona badge helper ──────────────────────────────────
const PERSONA_META: Record<string, { label: string; color: string }> = {
  IMPACT: { label: "Impact Maker", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  CREATIVE: { label: "Creative Soul", color: "bg-violet-500/10 text-violet-700 border-violet-500/30" },
  HYBRID: { label: "Hybrid Explorer", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
};

function PersonaBadge({ persona }: { persona: PersonaType }) {
  const meta = PERSONA_META[persona];
  if (!meta) return null;
  return (
    <Badge variant="outline" className={`text-xs ${meta.color}`}>
      <Sparkles className="h-3 w-3 mr-1" />
      {meta.label}
    </Badge>
  );
}

// ─── Unified XP Widget ─────────────────────────────────────
function XpWidget({ xp, xpRecent12m, level, userId }: { xp: number; xpRecent12m: number; level: number; userId: string }) {
  const current = XP_LEVEL_THRESHOLDS.find((t) => t.level === level);
  const next = XP_LEVEL_THRESHOLDS.find((t) => t.level === level + 1);
  const levelLabel = LEVEL_LABELS[level] || `Level ${level}`;
  const isMaxLevel = !next;
  const progress = next && current ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100 : 100;
  const remaining = next ? next.minXp - xp : 0;
  const nextLabel = next ? LEVEL_LABELS[next.level] || `Level ${next.level}` : null;

  // Fetch territory/country impact
  const { data: territoryStats } = useQuery({
    queryKey: ["user-territory-impact", userId],
    queryFn: async () => {
      const { data: ut } = await supabase
        .from("user_territories")
        .select("territory_id, territories(id, name, level)")
        .eq("user_id", userId);
      if (!ut?.length) return { territories: 0, countries: 0 };
      const territoryCount = ut.length;
      const countryCount = new Set(
        (ut as any[]).filter((r) => r.territories?.level === "NATIONAL").map((r) => r.territory_id)
      ).size;
      return { territories: territoryCount, countries: countryCount };
    },
    enabled: !!userId,
  });

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex items-center gap-3">
        <XpLevelBadge level={level} xp={xp} />

        {/* Progress toward next level */}
        {!isMaxLevel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                <Progress value={Math.min(progress, 100)} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{remaining} to {nextLabel}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{xp} XP total · {xpRecent12m} earned in the last 12 months</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isMaxLevel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] text-muted-foreground">Max level · {xp} XP</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{xpRecent12m} XP earned in the last 12 months</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Territory impact stats */}
      {territoryStats && (territoryStats.territories > 0 || territoryStats.countries > 0) && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {territoryStats.territories > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <MapIcon className="h-3 w-3" /> Active in {territoryStats.territories} territor{territoryStats.territories === 1 ? "y" : "ies"}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Cross-territory collaborations increase your impact multiplier.</p>
              </TooltipContent>
            </Tooltip>
          )}
          {territoryStats.countries > 0 && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" /> {territoryStats.countries} countr{territoryStats.countries === 1 ? "y" : "ies"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Social links row ──────────────────────────────────────
function SocialRow({ profile }: { profile: ProfileData }) {
  const links = [
    { url: profile.websiteUrl, icon: Globe, label: "Website" },
    { url: profile.linkedinUrl, icon: Linkedin, label: "LinkedIn" },
    { url: profile.twitterUrl, icon: Twitter, label: "Twitter" },
    { url: profile.instagramUrl, icon: Instagram, label: "Instagram" },
  ].filter((l) => l.url);
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      {links.map((l) => (
        <a key={l.label} href={l.url!} target="_blank" rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors">
          <l.icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

// ─── About section with read more ──────────────────────────
const BIO_CLAMP_LINES = 4;

function AboutSection({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = bio.length > 200;

  return (
    <section>
      <h2 className="font-display text-lg font-semibold mb-2">About</h2>
      <p
        className={cn(
          "text-sm text-foreground/80 leading-relaxed whitespace-pre-line",
          !expanded && isLong && "line-clamp-4"
        )}
      >
        {bio}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mt-1 font-medium"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </section>
  );
}

// ─── Territory display ─────────────────────────────────────
function TerritoryLine({ territories }: { territories: any[] }) {
  const liveIn = territories.filter((t) => t.attachmentType === "LIVE_IN");
  const workIn = territories.filter((t) => t.attachmentType === "WORK_IN");
  const careFor = territories.filter((t) => t.attachmentType === "CARE_FOR");

  const renderGroup = (label: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <span>
        {label}{" "}
        {items.map((t, i) => (
          <span key={t.territory?.id || i}>
            {i > 0 && ", "}
            <Link
              to={`/territories/${t.territory?.id}`}
              className="hover:underline text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {t.territory?.name}
            </Link>
          </span>
        ))}
      </span>
    );
  };

  const groups = [
    renderGroup("Lives in", liveIn),
    renderGroup("Works in", workIn),
    renderGroup("Cares for", careFor.slice(0, 2)),
  ].filter(Boolean);

  if (groups.length === 0) return null;
  const primaryTerritory = liveIn[0]?.territory || workIn[0]?.territory || careFor[0]?.territory;
  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
      <MapPin className="h-3 w-3 shrink-0" />
      {primaryTerritory ? (
        <Link to={`/territories/${primaryTerritory.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex" title={`View ${primaryTerritory.name} on map`}>
          <MapIcon className="h-3 w-3 shrink-0 text-primary hover:text-primary/80 cursor-pointer transition-colors" />
        </Link>
      ) : (
        <MapIcon className="h-3 w-3 shrink-0 text-primary/60" />
      )}
      {groups.map((g, i) => (
        <span key={i}>{i > 0 && " · "}{g}</span>
      ))}
    </p>
  );
}

// ─── Activity Summary ──────────────────────────────────────
function ActivitySummary({
  name, questsCreated, questsJoined, guilds, pods, companies, services, topics, territories, persona,
}: {
  name: string; questsCreated: any[]; questsJoined: any[]; guilds: any[]; pods: any[];
  companies: any[]; services: any[]; topics: any[]; territories: any[]; persona: PersonaType;
}) {
  const sentences: string[] = [];

  // Sentence 1: involvement overview
  const totalQuests = questsCreated.length + questsJoined.length;
  if (totalQuests > 0 || guilds.length > 0) {
    const parts: string[] = [];
    if (questsCreated.length > 0) parts.push(`${questsCreated.length} quest${questsCreated.length > 1 ? "s" : ""}`);
    if (guilds.length > 0) parts.push(`${guilds.length} guild${guilds.length > 1 ? "s" : ""}`);
    if (pods.length > 0) parts.push(`${pods.length} pod${pods.length > 1 ? "s" : ""}`);
    if (companies.length > 0) parts.push(`${companies.length} organization${companies.length > 1 ? "s" : ""}`);
    sentences.push(`${name} is actively involved in ${parts.join(", ")}.`);
  }

  // Sentence 2: services
  if (services.length > 0) {
    const sLabel = getLabel("service.label_plural", persona).toLowerCase();
    sentences.push(`They offer ${services.length} ${sLabel} to the community.`);
  }

  // Sentence 3: topics
  if (topics.length > 0) {
    const topicNames = topics.slice(0, 3).map((t: any) => t.name);
    const suffix = topics.length > 3 ? ` and ${topics.length - 3} more` : "";
    sentences.push(`Their interests span ${topicNames.join(", ")}${suffix}.`);
  }

  // Sentence 4: territories
  const liveIn = territories.filter((t: any) => t.attachmentType === "LIVE_IN");
  const workIn = territories.filter((t: any) => t.attachmentType === "WORK_IN");
  if (liveIn.length > 0 || workIn.length > 0) {
    const where = liveIn.length > 0
      ? liveIn[0].territory?.name
      : workIn[0].territory?.name;
    sentences.push(`They are rooted in the ${where} territory.`);
  }

  if (sentences.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-sm text-foreground/80 leading-relaxed">
        {sentences.join(" ")}
      </p>
    </section>
  );
}

// ─── Main component ────────────────────────────────────────
export default function UserProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const isOwnProfile = !!id && currentUser.id === id;

  const {
    profile, topics, territories, guilds, pods, companies,
    questsCreated, questsJoined, proposals, fundedQuests, services,
    isLoading, isError,
  } = useProfileData(id);

  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.USER, id!);
  const { isBlocked, toggle: toggleBlock } = useBlock(id!);
  const { isAdmin: viewerIsAdmin } = useUserRoles(currentUser.id);
  const { open: openChat, isPending: chatPending } = useOpenChatBubble();

  // Masked items — fetched for the profile user
  const { data: maskedItems = [] } = useQuery({
    queryKey: ["profile-masked-items", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_masked_items")
        .select("target_id, target_type")
        .eq("user_id", id!);
      return (data ?? []) as { target_id: string; target_type: string }[];
    },
    enabled: !!id,
  });

  const maskedSet = new Set(maskedItems.map((m) => `${m.target_type}:${m.target_id}`));
  const isMasked = (type: string, targetId: string) => !isOwnProfile && maskedSet.has(`${type}:${targetId}`);

  // Filter masked items from profile data (only for visitors, not own profile)
  const filteredGuilds = guilds.filter((g: any) => !isMasked("GUILD", g.guildId));
  const filteredPods = pods.filter((p: any) => !isMasked("POD", p.podId));
  const filteredCompanies = companies.filter((c: any) => !isMasked("COMPANY", c.companyId));
  const filteredQuestsCreated = questsCreated.filter((q: any) => !isMasked("QUEST", q.id));
  const filteredQuestsJoined = questsJoined.filter((qm: any) => !isMasked("QUEST", qm.quest?.id));
  const filteredServices = services.filter((s: any) => !isMasked("SERVICE", s.id));

  const { data: followersCount = 0 } = useQuery({
    queryKey: ["followers-count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("target_id", id!)
        .eq("target_type", "USER");
      return count ?? 0;
    },
    enabled: !!id,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following-count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", id!)
        .eq("target_type", "USER");
      return count ?? 0;
    },
    enabled: !!id,
  });

  // Fetch all custom roles assigned to this user across entities
  const { data: userCrossRoles = [] } = useQuery({
    queryKey: ["user-cross-entity-roles", id],
    queryFn: async () => {
      const { data: assignments, error: e1 } = await supabase
        .from("entity_member_roles")
        .select("entity_role_id")
        .eq("user_id", id!);
      if (e1 || !assignments?.length) return [];
      const roleIds = [...new Set((assignments as any[]).map((a: any) => a.entity_role_id))];
      const { data: roles, error: e2 } = await supabase
        .from("entity_roles")
        .select("id, name, color, entity_id, entity_type")
        .in("id", roleIds);
      if (e2 || !roles?.length) return [];
      const seen = new Map<string, { name: string; color: string | null; count: number }>();
      for (const r of roles as any[]) {
        const key = r.name.toLowerCase();
        if (seen.has(key)) seen.get(key)!.count++;
        else seen.set(key, { name: r.name, color: r.color, count: 1 });
      }
      return [...seen.values()];
    },
    enabled: !!id,
  });

  const [searchParamsTab, setSearchParamsTab] = useSearchParams();
  const tab = searchParamsTab.get("tab") || "overview";
  const setTab = (v: string) => setSearchParamsTab(prev => {
    const next = new URLSearchParams(prev);
    if (v === "overview") next.delete("tab"); else next.set("tab", v);
    return next;
  }, { replace: true });
  const [showCreateUnit, setShowCreateUnit] = useState(false);
  const [followDialogMode, setFollowDialogMode] = useState<"followers" | "following" | null>(null);
  const [followedEntityDialog, setFollowedEntityDialog] = useState<"GUILD" | "QUEST" | null>(null);
  const [listDialog, setListDialog] = useState<string | null>(null);
  const { data: followedGuildsCount = 0 } = useFollowedEntityCount(id, "GUILD");
  const { data: followedQuestsCount = 0 } = useFollowedEntityCount(id, "QUEST");

  if (isLoading) {
    return <PageShell><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageShell>;
  }
  if (!profile || isError) {
    return <PageShell><p className="text-center py-20 text-muted-foreground">User not found.</p></PageShell>;
  }

  const persona = profile.personaType;
  const canSeePrivate = isOwnProfile || viewerIsAdmin;
  const serviceLabel = getLabel("service.label_plural", persona);
  const totalEntities = filteredGuilds.length + filteredPods.length + filteredCompanies.length;

  return (
    <PageShell>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {/* ═══ Identity Banner ═══ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: avatar + identity */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarImage src={profile.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl">{profile.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-bold truncate">{profile.name}</h1>
                <AdminBadge userId={profile.userId} />
              </div>
              {profile.headline && (
                <p className="text-muted-foreground text-sm mt-0.5">{profile.headline}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <PersonaBadge persona={persona} />
                {canSeePrivate && (
                  <span className="flex items-center gap-1 text-xs font-medium">
                    <Coins className="h-3 w-3 text-primary" /> {profile.creditsBalance} Credits
                  </span>
                )}
              </div>
              <XpWidget xp={profile.xp} xpRecent12m={profile.xpRecent12m} level={profile.xpLevel} userId={profile.userId} />

              {/* Topics & Houses chips — universe-aware */}
              {(() => {
                const impactTopics = topics.filter((t: any) => (t.universe_type ?? "impact") === "impact");
                const creativeHouses = topics.filter((t: any) => (t.universe_type) === "creative");
                const showImpact = persona !== "CREATIVE" || impactTopics.length > 0;
                const showCreative = (persona === "CREATIVE" || persona === "HYBRID" || creativeHouses.length > 0);
                return (
                  <>
                    {showCreative && creativeHouses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {creativeHouses.slice(0, 4).map((t: any) => (
                          <Link key={t.id} to={`/explore?tab=houses&topics=${t.id}`}>
                            <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-secondary/80 bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" />{t.name}
                            </Badge>
                          </Link>
                        ))}
                        {creativeHouses.length > 4 && (
                          <Badge variant="outline" className="text-[10px]">+{creativeHouses.length - 4}</Badge>
                        )}
                      </div>
                    )}
                    {showImpact && impactTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {impactTopics.slice(0, 6).map((t: any) => (
                          <Link key={t.id} to={`/explore?tab=houses&topics=${t.id}`}>
                            <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-secondary/80">
                              <Hash className="h-2.5 w-2.5 mr-0.5" />{t.name}
                            </Badge>
                          </Link>
                        ))}
                        {impactTopics.length > 6 && (
                          <Badge variant="outline" className="text-[10px]">+{impactTopics.length - 6}</Badge>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="mt-2">
                <TerritoryLine territories={territories} />
              </div>
            </div>
          </div>

          {/* Right: actions + social */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <SocialRow profile={profile} />
            {isOwnProfile ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/me"><Pencil className="h-4 w-4 mr-1" /> Edit profile</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreateUnit(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add entity
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/me"><Settings className="h-4 w-4" /></Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={chatPending}
                  onClick={() => openChat({ id: profile.userId, name: profile.name, avatarUrl: profile.avatarUrl || undefined })}
                >
                  <MessageSquare className="h-4 w-4 mr-1" /> Message
                </Button>
                <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={toggleFollow}>
                  {isFollowing ? <><UserMinus className="h-4 w-4 mr-1" /> Unfollow</> : <><UserPlus className="h-4 w-4 mr-1" /> Follow</>}
                </Button>
                <Button size="sm" variant={isBlocked ? "destructive" : "outline"} onClick={toggleBlock}>
                  <Ban className="h-4 w-4 mr-1" /> {isBlocked ? "Unblock" : "Block"}
                </Button>
                <ShareLinkButton entityType="profile" entityId={profile.userId} entityName={profile.name} />
                <ReportButton targetType={ReportTargetType.USER} targetId={profile.userId} />
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══ Tab Navigation ═══ */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wall">Wall</TabsTrigger>
          <TabsTrigger value="quests">Quests</TabsTrigger>
          <TabsTrigger value="services">{serviceLabel}</TabsTrigger>
          <TabsTrigger value="territories"><Globe className="h-3.5 w-3.5 mr-1" /> Territories</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="matchmaker"><Sparkles className="h-3.5 w-3.5 mr-1" /> Matchmaker</TabsTrigger>}
        </TabsList>

        {/* ─── Overview ─── */}
        <TabsContent value="overview">
          <div className="space-y-8">
            {/* Bio */}
            {profile.bio && <AboutSection bio={profile.bio} />}

            {/* Activity summary */}
            <ActivitySummary
              name={profile.name.split(" ")[0]}
              questsCreated={filteredQuestsCreated}
              questsJoined={filteredQuestsJoined}
              guilds={filteredGuilds}
              pods={filteredPods}
              companies={filteredCompanies}
              services={filteredServices}
              topics={topics}
              territories={territories}
              persona={persona}
            />

            {/* Stat badges */}
            <div className="flex flex-wrap gap-3">
              <StatCard icon={UserPlus} label="Followers" count={followersCount} onClick={() => setFollowDialogMode("followers")} />
              <StatCard icon={Users} label="Following people" count={followingCount} onClick={() => setFollowDialogMode("following")} />
              <StatCard icon={Compass} label="Quests created" count={filteredQuestsCreated.length} onClick={() => setListDialog("quests-created")} />
              <StatCard icon={Compass} label="Quests joined" count={filteredQuestsJoined.length} onClick={() => setListDialog("quests-joined")} />
              <StatCard icon={Shield} label="Guilds" count={filteredGuilds.length} onClick={() => setListDialog("guilds")} />
              <StatCard icon={Shield} label="Guilds followed" count={followedGuildsCount} onClick={() => setFollowedEntityDialog("GUILD")} />
              <StatCard icon={Compass} label="Quests followed" count={followedQuestsCount} onClick={() => setFollowedEntityDialog("QUEST")} />
              <StatCard icon={CircleDot} label="Pods" count={filteredPods.length} onClick={() => setListDialog("pods")} />
              <StatCard icon={Building2} label="Organizations" count={filteredCompanies.length} onClick={() => setListDialog("companies")} />
              <StatCard icon={Briefcase} label={serviceLabel} count={filteredServices.length} onClick={() => setListDialog("services")} />
            </div>

            {/* Entities preview */}
            {totalEntities > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold">Entities ({totalEntities})</h3>
                  <Button size="sm" variant="ghost" onClick={() => setTab("entities")} className="text-xs">View all →</Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {filteredGuilds.slice(0, 2).map((gm: any) => (
                    <Link key={gm.id} to={`/guilds/${gm.guildId}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg">
                          <AvatarImage src={gm.guild?.logo_url} />
                          <AvatarFallback><Shield className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="font-display font-semibold text-sm truncate">{gm.guild?.name}</h4>
                          <p className="text-[10px] text-muted-foreground capitalize">{getLabel("guild.label_singular", persona)} · {gm.role?.toLowerCase()}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {filteredPods.slice(0, 2).map((pm: any) => (
                    <Link key={pm.id} to={`/pods/${pm.podId}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg">
                          <AvatarFallback><CircleDot className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="font-display font-semibold text-sm truncate">{pm.pod?.name}</h4>
                          <p className="text-[10px] text-muted-foreground capitalize">Pod · {pm.role?.toLowerCase()}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {filteredCompanies.slice(0, 2).map((cm: any) => (
                    <Link key={cm.id} to={`/companies/${cm.companyId}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg">
                          <AvatarImage src={cm.company?.logo_url} />
                          <AvatarFallback><Building2 className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="font-display font-semibold text-sm truncate">{cm.company?.name}</h4>
                          <p className="text-[10px] text-muted-foreground capitalize">Organization · {cm.role?.toLowerCase()}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}


            {/* Featured items */}
            {(filteredQuestsCreated.length > 0 || filteredServices.length > 0) && (
              <section>
                <h3 className="font-display font-semibold mb-3">Highlights</h3>
                <div className="grid gap-3 md:grid-cols-3">
              {filteredQuestsCreated.slice(0, 2).map((q: any) => (
                    <Link key={q.id} to={`/quests/${q.id}`} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                      <UnitCoverImage type="QUEST" imageUrl={q.cover_image_url} height="h-24" />
                      <div className="p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Quest</p>
                        <h4 className="font-display font-semibold truncate">{q.title}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize mt-1">{(q.status || "draft").toLowerCase().replace("_", " ")}</Badge>
                      </div>
                    </Link>
                  ))}
                  {filteredServices.slice(0, 2).map((s: any) => (
                    <Link key={s.id} to={`/services/${s.id}`} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                      {s.image_url && (
                        <div className="h-24 bg-muted">
                          <img src={s.image_url} alt={s.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{getLabel("service.label", persona)}</p>
                        <h4 className="font-display font-semibold truncate">{s.title}</h4>
                        {s.price_amount != null && (
                          <Badge variant="secondary" className="text-[10px] mt-1">{s.price_amount === 0 ? "Free" : `€${s.price_amount}`}</Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Own profile: continue where left off */}
            {isOwnProfile && (
              <section>
                <h3 className="font-display font-semibold mb-3">Continue where you left off</h3>
                <div className="space-y-2">
                  {questsCreated.filter((q: any) => q.is_draft).slice(0, 3).map((q: any) => (
                    <Link key={q.id} to={`/quests/${q.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                      <Badge variant="outline" className="text-[10px]">Draft</Badge>
                      <span className="text-sm font-medium truncate">{q.title}</span>
                    </Link>
                  ))}
                  {proposals.filter((p: any) => p.status === "PENDING").slice(0, 3).map((p: any) => (
                    <Link key={p.id} to={`/quests/${p.quest_id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                      <Badge variant="secondary" className="text-[10px]">Pending proposal</Badge>
                      <span className="text-sm truncate">{p.title} → {p.quests?.title}</span>
                    </Link>
                  ))}
                  {questsCreated.filter((q: any) => q.is_draft).length === 0 && proposals.filter((p: any) => p.status === "PENDING").length === 0 && (
                    <p className="text-sm text-muted-foreground">All caught up! 🎉</p>
                  )}
                </div>
              </section>
            )}

            {/* Persona empty states */}
            {topics.length === 0 && isOwnProfile && (
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Add Topics to help others understand your fields of action.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/me"><Hash className="h-4 w-4 mr-1" /> Add Topics</Link>
                </Button>
              </div>
            )}
            {territories.length === 0 && isOwnProfile && (
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Add Territories you care about to receive local quests & events.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/me"><MapPin className="h-4 w-4 mr-1" /> Add Territories</Link>
                </Button>
              </div>
            )}
            {persona === "UNSET" && isOwnProfile && (
              <div className="rounded-xl border border-dashed border-primary/30 p-4 text-center bg-primary/5">
                <p className="text-sm text-foreground mb-2">Tell us why you're here to personalize your space.</p>
                <Button size="sm" asChild>
                  <Link to="/onboarding"><Sparkles className="h-4 w-4 mr-1" /> Take the quiz</Link>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Quests ─── */}
        <TabsContent value="quests">
          <ProfileQuestsTab
            userId={id!}
            isOwnProfile={isOwnProfile}
            questsCreated={questsCreated}
            questsJoined={questsJoined}
            proposals={proposals}
            fundedQuests={fundedQuests}
            canSeePrivate={canSeePrivate}
          />
        </TabsContent>

        {/* ─── Services ─── */}
        <TabsContent value="services">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">{getLabel("service.my_label", persona)} ({services.length})</h3>
            {isOwnProfile && (
              <Button size="sm" asChild>
                <Link to="/services/new"><Plus className="h-4 w-4 mr-1" /> {getLabel("service.create_button", persona)}</Link>
              </Button>
            )}
          </div>
          <EntityGrid items={services} emptyMsg={isOwnProfile ? `Create your first ${getLabel("service.label", persona).toLowerCase()} to get started.` : `No ${serviceLabel.toLowerCase()} offered yet.`} renderItem={(svc: any) => (
            <Link key={svc.id} to={`/services/${svc.id}`} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all block">
              {svc.image_url ? (
                <div className="h-32 bg-muted">
                  <img src={svc.image_url} alt={svc.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-20 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <Briefcase className="h-8 w-8 text-primary/30" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <h4 className="font-display font-semibold truncate">{svc.title}</h4>
                  {svc.price_amount != null && (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0 ml-2">
                      {svc.price_amount === 0 ? "Free" : `€${svc.price_amount}`}
                    </Badge>
                  )}
                </div>
                {svc.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{svc.description}</p>}
              </div>
            </Link>
          )} />
        </TabsContent>

        {/* ─── Territories ─── */}
        <TabsContent value="territories">
          <ProfileTerritoriesTab userId={id!} territories={territories} />
        </TabsContent>

        {/* ─── Entities ─── */}
        <TabsContent value="entities">
          <div className="space-y-8">
            {/* Roles cloud */}
            {userCrossRoles.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-3">Roles</h3>
                <div className="flex flex-wrap gap-2">
                  {userCrossRoles.map((role) => (
                    <Badge
                      key={role.name}
                      variant="outline"
                      className="text-xs px-3 py-1 rounded-full"
                      style={role.color ? {
                        borderColor: role.color,
                        backgroundColor: `${role.color}15`,
                        color: role.color,
                      } : undefined}
                    >
                      {role.name}
                      {role.count > 1 && (
                        <span className="ml-1 opacity-60">×{role.count}</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">{getLabel("guild.label", persona)} ({guilds.length})</h3>
                {isOwnProfile && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/explore?tab=entities"><Compass className="h-4 w-4 mr-1" /> Explore</Link>
                  </Button>
                )}
              </div>
              <EntityGrid items={guilds} emptyMsg={`Not a member of any ${getLabel("guild.label", persona).toLowerCase()} yet.`} renderItem={(gm: any) => (
                <Link key={gm.id} to={`/guilds/${gm.guildId}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all block">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarImage src={gm.guild?.logo_url} />
                      <AvatarFallback><Shield className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold truncate">{gm.guild?.name}</h4>
                      <Badge variant="outline" className="text-[10px] capitalize mt-0.5">{gm.role?.toLowerCase()}</Badge>
                    </div>
                  </div>
                </Link>
              )} />
            </section>

            <section>
              <h3 className="font-display font-semibold mb-3">Pods ({pods.length})</h3>
              <EntityGrid items={pods} emptyMsg="Not part of any pods yet." renderItem={(pm: any) => (
                <Link key={pm.id} to={`/pods/${pm.podId}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all block">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarFallback><CircleDot className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold truncate">{pm.pod?.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] capitalize">{pm.role?.toLowerCase()}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{pm.pod?.type?.toLowerCase().replace("_", " ")}</Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              )} />
            </section>

            <section>
              <h3 className="font-display font-semibold mb-3">Organizations ({companies.length})</h3>
              <EntityGrid items={companies} emptyMsg="Not part of any organizations yet." renderItem={(cm: any) => (
                <Link key={cm.id} to={`/companies/${cm.companyId}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all block">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarImage src={cm.company?.logo_url} />
                      <AvatarFallback><Building2 className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold truncate">{cm.company?.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] capitalize">{cm.role?.toLowerCase()}</Badge>
                        {cm.company?.sector && <Badge variant="secondary" className="text-[10px]">{cm.company.sector}</Badge>}
                      </div>
                    </div>
                  </div>
                </Link>
              )} />
            </section>
          </div>
        </TabsContent>

        {/* ─── Matchmaker ─── */}
        {isOwnProfile && (
          <TabsContent value="matchmaker">
            <MatchmakerPanel matchType="user" userId={profile.userId} />
          </TabsContent>
        )}

        {/* ─── Wall ─── */}
        <TabsContent value="wall" className="space-y-6">
          <ProfileWallSection profileUserId={profile.userId} isOwnProfile={isOwnProfile} allowComments={profile.allowWallComments} />
          {profile.allowWallComments && (
            <CommentThread targetType={CommentTargetType.USER} targetId={profile.userId} />
          )}
        </TabsContent>
      </Tabs>

      {isOwnProfile && (
        <EntityCreationWizard open={showCreateUnit} onOpenChange={setShowCreateUnit} />
      )}
      {followDialogMode && (
        <FollowersDialog
          open={!!followDialogMode}
          onOpenChange={(open) => { if (!open) setFollowDialogMode(null); }}
          targetId={id!}
          targetType="USER"
          mode={followDialogMode}
        />
      )}
      {followedEntityDialog && (
        <FollowedEntitiesDialog
          open={!!followedEntityDialog}
          onOpenChange={(open) => { if (!open) setFollowedEntityDialog(null); }}
          userId={id!}
          entityType={followedEntityDialog}
        />
      )}
      {listDialog && (
        <ProfileListDialog
          open={!!listDialog}
          onOpenChange={(open) => { if (!open) setListDialog(null); }}
          title={
            listDialog === "quests-created" ? "Quests Created" :
            listDialog === "quests-joined" ? "Quests Joined" :
            listDialog === "guilds" ? "Guilds" :
            listDialog === "pods" ? "Pods" :
            listDialog === "companies" ? "Organizations" :
            listDialog === "services" ? serviceLabel : ""
          }
          icon={
            listDialog === "quests-created" || listDialog === "quests-joined" ? Compass :
            listDialog === "guilds" ? Shield :
            listDialog === "pods" ? CircleDot :
            listDialog === "companies" ? Building2 : Briefcase
          }
          items={
            listDialog === "quests-created" ? filteredQuestsCreated.map((q: any) => ({ id: q.id, name: q.title, imageUrl: q.cover_image_url, subtitle: (q.status || "draft").toLowerCase().replace("_", " "), link: `/quests/${q.id}` })) :
            listDialog === "quests-joined" ? filteredQuestsJoined.map((qm: any) => ({ id: qm.questId || qm.quest_id || qm.quest?.id, name: qm.quest?.title || "Quest", imageUrl: qm.quest?.cover_image_url, link: `/quests/${qm.questId || qm.quest_id || qm.quest?.id}` })) :
            listDialog === "guilds" ? filteredGuilds.map((gm: any) => ({ id: gm.guildId, name: gm.guild?.name || "Guild", imageUrl: gm.guild?.logo_url, subtitle: gm.role?.toLowerCase(), link: `/guilds/${gm.guildId}` })) :
            listDialog === "pods" ? filteredPods.map((pm: any) => ({ id: pm.podId, name: pm.pod?.name || "Pod", subtitle: pm.role?.toLowerCase(), link: `/pods/${pm.podId}` })) :
            listDialog === "companies" ? filteredCompanies.map((cm: any) => ({ id: cm.companyId, name: cm.company?.name || "Organization", imageUrl: cm.company?.logo_url, subtitle: cm.role?.toLowerCase(), link: `/companies/${cm.companyId}` })) :
            listDialog === "services" ? filteredServices.map((s: any) => ({ id: s.id, name: s.title, imageUrl: s.image_url, subtitle: s.price_amount != null ? (s.price_amount === 0 ? "Free" : `€${s.price_amount}`) : undefined, link: `/services/${s.id}` })) :
            []
          }
        />
      )}
    </PageShell>
  );
}
function StatCard({ icon: Icon, label, count, onClick }: { icon: any; label: string; count: number; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={`flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 ${onClick ? "cursor-pointer hover:border-primary/30 transition-colors" : ""}`}>
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </Comp>
  );
}

function EntityGrid({ items, emptyMsg, renderItem }: { items: any[]; emptyMsg: string; renderItem: (item: any) => React.ReactNode }) {
  if (items.length === 0 && emptyMsg) {
    return <p className="text-sm text-muted-foreground py-4">{emptyMsg}</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => renderItem(item))}
    </div>
  );
}
