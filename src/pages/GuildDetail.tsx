import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import {
  Shield, Users, Compass, ArrowLeft, Heart, Briefcase, Star,
  CircleDot, MapPin, Hash, CheckCircle, AlertCircle, Plus, Clock, Euro, Video,
  UserMinus, Settings, LayoutGrid, FileText, CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
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
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGuildById, useGuildMembersWithProfiles, useServicesForGuild, useQuestsForGuild, useAchievementsForQuests, usePublicProfile } from "@/hooks/useEntityQueries";
import { formatDistanceToNow } from "date-fns";
import { SocialLinksDisplay } from "@/components/SocialLinks";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { EntityJoinButton } from "@/components/EntityJoinButton";
import { GuildKanbanBoard } from "@/components/guild/GuildKanbanBoard";
import { GuildDocsSpace } from "@/components/guild/GuildDocsSpace";
import { GuildEvents } from "@/components/guild/GuildEvents";

export default function GuildDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: guild, isLoading } = useGuildById(id);
  const { data: membersData } = useGuildMembersWithProfiles(id);
  const { data: guildServices } = useServicesForGuild(id);
  const { data: guildQuests } = useQuestsForGuild(id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.GUILD, id!);
  const { data: creator } = usePublicProfile(guild?.created_by_user_id);

  const limits = usePlanLimits();
  
  const [showGuildXpDialog, setShowGuildXpDialog] = useState(false);

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

  const currentMembership = (guild.guild_members || []).find((gm: any) => gm.user_id === currentUser.id);
  const isAdmin = currentMembership?.role === "ADMIN";
  const isMember = !!currentMembership;

  // Feature flags
  const defaultFeatures = { kanbanBoard: true, docsSpace: true, events: true, applicationProcess: true, subtasks: true };
  const fc = typeof guild.features_config === "object" && guild.features_config ? { ...defaultFeatures, ...guild.features_config } : defaultFeatures;

  const doJoinGuild = async () => {
    const { error } = await supabase.from("guild_members").insert({ guild_id: guild.id, user_id: currentUser.id, role: "MEMBER" as any });
    if (error) { toast({ title: "Failed to join", variant: "destructive" }); return; }
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
    });
    if (error) { toast({ title: "Failed to create service", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["services-for-guild", id] });
    setSvcTitle(""); setSvcDesc(""); setSvcDuration("60"); setSvcPrice("0");
    setSvcLocationType(OnlineLocationType.JITSI); setSvcImageUrl(undefined); setSvcDraft(false);
    setCreateSvcOpen(false);
    toast({ title: "Guild service created" });
  };

  return (
    <PageShell>
      
      <XpSpendDialog open={showGuildXpDialog} onOpenChange={setShowGuildXpDialog} canAfford={limits.canAffordExtraGuild} xpCost={EXTRA_GUILD_CREDIT_COST} userXp={limits.userCredits} actionLabel="join one more guild" limitLabel="guild memberships for your plan" onConfirm={async () => { const ok = await limits.spendCredits(EXTRA_GUILD_CREDIT_COST, `Extra guild membership: ${guild.name}`, "GUILD", guild.id); if (ok) doJoinGuild(); }} />

      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=guilds"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Guilds</Link>
      </Button>

      {guild.is_draft && <DraftBanner />}

      {guild.banner_url && (
        <div className="w-full h-40 md:h-56 rounded-xl overflow-hidden mb-6">
          <img src={guild.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          {guild.logo_url && <img src={guild.logo_url} className="h-16 w-16 rounded-xl" alt="" />}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{guild.name}</h1>
              {guild.is_approved ? <CheckCircle className="h-5 w-5 text-primary" /> : isAdmin && <Badge variant="outline" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" /> Pending approval</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Badge variant="secondary" className="capitalize">{guild.type.toLowerCase()}</Badge>
              <span>Created by <Link to={`/users/${creator?.user_id}`} className="text-primary hover:underline">{creator?.name}</Link></span>
            </div>
            <p className="text-muted-foreground max-w-2xl mt-2 line-clamp-2">{guild.description}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={toggleFollow}>
              <Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} /> {isFollowing ? "Unfollow" : "Follow"}
            </Button>
            {!isMember && (
              <div className="flex flex-col gap-1 items-end">
                <EntityJoinButton entityType="guild" entityId={guild.id} joinPolicy={guild.join_policy || "OPEN"} applicationQuestions={(guild.application_questions as string[]) || []} currentUserId={currentUser.id} onJoined={() => { qc.invalidateQueries({ queryKey: ["guild", id] }); qc.invalidateQueries({ queryKey: ["guild-members-profiles", id] }); }} />
                <PlanLimitBadge limitReached={limits.guildLimitReached} xpCost={EXTRA_GUILD_CREDIT_COST} itemLabel="guild slot" compact />
              </div>
            )}
            {isMember && !isAdmin && <Button size="sm" variant="ghost" onClick={leaveGuild}><UserMinus className="h-4 w-4 mr-1" /> Leave</Button>}
            {isAdmin && <Button size="sm" variant="outline" asChild><Link to={`/guilds/${guild.id}/settings`}><Settings className="h-4 w-4 mr-1" /> Settings</Link></Button>}
            <ReportButton targetType={ReportTargetType.GUILD} targetId={guild.id} />
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

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"><Shield className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Members ({members.length})</TabsTrigger>
          <TabsTrigger value="quests"><Compass className="h-4 w-4 mr-1" /> Quests ({quests.length})</TabsTrigger>
          {isMember && (fc as any).kanbanBoard && <TabsTrigger value="board"><LayoutGrid className="h-4 w-4 mr-1" /> Board</TabsTrigger>}
          {isMember && (fc as any).docsSpace && <TabsTrigger value="docs"><FileText className="h-4 w-4 mr-1" /> Docs</TabsTrigger>}
          {(fc as any).events && <TabsTrigger value="events"><CalendarDays className="h-4 w-4 mr-1" /> Events</TabsTrigger>}
          <TabsTrigger value="services"><Briefcase className="h-4 w-4 mr-1" /> Services ({services.length})</TabsTrigger>
          {achievements.length > 0 && <TabsTrigger value="achievements"><Star className="h-4 w-4 mr-1" /> Achievements</TabsTrigger>}
          <TabsTrigger value="wall">Wall</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div><h3 className="font-display font-semibold mb-2">About</h3><p className="text-sm text-foreground/80 leading-relaxed">{guild.description}</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center"><p className="text-2xl font-bold text-primary">{members.length}</p><p className="text-sm text-muted-foreground">Members</p></div>
            <div className="rounded-lg border border-border bg-card p-4 text-center"><p className="text-2xl font-bold text-primary">{quests.length}</p><p className="text-sm text-muted-foreground">Quests</p></div>
            <div className="rounded-lg border border-border bg-card p-4 text-center"><p className="text-2xl font-bold text-primary">{services.length}</p><p className="text-sm text-muted-foreground">Services</p></div>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((m: any) => (
              <Link key={m.id} to={`/users/${m.user_id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                <Avatar className="h-10 w-10"><AvatarImage src={m.user?.avatar_url} /><AvatarFallback>{m.user?.name?.[0]}</AvatarFallback></Avatar>
                <div className="flex-1"><p className="text-sm font-medium">{m.user?.name}</p><p className="text-xs text-muted-foreground capitalize">{m.role.toLowerCase()}</p></div>
                <span className="text-xs text-muted-foreground">Joined {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}</span>
              </Link>
            ))}
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
          {quests.map((q: any) => (
            <Link key={q.id} to={`/quests/${q.id}`} className="block rounded-lg border border-border bg-card hover:border-primary/30 transition-all overflow-hidden">
              {q.cover_image_url && <div className="h-32 w-full"><img src={q.cover_image_url} alt="" className="w-full h-full object-cover" /></div>}
              <div className="p-4">
                <div className="flex items-center justify-between"><h4 className="font-display font-semibold">{q.title}</h4><Badge className="bg-primary/10 text-primary border-0">{q.reward_xp} XP</Badge></div>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{q.description}</p>
                <div className="flex items-center gap-2 mt-2"><Badge variant="outline" className="capitalize text-xs">{q.status.toLowerCase().replace("_", " ")}</Badge><Badge variant="secondary" className="capitalize text-xs">{q.monetization_type.toLowerCase()}</Badge></div>
              </div>
            </Link>
          ))}
          {quests.length === 0 && <p className="text-muted-foreground">No quests yet.</p>}
        </TabsContent>

        {isMember && (fc as any).kanbanBoard && (
          <TabsContent value="board" className="mt-6">
            <GuildKanbanBoard guildId={guild.id} isAdmin={isAdmin} isMember={isMember} />
          </TabsContent>
        )}

        {isMember && (fc as any).docsSpace && (
          <TabsContent value="docs" className="mt-6">
            <GuildDocsSpace guildId={guild.id} isMember={isMember} isAdmin={isAdmin} />
          </TabsContent>
        )}

        {(fc as any).events && (
          <TabsContent value="events" className="mt-6">
            <GuildEvents guildId={guild.id} isMember={isMember} isAdmin={isAdmin} />
          </TabsContent>
        )}

        <TabsContent value="services" className="mt-6 space-y-3">
          {isAdmin && (
            <Dialog open={createSvcOpen} onOpenChange={setCreateSvcOpen}>
              <DialogTrigger asChild><Button size="sm" className="mb-3"><Plus className="h-4 w-4 mr-1" /> Create guild service</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Guild Service</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={svcTitle} onChange={e => setSvcTitle(e.target.value)} placeholder="e.g. Mentoring Session" maxLength={120} /></div>
                  <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={svcDesc} onChange={e => setSvcDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
                  <ImageUpload label="Service Image (optional)" currentImageUrl={svcImageUrl} onChange={setSvcImageUrl} aspectRatio="16/9" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium mb-1 block">Duration (min)</label><Input type="number" value={svcDuration} onChange={e => setSvcDuration(e.target.value)} min={15} max={480} /></div>
                    <div><label className="text-sm font-medium mb-1 block">Price (€)</label><Input type="number" value={svcPrice} onChange={e => setSvcPrice(e.target.value)} min={0} step={5} /></div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Location type</label>
                    <Select value={svcLocationType} onValueChange={v => setSvcLocationType(v as OnlineLocationType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={OnlineLocationType.JITSI}>Jitsi</SelectItem><SelectItem value={OnlineLocationType.ZOOM}>Zoom</SelectItem><SelectItem value={OnlineLocationType.OTHER}>Other</SelectItem></SelectContent></Select>
                  </div>
                  <div className="flex items-center justify-between"><label className="text-sm font-medium">Save as draft</label><Switch checked={svcDraft} onCheckedChange={setSvcDraft} /></div>
                  <Button onClick={createGuildService} disabled={!svcTitle.trim()} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {services.map((svc: any) => (
            <Link key={svc.id} to={`/services/${svc.id}`} className="block rounded-lg border border-border bg-card hover:border-primary/30 transition-all overflow-hidden">
              {svc.image_url && <div className="h-28 w-full"><img src={svc.image_url} alt="" className="w-full h-full object-cover" /></div>}
              <div className="p-4">
                <div className="flex items-center justify-between"><h4 className="font-display font-semibold">{svc.title}</h4>
                  <div className="flex items-center gap-2">{svc.duration_minutes && <span className="text-xs text-muted-foreground">{svc.duration_minutes} min</span>}{svc.price_amount != null && <Badge className="bg-primary/10 text-primary border-0">{svc.price_amount === 0 ? "Free" : `€${svc.price_amount}`}</Badge>}</div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{svc.description}</p>
              </div>
            </Link>
          ))}
          {services.length === 0 && <p className="text-muted-foreground">No services yet.</p>}
        </TabsContent>

        {achievements.length > 0 && (
          <TabsContent value="achievements" className="mt-6 space-y-3">
            {achievements.map((a: any) => (
              <Link key={a.id} to={`/achievements/${a.id}`} className="block rounded-lg border border-border bg-card p-4 hover:border-warning/30 transition-all">
                <div className="flex items-start gap-3">
                  {a.image_url ? <img src={a.image_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" /> : <Star className="h-5 w-5 text-warning mt-0.5 shrink-0" />}
                  <div className="flex-1">
                    <h4 className="font-display font-semibold">{a.title}</h4>
                    {a.description && <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>}
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </TabsContent>
        )}

        <TabsContent value="wall" className="mt-6">
          <CommentThread targetType={CommentTargetType.GUILD} targetId={guild.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
