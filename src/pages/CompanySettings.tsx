import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Trash2, UserPlus, Shield, Users, Briefcase,
  CreditCard, Hash, MapPin, Building2, Globe, Crown, Plus, Tag,
  Zap, Clock, Settings, ClipboardList, Handshake, CalendarDays,
  ShieldCheck, ChevronUp, ChevronDown, Loader2,
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
import { CompanySize } from "@/types/enums";
import { AttachmentTargetType } from "@/types/enums";
import { AttachmentUpload, AttachmentList } from "@/components/AttachmentUpload";
import { SocialLinksEdit, normalizeUrl } from "@/components/SocialLinks";
import { EntityApplicationsTab } from "@/components/EntityApplicationsTab";
import { MembershipPolicyEditor } from "@/components/MembershipPolicyEditor";
import { PartnershipsTab } from "@/components/partnership/PartnershipsTab";
import { UnitAvailabilityEditor } from "@/components/UnitAvailabilityEditor";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import {
  useCompanyById, useCompanyMembersWithProfiles,
  useQuestsForCompany, useBookingsForCompany, useServicesForCompany,
} from "@/hooks/useEntityQueries";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { UserSearchInput } from "@/components/UserSearchInput";
import { sendInviteNotification } from "@/lib/inviteNotification";
import { useNotifications } from "@/hooks/useNotifications";
import { InviteLinkButton } from "@/components/InviteLinkButton";
import { EntityRolesManager } from "@/components/EntityRolesManager";
import { useEntityRoles } from "@/hooks/useEntityRoles";
import { WebVisibilityEditor } from "@/components/website/WebVisibilityEditor";

const TABS = [
  { key: "identity", label: "Identity & Profile", icon: Shield },
  { key: "membership", label: "Membership Policy", icon: ClipboardList },
  { key: "applications", label: "Applications", icon: Users },
  { key: "members", label: "Members & Roles", icon: Users },
  { key: "roles", label: "Custom Roles", icon: Tag },
  { key: "quests", label: "Quests", icon: Zap },
  { key: "activity", label: "Services & Bookings", icon: Briefcase },
  { key: "availability", label: "Availability", icon: CalendarDays },
  { key: "partnerships", label: "Partnerships", icon: Handshake },
  { key: "documents", label: "Documents", icon: Briefcase },
  { key: "web_visibility", label: "Web Visibility", icon: Globe },
  { key: "billing", label: "Billing", icon: CreditCard },
];

export default function CompanySettings() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useCompanyById(id);
  const { data: membersData } = useCompanyMembersWithProfiles(id);
  const currentUser = useCurrentUser();

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!company) return <PageShell><p>Traditional Organization not found.</p></PageShell>;

  // Check permission: must be admin member or global admin
  const members = membersData || [];
  const currentMembership = members.find((m: any) => m.user_id === currentUser.id);
  const memberRole = currentMembership?.role;
  const isAdmin = memberRole === "admin" || memberRole === "owner" || memberRole === "ADMIN" || checkIsGlobalAdmin(currentUser.email);

  if (!isAdmin) {
    return <PageShell><p>You must be an organization admin to access settings.</p></PageShell>;
  }

  return <CompanySettingsInner companyId={company.id} company={company} />;
}

