import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Trash2, UserPlus, Shield, Users, Briefcase,
  CreditCard, Hash, MapPin, Building2, Globe, Crown, Plus,
  Zap, Clock, Settings, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { CompanySize, QuestStatus, MonetizationType } from "@/types/enums";
import { AttachmentTargetType } from "@/types/enums";
import { AttachmentUpload, AttachmentList } from "@/components/AttachmentUpload";
import type { Quest } from "@/types";
import {
  getCompanyById, companies, topics, territories,
  companyTopics, companyTerritories, users, getUserById,
  getTopicsForCompany, getTerritoriesForCompany,
  getQuestsForCompany, getBookingsForCompany, getServiceById,
  guilds, quests as allQuests,
} from "@/data/mock";
import { formatDistanceToNow } from "date-fns";
import { SocialLinksEdit, normalizeUrl } from "@/components/SocialLinks";

const TABS = [
  { key: "identity", label: "Identity & Profile", icon: Shield },
  { key: "team", label: "Team & Permissions", icon: Users },
  { key: "quests", label: "Quests", icon: Zap },
  { key: "activity", label: "Services & Bookings", icon: Briefcase },
  { key: "documents", label: "Documents", icon: Briefcase },
  { key: "billing", label: "Billing", icon: CreditCard },
];

export default function CompanySettings() {
  const { id } = useParams<{ id: string }>();
  const company = getCompanyById(id!);
  const currentUser = useCurrentUser();

  if (!company) return <PageShell><p>Company not found.</p></PageShell>;
  if (currentUser.id !== company.contactUserId) {
    return <PageShell><p>You must be the company contact to access settings.</p></PageShell>;
  }

  return <CompanySettingsInner companyId={company.id} />;
}

