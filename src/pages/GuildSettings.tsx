import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { notifyEntityFollowersAndMembers } from "@/lib/notifyEntityActivity";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Trash2, UserPlus, ShieldCheck, Shield,
  Users, Briefcase, Settings, CreditCard, Pencil, Plus, Euro,
  Clock, Video, ToggleLeft, ToggleRight, Crown, Hash, MapPin, Tag,
  AlertCircle, Check, Loader2, ClipboardList, X, Handshake, Vote,
  ChevronUp, ChevronDown, Globe, Eye, EyeOff, ShoppingBag, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { GuildType, GuildMemberRole, OnlineLocationType, GuildJoinPolicy } from "@/types/enums";
import { AttachmentTargetType } from "@/types/enums";
import { AttachmentUpload, AttachmentList } from "@/components/AttachmentUpload";
import { formatDistanceToNow } from "date-fns";
import { SocialLinksEdit, normalizeUrl } from "@/components/SocialLinks";
import { EntityApplicationsTab } from "@/components/EntityApplicationsTab";
import { MembershipPolicyEditor } from "@/components/MembershipPolicyEditor";
import { supabase } from "@/integrations/supabase/client";
import { SearchableTagPicker } from "@/components/SearchableTagPicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";

import { Label } from "@/components/ui/label";
import { LayoutGrid, FileText, CalendarDays, ListChecks, Puzzle } from "lucide-react";
import { AIWriterButton } from "@/components/AIWriterButton";
import { PartnershipsTab } from "@/components/partnership/PartnershipsTab";
import { UnitAvailabilityEditor } from "@/components/UnitAvailabilityEditor";
import { UnitWalletTab } from "@/components/UnitWalletTab";
import { GuildGiveBackReceived } from "@/components/giveback/GiveBackHistory";
import { UserSearchInput } from "@/components/UserSearchInput";
import { sendInviteNotification } from "@/lib/inviteNotification";
import { EntityRolesManager } from "@/components/EntityRolesManager";
import { useEntityRoles } from "@/hooks/useEntityRoles";
import { useNotifications } from "@/hooks/useNotifications";
import { SourceRoleTransfer } from "@/components/guild/SourceRoleTransfer";
import { WebVisibilityEditor } from "@/components/website/WebVisibilityEditor";
import { SiteCodeManager } from "@/components/website/SiteCodeManager";
import { FeedpointVisibilitySettings } from "@/components/website/FeedpointVisibilitySettings";
import { GuildMembershipSettingsPanel } from "@/components/guild/GuildMembershipSettingsPanel";
import { ExitProtocolSettings } from "@/components/ocu/ExitProtocolSettings";

const TABS = [
  { key: "identity", label: "Identity & Profile", icon: Shield },
  { key: "features", label: "Features", icon: Puzzle },
  { key: "governance", label: "Governance", icon: Vote },
  { key: "membership", label: "Membership Policy", icon: ClipboardList },
  { key: "membership-contributions", label: "Membership & Contributions", icon: Users },
  { key: "applications", label: "Applications", icon: Users },
  { key: "members", label: "Members & Roles", icon: Users },
  { key: "roles", label: "Custom Roles", icon: Tag },
  { key: "services", label: "Services", icon: Briefcase },
  { key: "services-display", label: "Services Display", icon: Briefcase },
  { key: "availability", label: "Availability", icon: CalendarDays },
  { key: "defaults", label: "Quests & Pods Defaults", icon: Settings },
  { key: "partnerships", label: "Partnerships", icon: Handshake },
  { key: "documents", label: "Documents", icon: Briefcase },
  { key: "billing", label: "Unit Wallet", icon: CreditCard },
  { key: "website", label: "Website", icon: Globe },
];

