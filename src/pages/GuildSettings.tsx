import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Trash2, UserPlus, ShieldCheck, Shield,
  Users, Briefcase, Settings, CreditCard, Pencil, Plus, Euro,
  Clock, Video, ToggleLeft, ToggleRight, Crown, Hash, MapPin,
  AlertCircle, Check, Loader2,
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
import { GuildType, GuildMemberRole, OnlineLocationType } from "@/types/enums";
import { AttachmentTargetType } from "@/types/enums";
import { AttachmentUpload, AttachmentList } from "@/components/AttachmentUpload";
import type { Service } from "@/types";
import {
  getGuildById, guilds, topics, territories, guildTopics, guildTerritories,
  guildMembers, users, getUserById, getMembersForGuild, getServicesForGuild, services,
} from "@/data/mock";
import { formatDistanceToNow } from "date-fns";
import { SocialLinksEdit, normalizeUrl } from "@/components/SocialLinks";

const TABS = [
  { key: "identity", label: "Identity & Profile", icon: Shield },
  { key: "members", label: "Membership & Roles", icon: Users },
  { key: "services", label: "Services", icon: Briefcase },
  { key: "defaults", label: "Quests & Pods Defaults", icon: Settings },
  { key: "documents", label: "Documents", icon: Briefcase },
  { key: "billing", label: "Billing", icon: CreditCard },
];

export default function GuildSettings() {
  const { id } = useParams<{ id: string }>();
  const guild = getGuildById(id!);
  const currentUser = useCurrentUser();

  if (!guild) return <PageShell><p>Guild not found.</p></PageShell>;

  const currentMembership = guildMembers.find(
    (gm) => gm.guildId === guild.id && gm.userId === currentUser.id
  );
  if (currentMembership?.role !== GuildMemberRole.ADMIN) {
    return <PageShell><p>You must be an admin of this guild to access settings.</p></PageShell>;
  }

  return <GuildSettingsInner guildId={guild.id} />;
}

