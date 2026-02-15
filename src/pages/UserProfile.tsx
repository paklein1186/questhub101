import { useParams, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Zap, MapPin, Hash, UserPlus, UserMinus,
  Briefcase, Shield, Compass, CircleDot, Pencil, Users, Ban, Coins,
  Plus, ExternalLink, Sparkles, Settings, Globe, Twitter, Linkedin, Instagram, Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { ProfileWallSection } from "@/components/feed/ProfileWallSection";
import { CommentTargetType, FollowTargetType, ReportTargetType } from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ReportButton } from "@/components/ReportButton";
import { useFollow } from "@/hooks/useFollow";
import { useBlock } from "@/hooks/useBlock";
import { useProfileData, type ProfileData } from "@/hooks/useProfileData";
import { AdminBadge } from "@/components/AdminBadge";
import { useUserRoles } from "@/lib/admin";
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { XP_LEVEL_THRESHOLDS, computeLevelFromXp } from "@/lib/xpCreditsConfig";
import { getLabel, type PersonaType } from "@/lib/personaLabels";
import { Loader2 } from "lucide-react";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { EntityCreationWizard } from "@/components/EntityCreationWizard";
import { useOpenChatBubble } from "@/hooks/useOpenChatBubble";
import { MessageSquare } from "lucide-react";
import { ProfileQuestsTab } from "@/components/profile/ProfileQuestsTab";

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

// ─── XP Progress bar ───────────────────────────────────────
function XpProgressBar({ xp, level }: { xp: number; level: number }) {
  const current = XP_LEVEL_THRESHOLDS.find((t) => t.level === level);
  const next = XP_LEVEL_THRESHOLDS.find((t) => t.level === level + 1);
  if (!current || !next) return null;
  const progress = ((xp - current.minXp) / (next.minXp - current.minXp)) * 100;
  return (
    <div className="w-full max-w-[180px]">
      <Progress value={Math.min(progress, 100)} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground mt-0.5">{next.minXp - xp} XP to Level {next.level}</p>
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

  const parts: string[] = [];
  if (liveIn.length) parts.push(`Lives in ${liveIn.map((t) => t.territory?.name).join(", ")}`);
  if (workIn.length) parts.push(`Works in ${workIn.map((t) => t.territory?.name).join(", ")}`);
  if (careFor.length) parts.push(`Cares for ${careFor.slice(0, 2).map((t) => t.territory?.name).join(", ")}`);

  if (parts.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <MapPin className="h-3 w-3 shrink-0" />
      {parts.join(" · ")}
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

  const [tab, setTab] = useState("overview");
  const [showCreateUnit, setShowCreateUnit] = useState(false);

  if (isLoading) {
    return <PageShell><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageShell>;
  }
  if (!profile || isError) {
    return <PageShell><p className="text-center py-20 text-muted-foreground">User not found.</p></PageShell>;
  }

  const persona = profile.personaType;
  const canSeePrivate = isOwnProfile || viewerIsAdmin;
  const serviceLabel = getLabel("service.label_plural", persona);
  const totalEntities = guilds.length + pods.length + companies.length;

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
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
                <XpLevelBadge level={profile.xpLevel} xp={profile.xp} />
                <span className="text-xs text-muted-foreground">{profile.xpRecent12m} XP last 12m</span>
                {canSeePrivate && (
                  <span className="flex items-center gap-1 text-xs font-medium">
                    <Coins className="h-3 w-3 text-primary" /> {profile.creditsBalance} Credits
                  </span>
                )}
              </div>
              <XpProgressBar xp={profile.xp} level={profile.xpLevel} />

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
                  <Plus className="h-4 w-4 mr-1" /> Add unit
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
              questsCreated={questsCreated}
              questsJoined={questsJoined}
              guilds={guilds}
              pods={pods}
              companies={companies}
              services={services}
              topics={topics}
              territories={territories}
              persona={persona}
            />

            {/* Stat badges */}
            <div className="flex flex-wrap gap-3">
              <StatCard icon={Compass} label="Quests created" count={questsCreated.length} />
              <StatCard icon={Compass} label="Quests joined" count={questsJoined.length} />
              <StatCard icon={Shield} label="Guilds" count={guilds.length} />
              <StatCard icon={CircleDot} label="Pods" count={pods.length} />
              <StatCard icon={Building2} label="Organizations" count={companies.length} />
              <StatCard icon={Briefcase} label={serviceLabel} count={services.length} />
            </div>

            {/* Entities preview */}
            {totalEntities > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold">Entities ({totalEntities})</h3>
                  <Button size="sm" variant="ghost" onClick={() => setTab("entities")} className="text-xs">View all →</Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {guilds.slice(0, 2).map((gm: any) => (
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
                  {pods.slice(0, 2).map((pm: any) => (
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
                  {companies.slice(0, 2).map((cm: any) => (
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
            {(questsCreated.length > 0 || services.length > 0) && (
              <section>
                <h3 className="font-display font-semibold mb-3">Highlights</h3>
                <div className="grid gap-3 md:grid-cols-3">
              {questsCreated.slice(0, 2).map((q: any) => (
                    <Link key={q.id} to={`/quests/${q.id}`} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                      <UnitCoverImage type="QUEST" imageUrl={q.cover_image_url} height="h-24" />
                      <div className="p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Quest</p>
                        <h4 className="font-display font-semibold truncate">{q.title}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize mt-1">{(q.status || "draft").toLowerCase().replace("_", " ")}</Badge>
                      </div>
                    </Link>
                  ))}
                  {services.slice(0, 2).map((s: any) => (
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

        {/* ─── Entities ─── */}
        <TabsContent value="entities">
          <div className="space-y-8">
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
    </PageShell>
  );
}

// ─── Reusable helpers ──────────────────────────────────────
function StatCard({ icon: Icon, label, count }: { icon: any; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
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