export default function GuildSettings() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();

  const { data: guild, isLoading: guildLoading } = useQuery({
    queryKey: ["guild-settings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guilds")
        .select("*, guild_topics(topic_id), guild_territories(territory_id), guild_members(id, user_id, role, joined_at)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (guildLoading) return <PageShell><Loader2 className="h-6 w-6 animate-spin mx-auto mt-16" /></PageShell>;
  if (!guild) return <PageShell><p>Guild not found.</p></PageShell>;

  const currentMembership = guild.guild_members?.find(
    (gm: any) => gm.user_id === currentUser.id
  );
  if (currentMembership?.role !== "ADMIN") {
    return <PageShell><p>You must be an admin of this guild to access settings.</p></PageShell>;
  }

  return <GuildSettingsInner guildId={guild.id} guild={guild} />;
}

function GuildSettingsInner({ guildId, guild }: { guildId: string; guild: any }) {
  const currentUser = useCurrentUser();
  const { notifyGuildMemberAdded, notifyGuildRoleChanged } = useNotifications();
  const { toast } = useToast();
  const { getRolesForUser } = useEntityRoles("guild", guildId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "identity";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const { data: allTopics = [] } = useTopics();
  const { data: allTerritories = [] } = useTerritories();

  // ── Identity state ──
  const [name, setName] = useState(guild.name);
  const [logoUrl, setLogoUrl] = useState(guild.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(guild.banner_url ?? "");
  const [description, setDescription] = useState(guild.description ?? "");
  const [type, setType] = useState<GuildType>(guild.type as GuildType);

  const currentTopicIds = (guild.guild_topics || []).map((gt: any) => gt.topic_id);
  const currentTerritoryIds = (guild.guild_territories || []).map((gt: any) => gt.territory_id);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(currentTopicIds);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(currentTerritoryIds);
  const [universeVisibility, setUniverseVisibility] = useState<string>(guild.universe_visibility ?? "both");

  // Social links state
  const [guildWebsiteUrl, setGuildWebsiteUrl] = useState(guild.website_url ?? "");
  const [guildTwitterUrl, setGuildTwitterUrl] = useState(guild.twitter_url ?? "");
  const [guildLinkedinUrl, setGuildLinkedinUrl] = useState(guild.linkedin_url ?? "");
  const [guildInstagramUrl, setGuildInstagramUrl] = useState(guild.instagram_url ?? "");

  // ── Members ──
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["guild-members-settings", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_members")
        .select("id, user_id, role, joined_at")
        .eq("guild_id", guildId);
      if (error) throw error;
      // fetch profiles for members
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url")
        .in("user_id", userIds);
      return data.map((m: any) => ({
        ...m,
        user: profiles?.find((p: any) => p.user_id === m.user_id),
      }));
    },
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // ── Services ──
  const { data: guildServices = [], refetch: refetchServices } = useQuery({
    queryKey: ["guild-services-settings", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("provider_guild_id", guildId)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const [createSvcOpen, setCreateSvcOpen] = useState(false);
  const [svcTitle, setSvcTitle] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcDuration, setSvcDuration] = useState("60");
  const [svcPrice, setSvcPrice] = useState("0");
  const [svcLocationType, setSvcLocationType] = useState<OnlineLocationType>(OnlineLocationType.JITSI);
  const [svcImageUrl, setSvcImageUrl] = useState<string | undefined>();

  // ── Membership policy state ──
  const [joinPolicy, setJoinPolicy] = useState<GuildJoinPolicy>(
    (guild.join_policy as GuildJoinPolicy) || GuildJoinPolicy.OPEN
  );
  const [appQuestions, setAppQuestions] = useState<string[]>(
    (guild.application_questions as string[]) || []
  );

  // ── Defaults state ──
  const [podAccessPolicy, setPodAccessPolicy] = useState<"OPEN" | "GUILD_MEMBERS" | "INVITE_ONLY">("OPEN");
  const [defaultQuestTopics, setDefaultQuestTopics] = useState<string[]>([]);
  const [defaultQuestTerritories, setDefaultQuestTerritories] = useState<string[]>([]);

  // ── Features config state ──
  const defaultFeatures = { kanbanBoard: true, docsSpace: true, events: true, applicationProcess: true, subtasks: true, discussionTab: true, discussionAccess: "members", discussionPostPermission: "MEMBER", showMemberServices: true, rituals: true };
  const parsedFeatures = typeof guild.features_config === "object" && guild.features_config ? { ...defaultFeatures, ...guild.features_config } : defaultFeatures;
  const [featuresConfig, setFeaturesConfig] = useState(parsedFeatures);

  const toggleFeature = (key: string) => setFeaturesConfig((prev: any) => ({ ...prev, [key]: !prev[key] }));

  const handleSaveFeatures = async () => {
    const { error } = await supabase.from("guilds").update({ features_config: featuresConfig as any }).eq("id", guildId);
    if (error) { toast({ title: "Failed to save features", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["guild-settings", guildId] });
    qc.invalidateQueries({ queryKey: ["guild", guildId] });
    toast({ title: "Features saved!" });
  };

  // ── Handlers ──
  const toggleTopic = (topicId: string) =>
    setSelectedTopics((prev) => prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]);
  const toggleTerritory = (territoryId: string) =>
    setSelectedTerritories((prev) => prev.includes(territoryId) ? prev.filter((id) => id !== territoryId) : [...prev, territoryId]);
  const toggleDefaultQuestTopic = (id: string) =>
    setDefaultQuestTopics((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleDefaultQuestTerritory = (id: string) =>
    setDefaultQuestTerritories((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleSaveIdentity = async () => {
    const { error } = await supabase
      .from("guilds")
      .update({
        name: name.trim() || guild.name,
        logo_url: logoUrl.trim() || null,
        banner_url: bannerUrl.trim() || null,
        description: description.trim() || null,
        type: type as any,
        universe_visibility: universeVisibility,
        website_url: normalizeUrl(guildWebsiteUrl) ?? null,
        twitter_url: normalizeUrl(guildTwitterUrl) ?? null,
        linkedin_url: normalizeUrl(guildLinkedinUrl) ?? null,
        instagram_url: normalizeUrl(guildInstagramUrl) ?? null,
      } as any)
      .eq("id", guildId);
    if (error) { toast({ title: "Failed to save", variant: "destructive" }); return; }

    // Sync topics
    await supabase.from("guild_topics").delete().eq("guild_id", guildId);
    if (selectedTopics.length > 0) {
      await supabase.from("guild_topics").insert(
        selectedTopics.map((topicId) => ({ guild_id: guildId, topic_id: topicId }))
      );
    }
    // Sync territories
    await supabase.from("guild_territories").delete().eq("guild_id", guildId);
    if (selectedTerritories.length > 0) {
      await supabase.from("guild_territories").insert(
        selectedTerritories.map((territoryId) => ({ guild_id: guildId, territory_id: territoryId }))
      );
    }
    qc.invalidateQueries({ queryKey: ["guild-settings", guildId] });
    // Notify followers only about profile update (skip if private)
    if (guild.universe_visibility !== "private") {
      notifyEntityFollowersAndMembers({
        entityType: "GUILD", entityId: guildId, entityName: name.trim() || guild.name,
        actorUserId: currentUser.id, notifType: "FOLLOWED_ENTITY_UPDATE",
        title: `${name.trim() || guild.name} updated their profile`,
        body: "The guild you follow has new information",
        deepLinkUrl: `/guilds/${guildId}`,
        followersOnly: true,
      });
    }
    toast({ title: "Guild identity updated!" });
  };

  const inviteMember = async (selectedUserId: string) => {
    if (!selectedUserId) return;
    const already = members.some((m: any) => m.user_id === selectedUserId);
    if (already) { toast({ title: "Already a member", variant: "destructive" }); return; }
    const { error } = await supabase.from("guild_members").insert({
      guild_id: guildId, user_id: selectedUserId, role: "MEMBER" as any,
    });
    if (error) { toast({ title: "Failed to add member", variant: "destructive" }); return; }
    sendInviteNotification({ invitedUserId: selectedUserId, inviterName: currentUser.name, entityType: "guild", entityId: guildId!, entityName: guild?.name || "Guild" });
    notifyGuildMemberAdded({ guildId: guildId!, userId: selectedUserId });
    setInviteOpen(false);
    refetchMembers();
    // Notify followers about new member (skip if private)
    if (guild.universe_visibility !== "private") {
      notifyEntityFollowersAndMembers({
        entityType: "GUILD", entityId: guildId, entityName: guild.name,
        actorUserId: currentUser.id, notifType: "FOLLOWED_ENTITY_NEW_MEMBER",
        title: "New member joined a guild you follow",
        body: `${guild.name} has a new member`,
        deepLinkUrl: `/guilds/${guildId}`,
        followersOnly: true,
      });
    }
    toast({ title: "Member added!" });
  };

  const toggleMemberRole = async (memberId: string) => {
    const gm = members.find((m: any) => m.id === memberId);
    if (!gm) return;
    const admins = members.filter((m: any) => m.role === "ADMIN");
    if (gm.role === "ADMIN" && admins.length <= 1) {
      toast({ title: "Cannot demote", description: "At least one admin must exist.", variant: "destructive" });
      return;
    }
    const newRole = gm.role === "ADMIN" ? "MEMBER" : "ADMIN";
    const { error } = await supabase.from("guild_members").update({ role: newRole as any }).eq("id", memberId);
    if (error) { toast({ title: "Failed to update role", description: error.message, variant: "destructive" }); return; }
    notifyGuildRoleChanged({ guildId: guildId!, userId: gm.user_id, newRole });
    refetchMembers();
    toast({ title: `Role changed to ${newRole.toLowerCase()}` });
  };

  const removeMember = async (memberId: string) => {
    const gm = members.find((m: any) => m.id === memberId);
    if (!gm || gm.user_id === currentUser.id) return;
    if (gm.role === "ADMIN") {
      const admins = members.filter((m: any) => m.role === "ADMIN");
      if (admins.length <= 1) { toast({ title: "Cannot remove the last admin", variant: "destructive" }); return; }
    }
    await supabase.from("guild_members").delete().eq("id", memberId);
    refetchMembers();
    toast({ title: "Member removed" });
  };

  const createGuildService = async () => {
    if (!svcTitle.trim()) return;
    const { error } = await supabase.from("services").insert({
      title: svcTitle.trim(),
      description: svcDesc.trim() || null,
      provider_guild_id: guildId,
      owner_type: "GUILD",
      owner_id: guildId,
      duration_minutes: Number(svcDuration) || 60,
      price_amount: Number(svcPrice) || 0,
      price_currency: "EUR",
      online_location_type: svcLocationType,
      is_active: true,
      image_url: svcImageUrl || null,
    } as any);
    if (error) { toast({ title: "Failed to create service", variant: "destructive" }); return; }
    notifyEntityFollowersAndMembers({
      entityType: "GUILD", entityId: guildId, entityName: guild.name,
      actorUserId: currentUser.id, notifType: "FOLLOWED_ENTITY_NEW_SERVICE",
      title: `New service: ${svcTitle.trim()}`, body: `A new service was added in ${guild.name}`,
      deepLinkUrl: `/guilds/${guildId}?tab=services`,
    });
    setSvcTitle(""); setSvcDesc(""); setSvcDuration("60"); setSvcPrice("0");
    setSvcLocationType(OnlineLocationType.JITSI); setSvcImageUrl(undefined);
    setCreateSvcOpen(false);
    refetchServices();
    toast({ title: "Guild service created" });
  };

  const toggleServiceActive = async (svc: any) => {
    await supabase.from("services").update({ is_active: !svc.is_active }).eq("id", svc.id);
    refetchServices();
    toast({ title: svc.is_active ? "Service paused" : "Service resumed" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/guilds/${guildId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to guild</Link>
      </Button>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {guild.logo_url && <img src={guild.logo_url} className="h-10 w-10 rounded-lg" alt="" />}
          <div>
            <h1 className="font-display text-2xl font-bold">Guild Settings</h1>
            <p className="text-sm text-muted-foreground">{guild.name}</p>
          </div>
          {guild.is_approved ? (
            <Badge className="bg-primary/10 text-primary border-0 ml-auto"><ShieldCheck className="h-3 w-3 mr-1" /> Approved</Badge>
          ) : (
            <Badge variant="outline" className="ml-auto"><AlertCircle className="h-3 w-3 mr-1" /> Awaiting moderation</Badge>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <nav className="md:w-52 shrink-0 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

              {/* ── Identity & Profile ── */}
              {activeTab === "identity" && (
                <div className="space-y-5 max-w-lg">
                  <Section title="Guild Identity" icon={<Shield className="h-5 w-5" />}>
                    <div className="space-y-4">
                      <div><label className="text-sm font-medium mb-1 block">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
                      <ImageUpload label="Logo" currentImageUrl={logoUrl || undefined} onChange={(url) => setLogoUrl(url ?? "")} aspectRatio="1/1" description="Square logo, recommended 256×256" />
                      <ImageUpload label="Banner (optional)" currentImageUrl={bannerUrl || undefined} onChange={(url) => setBannerUrl(url ?? "")} aspectRatio="16/9" description="Wide banner, recommended 1200×400" />
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium">Description</label>
                          <AIWriterButton
                            type="guild_identity"
                            context={{ title: name, guildType: type, memberCount: guild.guild_members?.length || 0 }}
                            currentText={description}
                            onAccept={(text) => setDescription(text)}
                          />
                        </div>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="resize-none min-h-[120px]" />
                      </div>
                      <div><label className="text-sm font-medium mb-1 block">Type</label>
                        <Select value={type} onValueChange={(v) => setType(v as GuildType)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={GuildType.GUILD}>Guild</SelectItem>
                            <SelectItem value={GuildType.NETWORK}>Network</SelectItem>
                            <SelectItem value={GuildType.COLLECTIVE}>Collective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Section>

                  <Separator />

                  <Section title="Topics (Houses)" icon={<Hash className="h-5 w-5" />}>
                    <SearchableTagPicker
                      label="Topics"
                      items={allTopics.map((t: any) => ({ id: t.id, name: t.name }))}
                      selectedIds={selectedTopics}
                      onToggle={toggleTopic}
                      onSelectAll={() => setSelectedTopics(allTopics.map((t: any) => t.id))}
                      onClearAll={() => setSelectedTopics([])}
                      variant="checkboxes"
                    />
                  </Section>

                  <Section title="Territories" icon={<MapPin className="h-5 w-5" />}>
                    <SearchableTagPicker
                      label="Territories"
                      items={allTerritories.map((t: any) => ({ id: t.id, name: t.name, subtitle: t.level?.toLowerCase() }))}
                      selectedIds={selectedTerritories}
                      onToggle={toggleTerritory}
                      onSelectAll={() => setSelectedTerritories(allTerritories.map((t: any) => t.id))}
                      onClearAll={() => setSelectedTerritories([])}
                      variant="checkboxes"
                    />
                  </Section>

                  <Section title="Universe Visibility" icon={<Settings className="h-5 w-5" />}>
                    <p className="text-xs text-muted-foreground mb-2">
                      Control in which universe this guild appears when users filter by Creative or Impact.
                    </p>
                    <Select value={universeVisibility} onValueChange={setUniverseVisibility}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both universes</SelectItem>
                        <SelectItem value="creative">Creative Universe only</SelectItem>
                        <SelectItem value="impact">Impact Universe only</SelectItem>
                      </SelectContent>
                    </Select>
                  </Section>

                  <Button onClick={handleSaveIdentity} className="w-full"><Save className="h-4 w-4 mr-2" /> Save identity</Button>

                  <Separator />

                  <Section title="Links & Social" icon={<Shield className="h-5 w-5" />}>
                    <SocialLinksEdit
                      data={{ websiteUrl: guildWebsiteUrl, twitterUrl: guildTwitterUrl, linkedinUrl: guildLinkedinUrl, instagramUrl: guildInstagramUrl }}
                      onChange={(key, value) => {
                        if (key === "websiteUrl") setGuildWebsiteUrl(value);
                        else if (key === "twitterUrl") setGuildTwitterUrl(value);
                        else if (key === "linkedinUrl") setGuildLinkedinUrl(value);
                        else if (key === "instagramUrl") setGuildInstagramUrl(value);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Links are saved when you click "Save identity" above.</p>
                  </Section>

                  <WebVisibilityEditor
                    entityId={guildId}
                    entityTable="guilds"
                    initialVisibility={(guild as any).public_visibility || "private"}
                    initialScopes={(guild as any).web_scopes || []}
                    initialTags={(guild as any).web_tags || []}
                    initialFeaturedOrder={(guild as any).featured_order ?? null}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["guild-settings", guildId] })}
                  />
                </div>
              )}

              {/* ── Features ── */}
              {activeTab === "features" && (
                <div className="space-y-5 max-w-lg">
                  <Section title="Collaboration Features" icon={<Puzzle className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">Enable or disable tools for this guild. Disabled tools will be hidden from the guild page.</p>
                    <div className="space-y-4">
                      {[
                        { key: "kanbanBoard", label: "Kanban Board", desc: "Visual board to track quest status", icon: LayoutGrid },
                        { key: "subtasks", label: "Subtasks", desc: "Break quests into smaller tasks with assignees", icon: ListChecks },
                        { key: "docsSpace", label: "Docs Space", desc: "Notion-like documents for guild knowledge", icon: FileText },
                        { key: "events", label: "Events", desc: "Create online/offline events with attendees", icon: CalendarDays },
                        { key: "applicationProcess", label: "Application Process", desc: "Require applications for new members", icon: ClipboardList },
                        { key: "showMemberServices", label: "Member Services", desc: "Display services offered by guild members in the Services tab", icon: Briefcase },
                        { key: "rituals", label: "Rituals", desc: "Recurring sessions with video calls, notes, and attendance tracking", icon: CalendarDays },
                      ].map(({ key, label, desc, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <Label className="text-sm font-medium">{label}</Label>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                          <Switch checked={(featuresConfig as any)[key]} onCheckedChange={() => toggleFeature(key)} />
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleSaveFeatures} className="w-full mt-4"><Save className="h-4 w-4 mr-2" /> Save features</Button>
                  </Section>

                  {/* Discussion settings */}
                  <Section title="Discussion Tab" icon={<CalendarDays className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure the guild's discussion board where members can post and discuss.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <Label className="text-sm font-medium">Enable Discussion Tab</Label>
                            <p className="text-xs text-muted-foreground">Show a dedicated discussion feed on the guild page</p>
                          </div>
                        </div>
                        <Switch checked={(featuresConfig as any).discussionTab} onCheckedChange={() => toggleFeature("discussionTab")} />
                      </div>

                      {(featuresConfig as any).discussionTab && (
                        <>
                          <div>
                            <Label className="text-sm font-medium mb-1 block">Who can access the Discussion tab?</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Control whether the tab is visible only to validated members or to the wider public.
                            </p>
                            <Select
                              value={(featuresConfig as any).discussionAccess || "members"}
                              onValueChange={(v) => setFeaturesConfig((prev: any) => ({ ...prev, discussionAccess: v }))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="members">Members only (validated)</SelectItem>
                                <SelectItem value="public">Public (anyone can view)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium mb-1 block">Who can create posts?</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Choose whether all members or only admins can publish posts in the discussion tab.
                            </p>
                            <Select
                              value={(featuresConfig as any).discussionPostPermission || "MEMBER"}
                              onValueChange={(v) => setFeaturesConfig((prev: any) => ({ ...prev, discussionPostPermission: v }))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">Admins only</SelectItem>
                                <SelectItem value="MEMBER">All members</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                    <Button onClick={handleSaveFeatures} className="w-full mt-4"><Save className="h-4 w-4 mr-2" /> Save discussion settings</Button>
                  </Section>

                  <GuildFeatureSuggestionBox guildId={guildId} userId={currentUser.id} />
                </div>
              )}

              {/* ── Governance ── */}
              {activeTab === "governance" && (
                <div className="space-y-5 max-w-lg">
                  <Section title="Governance & Decisions" icon={<Vote className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">
                      Control how decisions and proposals work within this guild.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-1 block">Who can propose decisions?</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Choose which members are allowed to create new decision proposals.
                        </p>
                        <Select
                          value={(featuresConfig as any).decisionProposerRole || "ADMIN"}
                          onValueChange={(v) => setFeaturesConfig((prev: any) => ({ ...prev, decisionProposerRole: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admins only</SelectItem>
                            <SelectItem value="MEMBER">All members</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleSaveFeatures} className="w-full mt-4">
                      <Save className="h-4 w-4 mr-2" /> Save governance settings
                    </Button>
                  </Section>

                  <Separator />

                  {/* ── Contribution Accounting ── */}
                  <Section title="Contribution Accounting" icon={<Settings className="h-5 w-5" />}>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Label className="text-sm font-medium">FMV Rate (€ per half-day)</Label>
                          <span
                            className="text-muted-foreground cursor-help"
                            title="Fair Market Value rate used to calculate contribution value in the OCU system."
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <Input
                          type="number"
                          min={10}
                          max={5000}
                          defaultValue={(guild as any).fmv_rate_per_half_day ?? 200}
                          onChange={async (e) => {
                            const val = Math.max(10, Math.min(5000, Number(e.target.value) || 200));
                            await supabase.from("guilds").update({ fmv_rate_per_half_day: val } as any).eq("id", guildId);
                            qc.invalidateQueries({ queryKey: ["guild-settings", guildId] });
                          }}
                          className="max-w-[200px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Default: 200 €. Range: 10–5 000 €.</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Label className="text-sm font-medium">Governance Model</Label>
                          <span
                            className="text-muted-foreground cursor-help"
                            title="This governs how contribution % translates to voting power in guild decisions, contract amendments, and distribution proposals."
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <Select
                          defaultValue={(guild as any).governance_model ?? "1h1v"}
                          onValueChange={async (v) => {
                            await supabase.from("guilds").update({ governance_model: v } as any).eq("id", guildId);
                            qc.invalidateQueries({ queryKey: ["guild-settings", guildId] });
                            toast({ title: "Governance model updated" });
                          }}
                        >
                          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1h1v">1 Human, 1 Vote</SelectItem>
                            <SelectItem value="soft_log">Soft Logarithmic</SelectItem>
                            <SelectItem value="strong_log">Strong Logarithmic</SelectItem>
                            <SelectItem value="pure_pct">Pure Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Controls how contribution share translates to voting weight.
                        </p>
                      </div>

                      {/* Amendment threshold toggle for pure_pct */}
                      {((guild as any).governance_model === "pure_pct") && (
                        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-medium">Weighted amendment threshold</Label>
                              <p className="text-xs text-muted-foreground">
                                Use &gt;50% of weighted vote instead of unanimous consensus for contract amendments.
                              </p>
                            </div>
                            <Switch
                              defaultChecked={false}
                              onCheckedChange={async (checked) => {
                                // This would need to be stored per-quest in features_config.ocu.amendment_weighted_threshold
                                toast({ title: checked ? "Weighted threshold enabled" : "Unanimous consensus restored", description: "Apply this per-quest in Quest OCU settings." });
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>

                  <Separator />

                  {/* ── Exit Protocol ── */}
                  <ExitProtocolSettings guild={guild} guildId={guildId} />

                  <SourceRoleTransfer
                    entityType="guild"
                    entityId={guildId}
                    members={members}
                    currentUserId={currentUser.id}
                  />
                </div>
              )}

              {/* ── Membership Policy ── */}
              {activeTab === "membership" && (
                <MembershipPolicyEditor
                  joinPolicy={guild.join_policy || "OPEN"}
                  applicationQuestions={(guild.application_questions as string[]) || []}
                  onSave={async (policy, questions) => {
                    await supabase.from("guilds").update({
                      join_policy: policy as any,
                      application_questions: questions as any,
                    }).eq("id", guildId);
                    qc.invalidateQueries({ queryKey: ["guild-settings", guildId] });
                    toast({ title: "Membership policy saved!" });
                  }}
                />
              )}

              {/* ── Membership & Contributions ── */}
              {activeTab === "membership-contributions" && (
                <GuildMembershipSettingsPanel guild={guild} guildId={guildId} />
              )}

              {/* ── Applications ── */}
              {activeTab === "applications" && (
                <EntityApplicationsTab entityType="guild" entityId={guildId} currentUserId={currentUser.id} />
              )}

              {/* ── Membership & Roles ── */}
              {activeTab === "members" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Section title={`Members (${members.length})`} icon={<Users className="h-5 w-5" />}><span /></Section>
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                      <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Add member</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-xl overflow-visible">
                        <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Search by name</label>
                            <UserSearchInput
                              onSelect={(user) => inviteMember(user.user_id)}
                              placeholder="Type a member name…"
                              excludeUserIds={members.map((m: any) => m.user_id)}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">User</th>
                          <th className="text-left px-4 py-2 font-medium">Role</th>
                          <th className="text-left px-4 py-2 font-medium">Joined</th>
                          <th className="text-right px-4 py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m: any) => (
                          <tr key={m.id} className="border-t border-border">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8"><AvatarImage src={m.user?.avatar_url} /><AvatarFallback>{m.user?.name?.[0]}</AvatarFallback></Avatar>
                                <div>
                                  <p className="font-medium">{m.user?.name}</p>
                                  <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge variant={m.role === "ADMIN" ? "default" : "outline"} className="capitalize text-xs">
                                  {m.role === "ADMIN" && <Crown className="h-3 w-3 mr-1" />}
                                  {m.role.toLowerCase()}
                                </Badge>
                                {getRolesForUser(m.user_id).map((r: any) => (
                                  <Badge key={r.id} className="text-[10px] h-5 text-white border-0" style={{ backgroundColor: r.color }}>
                                    {r.name}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                {m.role === "ADMIN" ? (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => toggleMemberRole(m.id)} title="Demote to member">
                                    <ChevronDown className="h-3.5 w-3.5" /> Demote
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10" onClick={() => toggleMemberRole(m.id)} title="Promote to admin">
                                    <ChevronUp className="h-3.5 w-3.5" /> Promote
                                  </Button>
                                )}
                                {m.user_id !== currentUser.id && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeMember(m.id)} title="Remove member">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Custom Roles ── */}
              {activeTab === "roles" && (
                <div className="space-y-4 max-w-lg">
                  <EntityRolesManager entityType="guild" entityId={guildId} members={members} />
                </div>
              )}

              {/* ── Services ── */}
              {activeTab === "services" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Section title={`Guild Services (${guildServices.length})`} icon={<Briefcase className="h-5 w-5" />}><span /></Section>
                    <Dialog open={createSvcOpen} onOpenChange={setCreateSvcOpen}>
                      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Service</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Create Service for {guild.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={svcTitle} onChange={(e) => setSvcTitle(e.target.value)} placeholder="Service title" maxLength={120} /></div>
                          <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
                          <ImageUpload label="Image (optional)" currentImageUrl={svcImageUrl} onChange={setSvcImageUrl} aspectRatio="16/9" description="Service cover image" />
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-sm font-medium mb-1 block">Duration (min)</label><Input type="number" value={svcDuration} onChange={(e) => setSvcDuration(e.target.value)} min={15} /></div>
                            <div><label className="text-sm font-medium mb-1 block">Price (€) — shown as 🟩 Coins to clients</label><Input type="number" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} min={0} /></div>
                          </div>
                          <div><label className="text-sm font-medium mb-1 block">Online location</label>
                            <Select value={svcLocationType} onValueChange={(v) => setSvcLocationType(v as OnlineLocationType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={OnlineLocationType.JITSI}>Jitsi</SelectItem>
                                <SelectItem value={OnlineLocationType.ZOOM}>Zoom</SelectItem>
                                <SelectItem value={OnlineLocationType.OTHER}>Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={createGuildService} disabled={!svcTitle.trim()} className="w-full">Create service</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {guildServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No services yet. Create one above.</p>
                  ) : (
                    <div className="space-y-3">
                      {guildServices.map((svc: any) => (
                        <div key={svc.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                          <div>
                            <Link to={`/services/${svc.id}`} className="text-sm font-medium hover:text-primary transition-colors">{svc.title}</Link>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{svc.duration_minutes} min</span>
                              <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{(!svc.price_amount || svc.price_amount === 0) ? "Free" : `€${svc.price_amount}`}</span>
                              <span className="flex items-center gap-1"><Video className="h-3 w-3" />{svc.online_location_type?.toLowerCase()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={svc.is_active ? "bg-primary/10 text-primary border-0" : "bg-muted text-muted-foreground border-0"}>
                              {svc.is_active ? "Active" : "Paused"}
                            </Badge>
                            <Switch checked={svc.is_active} onCheckedChange={() => toggleServiceActive(svc)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Services Display ── */}
              {activeTab === "services-display" && (
                <GuildServicesDisplayTab guildId={guildId} members={members} />
              )}

              {/* ── Availability ── */}
              {activeTab === "availability" && (
                <div className="space-y-5 max-w-lg">
                  <Section title="Unit Availability" icon={<CalendarDays className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure when this guild is available for bookings. This schedule applies to all guild-hosted services.
                    </p>
                    <UnitAvailabilityEditor unitType="GUILD" unitId={guildId} />
                  </Section>
                </div>
              )}

              {/* ── Quests & Pods Defaults ── */}
              {activeTab === "defaults" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Pod Access Policy" icon={<Settings className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-3">When pods are created from this guild, who can join?</p>
                    <Select value={podAccessPolicy} onValueChange={(v) => setPodAccessPolicy(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open to all users</SelectItem>
                        <SelectItem value="GUILD_MEMBERS">Only guild members</SelectItem>
                        <SelectItem value="INVITE_ONLY">Invite-only</SelectItem>
                      </SelectContent>
                    </Select>
                  </Section>

                  <Separator />

                  <Section title="Default Quest Topics" icon={<Hash className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-2">Pre-select these topics when creating quests from this guild.</p>
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card max-h-40 overflow-y-auto">
                      {allTopics.map((t: any) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox checked={defaultQuestTopics.includes(t.id)} onCheckedChange={() => toggleDefaultQuestTopic(t.id)} />
                          <span className="text-sm">{t.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{defaultQuestTopics.length} selected</p>
                  </Section>

                  <Section title="Default Quest Territories" icon={<MapPin className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-2">Pre-select these territories when creating quests from this guild.</p>
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card">
                      {allTerritories.map((t: any) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox checked={defaultQuestTerritories.includes(t.id)} onCheckedChange={() => toggleDefaultQuestTerritory(t.id)} />
                          <span className="text-sm">{t.name} <span className="text-muted-foreground text-xs">({t.level?.toLowerCase()})</span></span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{defaultQuestTerritories.length} selected</p>
                  </Section>

                  <Button onClick={() => toast({ title: "Quest & pod defaults saved!" })}><Save className="h-4 w-4 mr-2" /> Save defaults</Button>
                </div>
              )}

              {/* ── Documents ── */}
              {activeTab === "documents" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Guild Documents" icon={<Briefcase className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">Upload documents, resources, and files for guild members.</p>
                    <AttachmentList targetType={AttachmentTargetType.GUILD} targetId={guild.id} />
                    <div className="mt-4">
                      <AttachmentUpload targetType={AttachmentTargetType.GUILD} targetId={guild.id} />
                    </div>
                  </Section>
                </div>
              )}

              {/* ── Billing / Unit Wallet ── */}
              {activeTab === "billing" && (
                <div className="space-y-6">
                  <UnitWalletTab
                    unitType="GUILD"
                    unitId={guildId}
                    unitName={guild.name}
                    creditsBalance={(guild as any).credits_balance ?? 0}
                  />
                  <GuildGiveBackReceived guildId={guildId} />
                </div>
              )}

              {/* ── Partnerships ── */}
              {activeTab === "partnerships" && (
                <PartnershipsTab entityType="GUILD" entityId={guildId} isAdmin={true} />
              )}

              {/* ── Website ── */}
              {activeTab === "website" && (
                <div className="space-y-6">
                  <FeedpointVisibilitySettings ownerType="guild" ownerId={guildId} />
                  <WebVisibilityEditor entityTable="guilds" entityId={guildId} />
                  <SiteCodeManager ownerType="guild" ownerId={guildId} />
                </div>
              )}


            </motion.div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ── Helper ──
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">{icon} {title}</h3>
      {children}
    </div>
  );
}

// ── Guild Feature Suggestion Box ──
function GuildFeatureSuggestionBox({ guildId, userId }: { guildId: string; userId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await supabase.from("feature_suggestions").insert({
        user_id: userId || null,
        original_text: text.trim(),
        source: "GUILD",
        status: "NEW",
        user_explicit: true,
        tags: [guildId],
      } as any);
      toast({ title: "Suggestion sent — thank you!" });
      setText("");
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Section title="Suggest a Feature" icon={<Puzzle className="h-5 w-5" />}>
      <p className="text-sm text-muted-foreground mb-3">
        Have an idea to improve this guild's collaboration tools? Share it with the builders.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe a feature you'd like to see…"
        className="min-h-[100px] resize-none"
        maxLength={1000}
      />
      <Button
        onClick={handleSubmit}
        disabled={sending || !text.trim()}
        variant="outline"
        size="sm"
        className="mt-3"
      >
        {sending ? "Sending…" : "Submit suggestion"}
      </Button>
    </Section>
  );
}

/** Services Display settings — toggle visibility of member services with search */
function GuildServicesDisplayTab({ guildId, members }: { guildId: string; members: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const memberUserIds = members.map((m: any) => m.user_id);
  const { data: memberServices } = useQuery({
    queryKey: ["guild-member-services-display", guildId, memberUserIds],
    queryFn: async () => {
      if (memberUserIds.length === 0) return [];
      const { data } = await supabase
        .from("services")
        .select("id, title, description, price_amount, provider_user_id, is_active")
        .in("provider_user_id", memberUserIds)
        .eq("is_deleted", false)
        .eq("is_active", true);
      return data ?? [];
    },
    enabled: memberUserIds.length > 0,
  });

  const providerIds = [...new Set((memberServices ?? []).map((s: any) => s.provider_user_id).filter(Boolean))];
  const { data: providerProfiles } = useQuery({
    queryKey: ["provider-profiles-guild-svc-vis", providerIds],
    queryFn: async () => {
      if (providerIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, name").in("user_id", providerIds as string[]);
      return data ?? [];
    },
    enabled: providerIds.length > 0,
  });
  const profileMap = new Map((providerProfiles ?? []).map((p: any) => [p.user_id, p.name]));

  const { data: visibilityRows, refetch: refetchVis } = useQuery({
    queryKey: ["guild-service-visibility", guildId],
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_service_visibility")
        .select("service_id, is_visible")
        .eq("guild_id", guildId);
      return data ?? [];
    },
  });
  const visMap = new Map((visibilityRows ?? []).map((v: any) => [v.service_id, v.is_visible]));

  const toggleVisibility = async (serviceId: string, currentlyVisible: boolean) => {
    const newVisible = !currentlyVisible;
    const { error } = await supabase
      .from("guild_service_visibility")
      .upsert(
        { guild_id: guildId, service_id: serviceId, is_visible: newVisible } as any,
        { onConflict: "guild_id,service_id" }
      );
    if (error) {
      toast({ title: "Failed to update visibility", variant: "destructive" });
      return;
    }
    refetchVis();
    qc.invalidateQueries({ queryKey: ["services-for-guild", guildId] });
    toast({ title: newVisible ? "Service shown" : "Service hidden" });
  };

  const services = memberServices ?? [];
  const filtered = search.trim()
    ? services.filter((s: any) => {
        const q = search.toLowerCase();
        const providerName = profileMap.get(s.provider_user_id) ?? "";
        return s.title.toLowerCase().includes(q) || providerName.toLowerCase().includes(q);
      })
    : services;

  return (
    <div className="space-y-5 max-w-lg">
      <Section title="Member Services Display" icon={<ShoppingBag className="h-5 w-5" />}>
        <p className="text-sm text-muted-foreground mb-4">
          Services from guild members are eligible to appear on the guild's Services tab. Toggle each service on or off.
        </p>

        {services.length > 3 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services or providers…"
              className="pl-9"
            />
          </div>
        )}

        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No eligible member services found.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services match your search.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((svc: any) => {
              const isVisible = visMap.get(svc.id) !== false;
              return (
                <div key={svc.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{svc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      by {profileMap.get(svc.provider_user_id ?? "") ?? "Unknown"}
                      {svc.price_amount != null && ` · €${svc.price_amount}`}
                    </p>
                  </div>
                  <Button
                    variant={isVisible ? "outline" : "ghost"}
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => toggleVisibility(svc.id, isVisible)}
                  >
                    {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    {isVisible ? "Shown" : "Hidden"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