function CompanySettingsInner({ companyId }: { companyId: string }) {
  const company = getCompanyById(companyId)!;
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  const activeTab = searchParams.get("tab") || "identity";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // ── Identity state ──
  const [name, setName] = useState(company.name);
  const [logoUrl, setLogoUrl] = useState(company.logoUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(company.bannerUrl ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [sector, setSector] = useState(company.sector ?? "");
  const [size, setSize] = useState<CompanySize>(company.size ?? CompanySize.OTHER);
  const [websiteUrl, setWebsiteUrl] = useState(company.websiteUrl ?? "");
  const [companyTwitterUrl, setCompanyTwitterUrl] = useState(company.twitterUrl ?? "");
  const [companyLinkedinUrl, setCompanyLinkedinUrl] = useState(company.linkedinUrl ?? "");
  const [companyInstagramUrl, setCompanyInstagramUrl] = useState(company.instagramUrl ?? "");

  const currentTopicIds = companyTopics.filter((ct) => ct.companyId === companyId).map((ct) => ct.topicId);
  const currentTerritoryIds = companyTerritories.filter((ct) => ct.companyId === companyId).map((ct) => ct.territoryId);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(currentTopicIds);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(currentTerritoryIds);

  // ── Team state ──
  const [newContactId, setNewContactId] = useState("");

  // ── Quest creation state ──
  const [questOpen, setQuestOpen] = useState(false);
  const [qTitle, setQTitle] = useState("");
  const [qDesc, setQDesc] = useState("");
  const [qGuildId, setQGuildId] = useState("");
  const [qRewardXp, setQRewardXp] = useState("100");

  // ── Data ──
  const companyQuests = getQuestsForCompany(companyId);
  const companyBookings = getBookingsForCompany(companyId);
  const contact = company.contactUserId ? getUserById(company.contactUserId) : null;

  // ── Handlers ──
  const toggleTopic = (id: string) => setSelectedTopics((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleTerritory = (id: string) => setSelectedTerritories((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleSaveIdentity = () => {
    const c = companies.find((c) => c.id === companyId);
    if (c) {
      c.name = name.trim() || c.name;
      c.logoUrl = logoUrl.trim() || undefined;
      c.bannerUrl = bannerUrl.trim() || undefined;
      c.description = description.trim() || undefined;
      c.sector = sector.trim() || undefined;
      c.size = size;
      c.websiteUrl = normalizeUrl(websiteUrl) ?? undefined;
      c.twitterUrl = normalizeUrl(companyTwitterUrl) ?? undefined;
      c.linkedinUrl = normalizeUrl(companyLinkedinUrl) ?? undefined;
      c.instagramUrl = normalizeUrl(companyInstagramUrl) ?? undefined;
      c.updatedAt = new Date().toISOString();
    }
    // Update topic relations
    const existing = companyTopics.filter((ct) => ct.companyId === companyId);
    existing.forEach((ct) => { const i = companyTopics.indexOf(ct); if (i !== -1) companyTopics.splice(i, 1); });
    selectedTopics.forEach((topicId, i) => { companyTopics.push({ id: `ct-${Date.now()}-${i}`, companyId, topicId }); });
    // Update territory relations
    const existingT = companyTerritories.filter((ct) => ct.companyId === companyId);
    existingT.forEach((ct) => { const i = companyTerritories.indexOf(ct); if (i !== -1) companyTerritories.splice(i, 1); });
    selectedTerritories.forEach((territoryId, i) => { companyTerritories.push({ id: `ctr-${Date.now()}-${i}`, companyId, territoryId }); });
    toast({ title: "Company profile updated!" });
  };

  const handleChangeContact = () => {
    if (!newContactId) return;
    const c = companies.find((c) => c.id === companyId);
    if (c) { c.contactUserId = newContactId; c.updatedAt = new Date().toISOString(); }
    setNewContactId("");
    rerender();
    toast({ title: "Contact changed!" });
  };

  const createQuest = () => {
    if (!qTitle.trim() || !qGuildId) return;
    const quest: Quest = {
      id: `q-${Date.now()}`, title: qTitle.trim(), description: qDesc.trim() || undefined,
      status: QuestStatus.OPEN, monetizationType: MonetizationType.PAID,
      rewardXp: Number(qRewardXp) || 100, isFeatured: false,
      createdByUserId: currentUser.id, guildId: qGuildId, companyId,
    };
    allQuests.push(quest);
    setQuestOpen(false); setQTitle(""); setQDesc(""); setQGuildId(""); setQRewardXp("100");
    rerender();
    toast({ title: "Quest created!" });
  };

  // ── Booking stats ──
  const serviceUsage = new Map<string, number>();
  const providerUsage = new Map<string, number>();
  companyBookings.forEach((b) => {
    serviceUsage.set(b.serviceId, (serviceUsage.get(b.serviceId) || 0) + 1);
    if (b.providerUserId) providerUsage.set(b.providerUserId, (providerUsage.get(b.providerUserId) || 0) + 1);
  });

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/companies/${companyId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to company</Link>
      </Button>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {company.logoUrl && <img src={company.logoUrl} alt="" className="h-10 w-10 rounded-lg" />}
          <div>
            <h1 className="font-display text-2xl font-bold">Company Settings</h1>
            <p className="text-sm text-muted-foreground">{company.name}</p>
          </div>
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
                  <Section title="Company Identity" icon={<Building2 className="h-5 w-5" />}>
                    <div className="space-y-4">
                      <div><label className="text-sm font-medium mb-1 block">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
                      <ImageUpload label="Logo" currentImageUrl={logoUrl || undefined} onChange={(url) => setLogoUrl(url ?? "")} aspectRatio="1/1" description="Square logo, 256×256 recommended" />
                      <ImageUpload label="Banner (optional)" currentImageUrl={bannerUrl || undefined} onChange={(url) => setBannerUrl(url ?? "")} aspectRatio="16/9" description="Wide banner, 1200×400 recommended" />
                      <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="resize-none min-h-[120px]" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium mb-1 block">Sector</label><Input value={sector} onChange={(e) => setSector(e.target.value)} maxLength={50} /></div>
                        <div><label className="text-sm font-medium mb-1 block">Size</label>
                          <Select value={size} onValueChange={(v) => setSize(v as CompanySize)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={CompanySize.MICRO}>Micro</SelectItem>
                              <SelectItem value={CompanySize.SME}>SME</SelectItem>
                              <SelectItem value={CompanySize.LARGE}>Large</SelectItem>
                              <SelectItem value={CompanySize.OTHER}>Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><label className="text-sm font-medium mb-1 block">Website URL</label><Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" /></div>
                    </div>
                  </Section>

                  <Separator />

                  <Section title="Topics" icon={<Hash className="h-5 w-5" />}>
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

                  <Separator />

                  <Section title="Links & Social" icon={<Globe className="h-5 w-5" />}>
                    <SocialLinksEdit
                      data={{ websiteUrl, twitterUrl: companyTwitterUrl, linkedinUrl: companyLinkedinUrl, instagramUrl: companyInstagramUrl }}
                      onChange={(key, value) => {
                        if (key === "websiteUrl") setWebsiteUrl(value);
                        else if (key === "twitterUrl") setCompanyTwitterUrl(value);
                        else if (key === "linkedinUrl") setCompanyLinkedinUrl(value);
                        else if (key === "instagramUrl") setCompanyInstagramUrl(value);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Links are saved when you click "Save identity" above.</p>
                  </Section>
                </div>
              )}

              {/* ── Team & Permissions ── */}
              {activeTab === "team" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Contact Person" icon={<Users className="h-5 w-5" />}>
                    {contact && (
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 mb-4">
                        <Avatar className="h-10 w-10"><AvatarImage src={contact.avatarUrl} /><AvatarFallback>{contact.name[0]}</AvatarFallback></Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.email}</p>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-0"><Crown className="h-3 w-3 mr-1" /> Contact</Badge>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mb-3">Transfer the company contact role to another user:</p>
                    <div className="flex gap-2">
                      <Select value={newContactId} onValueChange={setNewContactId}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select a user" /></SelectTrigger>
                        <SelectContent>
                          {users.filter((u) => u.id !== company.contactUserId).map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleChangeContact} disabled={!newContactId}>Transfer</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">⚠ You will lose access to these settings after transferring.</p>
                  </Section>
                </div>
              )}

              {/* ── Quests ── */}
              {activeTab === "quests" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Section title={`Company Quests (${companyQuests.length})`} icon={<Zap className="h-5 w-5" />}><span /></Section>
                    <Dialog open={questOpen} onOpenChange={setQuestOpen}>
                      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Quest</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Create Quest for {company.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={qTitle} onChange={(e) => setQTitle(e.target.value)} maxLength={120} /></div>
                          <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={qDesc} onChange={(e) => setQDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
                          <div><label className="text-sm font-medium mb-1 block">Guild</label>
                            <Select value={qGuildId} onValueChange={setQGuildId}>
                              <SelectTrigger><SelectValue placeholder="Select guild" /></SelectTrigger>
                              <SelectContent>{guilds.filter((g) => g.isApproved).map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div><label className="text-sm font-medium mb-1 block">Reward XP</label><Input type="number" value={qRewardXp} onChange={(e) => setQRewardXp(e.target.value)} min={0} /></div>
                          <Button onClick={createQuest} disabled={!qTitle.trim() || !qGuildId} className="w-full">Create Quest</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {companyQuests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No quests posted by this company yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {companyQuests.map((quest) => (
                        <Link key={quest.id} to={`/quests/${quest.id}`} className="block rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-display font-semibold">{quest.title}</h4>
                            <span className="flex items-center gap-1 text-sm font-semibold text-primary"><Zap className="h-3.5 w-3.5" /> {quest.rewardXp} XP</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{quest.description}</p>
                          <div className="flex gap-1.5 mt-2">
                            <Badge variant="outline" className="text-xs capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
                            <Badge variant="secondary" className="text-xs capitalize">{quest.monetizationType.toLowerCase()}</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Services & Bookings ── */}
              {activeTab === "activity" && (
                <div className="space-y-6">
                  <Section title="Booking Activity" icon={<Briefcase className="h-5 w-5" />}>
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                      <div className="rounded-lg border border-border bg-card p-4 text-center">
                        <p className="text-2xl font-bold text-primary">{companyBookings.length}</p>
                        <p className="text-sm text-muted-foreground">Total bookings</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-4 text-center">
                        <p className="text-2xl font-bold text-primary">{serviceUsage.size}</p>
                        <p className="text-sm text-muted-foreground">Services used</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-4 text-center">
                        <p className="text-2xl font-bold text-primary">{providerUsage.size}</p>
                        <p className="text-sm text-muted-foreground">Providers engaged</p>
                      </div>
                    </div>
                  </Section>

                  <Section title="Bookings" icon={<Clock className="h-5 w-5" />}>
                    {companyBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No bookings yet.</p>
                    ) : (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium">Service</th>
                              <th className="text-left px-4 py-2 font-medium">Provider</th>
                              <th className="text-left px-4 py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {companyBookings.map((b) => {
                              const svc = getServiceById(b.serviceId);
                              const provider = b.providerUserId ? getUserById(b.providerUserId) : null;
                              return (
                                <tr key={b.id} className="border-t border-border">
                                  <td className="px-4 py-3">
                                    <Link to={`/services/${b.serviceId}`} className="hover:text-primary transition-colors">{svc?.title ?? "—"}</Link>
                                  </td>
                                  <td className="px-4 py-3">
                                    {provider ? (
                                      <Link to={`/users/${provider.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <Avatar className="h-6 w-6"><AvatarImage src={provider.avatarUrl} /><AvatarFallback>{provider.name[0]}</AvatarFallback></Avatar>
                                        {provider.name}
                                      </Link>
                                    ) : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="px-4 py-3"><Badge variant="outline" className="capitalize text-xs">{b.status.toLowerCase()}</Badge></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {/* ── Documents ── */}
              {activeTab === "documents" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Company Documents" icon={<Briefcase className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">Upload documents, contracts, and resources for your company.</p>
                    <AttachmentList targetType={AttachmentTargetType.COMPANY} targetId={company.id} />
                    <div className="mt-4">
                      <AttachmentUpload targetType={AttachmentTargetType.COMPANY} targetId={company.id} />
                    </div>
                  </Section>
                </div>
              )}

              {/* ── Billing ── */}
              {activeTab === "billing" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Company Plan & Billing" icon={<CreditCard className="h-5 w-5" />}>
                    <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                      <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <h4 className="font-display text-lg font-semibold mb-1">Coming soon</h4>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Company-specific subscription plans, billing management, and team seats will be available here.
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

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">{icon} {title}</h3>
      {children}
    </div>
  );
}