function GuildSettingsInner({ guildId }: { guildId: string }) {
  const guild = getGuildById(guildId)!;
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "identity";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // ── Identity state ──
  const [name, setName] = useState(guild.name);
  const [logoUrl, setLogoUrl] = useState(guild.logoUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(guild.bannerUrl ?? "");
  const [description, setDescription] = useState(guild.description ?? "");
  const [type, setType] = useState<GuildType>(guild.type);

  const currentTopicIds = guildTopics.filter((gt) => gt.guildId === guildId).map((gt) => gt.topicId);
  const currentTerritoryIds = guildTerritories.filter((gt) => gt.guildId === guildId).map((gt) => gt.territoryId);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(currentTopicIds);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(currentTerritoryIds);

  // ── Members state ──
  const [members, setMembers] = useState(() => getMembersForGuild(guildId));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");

  // ── Services state ──
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);
  const guildServices = getServicesForGuild(guildId);
  const [createSvcOpen, setCreateSvcOpen] = useState(false);
  const [svcTitle, setSvcTitle] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcDuration, setSvcDuration] = useState("60");
  const [svcPrice, setSvcPrice] = useState("0");
  const [svcLocationType, setSvcLocationType] = useState<OnlineLocationType>(OnlineLocationType.JITSI);
  const [svcImageUrl, setSvcImageUrl] = useState<string | undefined>();

  // ── Defaults state ──
  const [podAccessPolicy, setPodAccessPolicy] = useState<"OPEN" | "GUILD_MEMBERS" | "INVITE_ONLY">("OPEN");
  const [defaultQuestTopics, setDefaultQuestTopics] = useState<string[]>([]);
  const [defaultQuestTerritories, setDefaultQuestTerritories] = useState<string[]>([]);

  // ── Handlers ──
  const toggleTopic = (topicId: string) =>
    setSelectedTopics((prev) => prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]);
  const toggleTerritory = (territoryId: string) =>
    setSelectedTerritories((prev) => prev.includes(territoryId) ? prev.filter((id) => id !== territoryId) : [...prev, territoryId]);
  const toggleDefaultQuestTopic = (id: string) =>
    setDefaultQuestTopics((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleDefaultQuestTerritory = (id: string) =>
    setDefaultQuestTerritories((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleSaveIdentity = () => {
    const idx = guilds.findIndex((g) => g.id === guildId);
    if (idx !== -1) {
      guilds[idx] = { ...guilds[idx], name: name.trim() || guild.name, logoUrl: logoUrl.trim() || undefined, bannerUrl: bannerUrl.trim() || undefined, description: description.trim() || undefined, type };
    }
    // Update topic relations
    const existing = guildTopics.filter((gt) => gt.guildId === guildId);
    existing.forEach((gt) => { const i = guildTopics.indexOf(gt); if (i !== -1) guildTopics.splice(i, 1); });
    selectedTopics.forEach((topicId, i) => { guildTopics.push({ id: `gt-${Date.now()}-${i}`, guildId, topicId }); });
    // Update territory relations
    const existingT = guildTerritories.filter((gt) => gt.guildId === guildId);
    existingT.forEach((gt) => { const i = guildTerritories.indexOf(gt); if (i !== -1) guildTerritories.splice(i, 1); });
    selectedTerritories.forEach((territoryId, i) => { guildTerritories.push({ id: `gtr-${Date.now()}-${i}`, guildId, territoryId }); });
    toast({ title: "Guild identity updated!" });
  };

  const inviteMember = () => {
    if (!inviteUserId) return;
    const already = guildMembers.some((gm) => gm.guildId === guildId && gm.userId === inviteUserId);
    if (already) { toast({ title: "Already a member", variant: "destructive" }); return; }
    const newMember = { id: `gm-${Date.now()}`, guildId, userId: inviteUserId, role: GuildMemberRole.MEMBER, joinedAt: new Date().toISOString() };
    guildMembers.push(newMember);
    setMembers((prev) => [...prev, { ...newMember, user: getUserById(inviteUserId) }]);
    setInviteUserId(""); setInviteOpen(false);
    toast({ title: "Member added!" });
  };

  const toggleMemberRole = (memberId: string) => {
    const gm = guildMembers.find((m) => m.id === memberId);
    if (!gm) return;
    const admins = guildMembers.filter((m) => m.guildId === guildId && m.role === GuildMemberRole.ADMIN);
    if (gm.role === GuildMemberRole.ADMIN && admins.length <= 1) {
      toast({ title: "Cannot demote", description: "At least one admin must exist.", variant: "destructive" });
      return;
    }
    gm.role = gm.role === GuildMemberRole.ADMIN ? GuildMemberRole.MEMBER : GuildMemberRole.ADMIN;
    setMembers(getMembersForGuild(guildId));
    toast({ title: `Role changed to ${gm.role.toLowerCase()}` });
  };

  const removeMember = (memberId: string) => {
    const gm = guildMembers.find((m) => m.id === memberId);
    if (!gm || gm.userId === currentUser.id) return;
    if (gm.role === GuildMemberRole.ADMIN) {
      const admins = guildMembers.filter((m) => m.guildId === guildId && m.role === GuildMemberRole.ADMIN);
      if (admins.length <= 1) { toast({ title: "Cannot remove the last admin", variant: "destructive" }); return; }
    }
    const idx = guildMembers.indexOf(gm);
    if (idx !== -1) guildMembers.splice(idx, 1);
    setMembers(getMembersForGuild(guildId));
    toast({ title: "Member removed" });
  };

  const nonMembers = users.filter((u) => !guildMembers.some((gm) => gm.guildId === guildId && gm.userId === u.id));

  const createGuildService = () => {
    if (!svcTitle.trim()) return;
    const newSvc: Service = {
      id: `svc-${Date.now()}`, title: svcTitle.trim(), description: svcDesc.trim(),
      providerGuildId: guildId, durationMinutes: Number(svcDuration) || 60,
      priceAmount: Number(svcPrice) || 0, priceCurrency: "EUR",
      onlineLocationType: svcLocationType, isActive: true, imageUrl: svcImageUrl,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    services.push(newSvc);
    setSvcTitle(""); setSvcDesc(""); setSvcDuration("60"); setSvcPrice("0");
    setSvcLocationType(OnlineLocationType.JITSI); setSvcImageUrl(undefined);
    setCreateSvcOpen(false); rerender();
    toast({ title: "Guild service created" });
  };

  const toggleServiceActive = (svc: Service) => {
    svc.isActive = !svc.isActive;
    svc.updatedAt = new Date().toISOString();
    rerender();
    toast({ title: svc.isActive ? "Service resumed" : "Service paused" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/guilds/${guildId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to guild</Link>
      </Button>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {guild.logoUrl && <img src={guild.logoUrl} className="h-10 w-10 rounded-lg" alt="" />}
          <div>
            <h1 className="font-display text-2xl font-bold">Guild Settings</h1>
            <p className="text-sm text-muted-foreground">{guild.name}</p>
          </div>
          {guild.isApproved ? (
            <Badge className="bg-primary/10 text-primary border-0 ml-auto"><ShieldCheck className="h-3 w-3 mr-1" /> Approved</Badge>
          ) : (
            <Badge variant="outline" className="ml-auto"><AlertCircle className="h-3 w-3 mr-1" /> Pending approval</Badge>
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
                      <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="resize-none min-h-[120px]" /></div>
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
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card max-h-48 overflow-y-auto">
                      {topics.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox checked={selectedTopics.includes(t.id)} onCheckedChange={() => toggleTopic(t.id)} />
                          <span className="text-sm">{t.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTopics.length} selected</p>
                  </Section>

                  <Section title="Territories" icon={<MapPin className="h-5 w-5" />}>
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card">
                      {territories.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox checked={selectedTerritories.includes(t.id)} onCheckedChange={() => toggleTerritory(t.id)} />
                          <span className="text-sm">{t.name} <span className="text-muted-foreground text-xs">({t.level.toLowerCase()})</span></span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTerritories.length} selected</p>
                  </Section>

                  <Button onClick={handleSaveIdentity} className="w-full"><Save className="h-4 w-4 mr-2" /> Save identity</Button>
                </div>
              )}

              {/* ── Membership & Roles ── */}
              {activeTab === "members" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Section title={`Members (${members.length})`} icon={<Users className="h-5 w-5" />}><span /></Section>
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                      <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Add member</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-2">
                          <Select value={inviteUserId} onValueChange={setInviteUserId}>
                            <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                            <SelectContent>
                              {nonMembers.map((u) => (
                                <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={inviteMember} disabled={!inviteUserId} className="w-full">Add to guild</Button>
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
                        {members.map((m) => (
                          <tr key={m.id} className="border-t border-border">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8"><AvatarImage src={m.user?.avatarUrl} /><AvatarFallback>{m.user?.name?.[0]}</AvatarFallback></Avatar>
                                <div>
                                  <p className="font-medium">{m.user?.name}</p>
                                  <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={m.role === GuildMemberRole.ADMIN ? "default" : "outline"} className="capitalize text-xs">
                                {m.role === GuildMemberRole.ADMIN && <Crown className="h-3 w-3 mr-1" />}
                                {m.role.toLowerCase()}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleMemberRole(m.id)}
                                  title={m.role === GuildMemberRole.ADMIN ? "Demote to member" : "Promote to admin"}>
                                  {m.role === GuildMemberRole.ADMIN ? "Demote" : "Promote"}
                                </Button>
                                {m.userId !== currentUser.id && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => removeMember(m.id)}>
                                    <Trash2 className="h-3 w-3" />
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
                            <div><label className="text-sm font-medium mb-1 block">Price (€)</label><Input type="number" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} min={0} /></div>
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
                      {guildServices.map((svc) => (
                        <div key={svc.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                          <div>
                            <Link to={`/services/${svc.id}`} className="text-sm font-medium hover:text-primary transition-colors">{svc.title}</Link>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{svc.durationMinutes} min</span>
                              <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{(!svc.priceAmount || svc.priceAmount === 0) ? "Free" : `€${svc.priceAmount}`}</span>
                              <span className="flex items-center gap-1"><Video className="h-3 w-3" />{svc.onlineLocationType?.toLowerCase()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={svc.isActive ? "bg-primary/10 text-primary border-0" : "bg-muted text-muted-foreground border-0"}>
                              {svc.isActive ? "Active" : "Paused"}
                            </Badge>
                            <Button size="sm" variant="ghost" onClick={() => toggleServiceActive(svc)}>
                              {svc.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                      {topics.map((t) => (
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
                      {territories.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox checked={defaultQuestTerritories.includes(t.id)} onCheckedChange={() => toggleDefaultQuestTerritory(t.id)} />
                          <span className="text-sm">{t.name} <span className="text-muted-foreground text-xs">({t.level.toLowerCase()})</span></span>
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

              {/* ── Billing ── */}
              {activeTab === "billing" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Guild Plan & Billing" icon={<CreditCard className="h-5 w-5" />}>
                    <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                      <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <h4 className="font-display text-lg font-semibold mb-1">Coming soon</h4>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Guild-level subscription plans, billing management, and payment processing will be available here.
                      </p>
                    </div>
                  </Section>
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