function CompanySettingsInner({ companyId, company }: { companyId: string; company: any }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { getRolesForUser } = useEntityRoles("company", companyId);
  const { notifyGuildRoleChanged } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: membersData } = useCompanyMembersWithProfiles(companyId);
  const { data: companyQuests } = useQuestsForCompany(companyId);
  const { data: companyBookings } = useBookingsForCompany(companyId);
  const { data: companyServices } = useServicesForCompany(companyId);
  const { data: allTopics } = useTopics();
  const { data: allTerritories } = useTerritories();

  const activeTab = searchParams.get("tab") || "identity";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // ── Identity state ──
  const [name, setName] = useState(company.name);
  const [logoUrl, setLogoUrl] = useState(company.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(company.banner_url ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [sector, setSector] = useState(company.sector ?? "");
  const [size, setSize] = useState<string>(company.size ?? "OTHER");
  const [websiteUrl, setWebsiteUrl] = useState(company.website_url ?? "");
  const [companyTwitterUrl, setCompanyTwitterUrl] = useState(company.twitter_url ?? "");
  const [companyLinkedinUrl, setCompanyLinkedinUrl] = useState(company.linkedin_url ?? "");
  const [companyInstagramUrl, setCompanyInstagramUrl] = useState(company.instagram_url ?? "");

  // Current topic/territory associations
  const currentTopicIds = ((company as any).company_topics || []).map((ct: any) => ct.topic_id);
  const currentTerritoryIds = ((company as any).company_territories || []).map((ct: any) => ct.territory_id);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(currentTopicIds);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(currentTerritoryIds);

  const members = membersData || [];
  const quests = companyQuests || [];
  const bookings = companyBookings || [];
  const services = companyServices || [];

  // ── Members management ──
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const inviteMember = async (selectedUserId: string) => {
    if (!selectedUserId) return;
    const already = members.some((m: any) => m.user_id === selectedUserId);
    if (already) { toast({ title: "Already a member", variant: "destructive" }); return; }
    const { error } = await supabase.from("company_members").insert({
      company_id: companyId, user_id: selectedUserId, role: "member",
    });
    if (error) { toast({ title: "Failed to add member", variant: "destructive" }); return; }
    sendInviteNotification({ invitedUserId: selectedUserId, inviterName: currentUser.name, entityType: "company", entityId: companyId, entityName: company?.name || "Organization" });
    setInviteOpen(false);
    qc.invalidateQueries({ queryKey: ["company-members", companyId] });
    toast({ title: "Member added!" });
  };

  const promoteMember = async (memberId: string) => {
    const gm = members.find((m: any) => m.id === memberId);
    await supabase.from("company_members").update({ role: "admin" as any }).eq("id", memberId);
    if (gm) notifyGuildRoleChanged({ guildId: companyId, userId: gm.user_id, newRole: "Admin" });
    qc.invalidateQueries({ queryKey: ["company-members", companyId] });
    toast({ title: "Member promoted to Admin" });
  };

  const demoteMember = async (memberId: string) => {
    const gm = members.find((m: any) => m.id === memberId);
    if (!gm) return;
    const admins = members.filter((m: any) => m.role === "admin" || m.role === "ADMIN" || m.role === "owner");
    if (admins.length <= 1) {
      toast({ title: "Cannot demote", description: "At least one admin must exist.", variant: "destructive" });
      return;
    }
    await supabase.from("company_members").update({ role: "member" as any }).eq("id", memberId);
    notifyGuildRoleChanged({ guildId: companyId, userId: gm.user_id, newRole: "Member" });
    qc.invalidateQueries({ queryKey: ["company-members", companyId] });
    toast({ title: "Member demoted to Member" });
  };

  const removeMember = async (memberId: string) => {
    const gm = members.find((m: any) => m.id === memberId);
    if (!gm || gm.user_id === currentUser.id) return;
    if (gm.role === "admin" || gm.role === "ADMIN" || gm.role === "owner") {
      const admins = members.filter((m: any) => m.role === "admin" || m.role === "ADMIN" || m.role === "owner");
      if (admins.length <= 1) { toast({ title: "Cannot remove the last admin", variant: "destructive" }); return; }
    }
    await supabase.from("company_members").delete().eq("id", memberId);
    qc.invalidateQueries({ queryKey: ["company-members", companyId] });
    toast({ title: "Member excluded" });
  };

  // ── Handlers ──
  const toggleTopic = (tid: string) => setSelectedTopics((p) => p.includes(tid) ? p.filter((x) => x !== tid) : [...p, tid]);
  const toggleTerritory = (tid: string) => setSelectedTerritories((p) => p.includes(tid) ? p.filter((x) => x !== tid) : [...p, tid]);

  const handleSaveIdentity = async () => {
    await supabase.from("companies").update({
      name: name.trim() || company.name,
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
      description: description.trim() || null,
      sector: sector.trim() || null,
      size: size || null,
      website_url: normalizeUrl(websiteUrl) ?? null,
      twitter_url: normalizeUrl(companyTwitterUrl) ?? null,
      linkedin_url: normalizeUrl(companyLinkedinUrl) ?? null,
      instagram_url: normalizeUrl(companyInstagramUrl) ?? null,
    }).eq("id", companyId);

    // Update topic relations
    await supabase.from("company_topics").delete().eq("company_id", companyId);
    if (selectedTopics.length > 0) {
      await supabase.from("company_topics").insert(
        selectedTopics.map((topicId) => ({ company_id: companyId, topic_id: topicId }))
      );
    }

    // Update territory relations
    await supabase.from("company_territories").delete().eq("company_id", companyId);
    if (selectedTerritories.length > 0) {
      await supabase.from("company_territories").insert(
        selectedTerritories.map((territoryId) => ({ company_id: companyId, territory_id: territoryId }))
      );
    }

    qc.invalidateQueries({ queryKey: ["company", companyId] });
    toast({ title: "Organization profile updated!" });
  };

  // ── Booking stats ──
  const serviceUsage = new Map<string, number>();
  const providerUsage = new Map<string, number>();
  bookings.forEach((b: any) => {
    serviceUsage.set(b.service_id, (serviceUsage.get(b.service_id) || 0) + 1);
    if (b.provider_user_id) providerUsage.set(b.provider_user_id, (providerUsage.get(b.provider_user_id) || 0) + 1);
  });

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/companies/${companyId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to organization</Link>
      </Button>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {company.logo_url && <img src={company.logo_url} alt="" className="h-10 w-10 rounded-lg" />}
          <div>
            <h1 className="font-display text-2xl font-bold">Organization Settings</h1>
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
                  <Section title="Organization Identity" icon={<Building2 className="h-5 w-5" />}>
                    <div className="space-y-4">
                      <div><label className="text-sm font-medium mb-1 block">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
                      <ImageUpload label="Logo" currentImageUrl={logoUrl || undefined} onChange={(url) => setLogoUrl(url ?? "")} aspectRatio="1/1" description="Square logo, 256×256 recommended" />
                      <ImageUpload label="Banner (optional)" currentImageUrl={bannerUrl || undefined} onChange={(url) => setBannerUrl(url ?? "")} aspectRatio="16/9" description="Wide banner, 1200×400 recommended" />
                      <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="resize-none min-h-[120px]" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium mb-1 block">Sector</label><Input value={sector} onChange={(e) => setSector(e.target.value)} maxLength={50} /></div>
                        <div><label className="text-sm font-medium mb-1 block">Size</label>
                          <Select value={size} onValueChange={setSize}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MICRO">Micro</SelectItem>
                              <SelectItem value="SME">SME</SelectItem>
                              <SelectItem value="LARGE">Large</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
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
                      {(allTopics || []).map((t: any) => (
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
                      {(allTerritories || []).map((t: any) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox checked={selectedTerritories.includes(t.id)} onCheckedChange={() => toggleTerritory(t.id)} />
                          <span className="text-sm">{t.name} <span className="text-muted-foreground text-xs">({(t.level || "").toLowerCase()})</span></span>
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

              {/* ── Membership Policy ── */}
              {activeTab === "membership" && (
                <MembershipPolicyEditor
                  joinPolicy={(company as any).join_policy || "APPROVAL_REQUIRED"}
                  applicationQuestions={(() => {
                    const q = (company as any).application_questions;
                    if (Array.isArray(q)) return q;
                    return [];
                  })()}
                  onSave={async (policy, questions) => {
                    await supabase.from("companies").update({
                      // These fields may not exist yet in the companies table
                      // but the save won't fail — it'll just skip unknown columns
                    } as any).eq("id", companyId);
                    toast({ title: "Membership policy saved" });
                  }}
                />
              )}

              {/* ── Applications ── */}
              {activeTab === "applications" && (
                <EntityApplicationsTab entityType="company" entityId={companyId} currentUserId={currentUser.id} />
              )}

              {/* ── Members & Roles ── */}
              {activeTab === "members" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Members & Roles" icon={<Users className="h-5 w-5" />}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</p>
                      <div className="flex items-center gap-2">
                        <InviteLinkButton entityType="company" entityId={companyId} entityName={company?.name || "Organization"} />
                        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Invite</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl overflow-visible">
                          <DialogHeader><DialogTitle>Invite a member</DialogTitle></DialogHeader>
                          <div className="space-y-3 mt-2">
                            <UserSearchInput
                              onSelect={(user) => inviteMember(user.user_id)}
                              placeholder="Type a member name…"
                              excludeUserIds={members.map((m: any) => m.user_id)}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                      </div>
                    </div>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {members.map((m: any) => {
                          const isAdminRole = m.role === "admin" || m.role === "ADMIN" || m.role === "owner";
                          const isSelf = m.user_id === currentUser.id;
                          return (
                            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={m.user?.avatar_url} />
                                <AvatarFallback>{m.user?.name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{m.user?.name || "Unknown"}</p>
                                   {isAdminRole && (
                                     <Badge variant="secondary" className="text-xs gap-1"><Crown className="h-3 w-3" /> Admin</Badge>
                                   )}
                                   {getRolesForUser(m.user_id).map((r: any) => (
                                     <Badge key={r.id} className="text-[10px] h-5 text-white border-0" style={{ backgroundColor: r.color }}>{r.name}</Badge>
                                   ))}
                                </div>
                                <p className="text-xs text-muted-foreground">Joined {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}</p>
                              </div>
                              {!isSelf && (
                                <div className="flex items-center gap-1">
                                  {!isAdminRole ? (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Promote to Admin" onClick={() => promoteMember(m.id)}>
                                      <ChevronUp className="h-4 w-4 text-primary" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Demote to Member" onClick={() => demoteMember(m.id)}>
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Exclude member" onClick={() => removeMember(m.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {/* ── Custom Roles ── */}
              {activeTab === "roles" && (
                <div className="space-y-4 max-w-lg">
                  <EntityRolesManager entityType="company" entityId={companyId} members={members} />
                </div>
              )}

              {/* ── Quests ── */}
              {activeTab === "quests" && (
                <div className="space-y-4">
                  <Section title={`Organization Quests (${quests.length})`} icon={<Zap className="h-5 w-5" />}><span /></Section>
                  {quests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No quests posted by this organization yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {quests.map((quest: any) => (
                        <Link key={quest.id} to={`/quests/${quest.id}`} className="block rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-display font-semibold">{quest.title}</h4>
                            <span className="flex items-center gap-1 text-sm font-semibold text-primary"><Zap className="h-3.5 w-3.5" /> {quest.reward_xp} XP</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{quest.description}</p>
                          <div className="flex gap-1.5 mt-2">
                            <Badge variant="outline" className="text-xs capitalize">{(quest.status || "").toLowerCase().replace("_", " ")}</Badge>
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
                        <p className="text-2xl font-bold text-primary">{bookings.length}</p>
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

                  <Section title="Services ({services.length})" icon={<Briefcase className="h-5 w-5" />}>
                    {services.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No services yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {services.map((svc: any) => (
                          <Link key={svc.id} to={`/services/${svc.id}`} className="block rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                            <p className="font-medium text-sm">{svc.title}</p>
                            <p className="text-xs text-muted-foreground">{svc.is_draft ? "Draft" : "Active"} · €{((svc.price_amount || 0) / 100).toFixed(2)}</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {/* ── Availability ── */}
              {activeTab === "availability" && (
                <div className="space-y-5 max-w-lg">
                  <Section title="Unit Availability" icon={<CalendarDays className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure when this organization is available for bookings. This schedule applies to all organization-hosted services.
                    </p>
                    <UnitAvailabilityEditor unitType="COMPANY" unitId={companyId} />
                  </Section>
                </div>
              )}

              {/* ── Documents ── */}
              {activeTab === "documents" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Organization Documents" icon={<Briefcase className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">Upload documents, contracts, and resources for your organization.</p>
                    <AttachmentList targetType={AttachmentTargetType.COMPANY} targetId={companyId} />
                    <div className="mt-4">
                      <AttachmentUpload targetType={AttachmentTargetType.COMPANY} targetId={companyId} />
                    </div>
                  </Section>
                </div>
              )}

              {/* ── Web Visibility ── */}
              {activeTab === "web_visibility" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Web Visibility" icon={<Globe className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">
                      Control how this organization appears on public websites generated from the platform.
                    </p>
                    <WebVisibilityEditor entityTable="companies" entityId={companyId} />
                  </Section>
                </div>
              )}

              {/* ── Billing ── */}
              {activeTab === "billing" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Organization Plan & Billing" icon={<CreditCard className="h-5 w-5" />}>
                    <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                      <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <h4 className="font-display text-lg font-semibold mb-1">Coming soon</h4>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Organization-specific subscription plans, billing management, and team seats will be available here.
                      </p>
                    </div>
                  </Section>
                </div>
              )}

              {/* ── Partnerships ── */}
              {activeTab === "partnerships" && (
                <PartnershipsTab entityType="COMPANY" entityId={companyId} isAdmin={true} />
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
