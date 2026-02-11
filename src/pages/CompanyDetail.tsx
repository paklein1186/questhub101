import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Building2, MapPin, Zap, Plus, Heart, Pencil, Settings,
  Compass, Bot, Users, Briefcase, Clock, Euro, Trash2, Loader2, Handshake,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { CommentThread } from "@/components/CommentThread";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollow } from "@/hooks/useFollow";
import { useToast } from "@/hooks/use-toast";
import { CommentTargetType, FollowTargetType, OnlineLocationType } from "@/types/enums";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { SocialLinksDisplay } from "@/components/SocialLinks";
import { EntityJoinButton } from "@/components/EntityJoinButton";
import {
  useCompanyById, useQuestsForCompany, useBookingsForCompany,
  usePublicProfile, useCompanyMembersWithProfiles, useServicesForCompany,
} from "@/hooks/useEntityQueries";
import { FeedSection } from "@/components/feed/FeedSection";
import { useGuilds } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { UnitChat } from "@/components/UnitChat";
import { formatDistanceToNow } from "date-fns";
import { EntityApplicationsTab } from "@/components/EntityApplicationsTab";
import { PartnershipsTab } from "@/components/partnership/PartnershipsTab";
import { PartnersBlock } from "@/components/partnership/PartnersBlock";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useCompanyById(id);
  const { data: companyQuests } = useQuestsForCompany(id);
  const { data: companyBookings } = useBookingsForCompany(id);
  const { data: companyServices } = useServicesForCompany(id);
  const { data: membersData } = useCompanyMembersWithProfiles(id);
  const { data: allGuilds } = useGuilds();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.COMPANY, id!);
  const qc = useQueryClient();

  const { data: contact } = usePublicProfile(company?.contact_user_id ?? undefined);

  // Quest creation state
  const [questOpen, setQuestOpen] = useState(false);
  const [qTitle, setQTitle] = useState("");
  const [qDesc, setQDesc] = useState("");
  const [qGuildId, setQGuildId] = useState("");
  const [qRewardXp, setQRewardXp] = useState("100");

  // Service creation state
  const [svcOpen, setSvcOpen] = useState(false);
  const [svcTitle, setSvcTitle] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcDuration, setSvcDuration] = useState("60");
  const [svcPrice, setSvcPrice] = useState("0");
  const [svcLocationType, setSvcLocationType] = useState<OnlineLocationType>(OnlineLocationType.JITSI);
  const [svcImageUrl, setSvcImageUrl] = useState<string | undefined>();
  const [svcDraft, setSvcDraft] = useState(false);

  // Edit company state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState<string | undefined>();
  const [editBannerUrl, setEditBannerUrl] = useState<string | undefined>();

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!company) return <PageShell><p>Company not found.</p></PageShell>;
  if (company.is_deleted && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>This company has been removed.</p></PageShell>;

  const members = membersData || [];
  const quests = companyQuests || [];
  const services = companyServices || [];
  const bookings = companyBookings || [];
  const territories = ((company as any).company_territories || []).map((ct: any) => ct.territories).filter(Boolean);

  // Role-based permissions
  const currentMembership = ((company as any).company_members || []).find((cm: any) => cm.user_id === currentUser.id);
  const memberRole = currentMembership?.role;
  const isAdmin = memberRole === "admin" || memberRole === "owner" || memberRole === "ADMIN" || checkIsGlobalAdmin(currentUser.email);
  const isMember = !!currentMembership;

  const createQuest = async () => {
    if (!qTitle.trim()) return;
    const { error } = await supabase.from("quests").insert({
      title: qTitle.trim(), description: qDesc.trim() || null,
      status: "OPEN" as any, monetization_type: "PAID" as any,
      reward_xp: Number(qRewardXp) || 100, is_featured: false,
      created_by_user_id: currentUser.id,
      guild_id: qGuildId || null, company_id: company.id,
      owner_type: "COMPANY", owner_id: company.id,
    } as any);
    if (error) { toast({ title: "Failed to create quest", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["quests-for-company", id] });
    setQuestOpen(false); setQTitle(""); setQDesc(""); setQGuildId(""); setQRewardXp("100");
    toast({ title: "Quest created!" });
  };

  const createService = async () => {
    if (!svcTitle.trim()) return;
    const { error } = await supabase.from("services").insert({
      title: svcTitle.trim(), description: svcDesc.trim() || null,
      owner_type: "COMPANY", owner_id: company.id,
      duration_minutes: Number(svcDuration) || 60,
      price_amount: Number(svcPrice) || 0, price_currency: "EUR",
      online_location_type: svcLocationType, is_active: true,
      image_url: svcImageUrl || null, is_draft: svcDraft,
    } as any);
    if (error) { toast({ title: "Failed to create service", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["services-for-company", id] });
    setSvcOpen(false); setSvcTitle(""); setSvcDesc(""); setSvcDuration("60"); setSvcPrice("0");
    setSvcLocationType(OnlineLocationType.JITSI); setSvcImageUrl(undefined); setSvcDraft(false);
    toast({ title: "Company service created" });
  };

  const openEdit = () => {
    setEditName(company.name); setEditDesc(company.description || "");
    setEditSector(company.sector || ""); setEditWebsite(company.website_url || "");
    setEditLogoUrl(company.logo_url ?? undefined); setEditBannerUrl(company.banner_url ?? undefined);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    await supabase.from("companies").update({
      name: editName.trim() || company.name, description: editDesc.trim() || null,
      sector: editSector.trim() || null, website_url: editWebsite.trim() || null,
      logo_url: editLogoUrl || null, banner_url: editBannerUrl || null,
    }).eq("id", company.id);
    qc.invalidateQueries({ queryKey: ["company", id] });
    setEditOpen(false); toast({ title: "Company updated" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=companies"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Companies</Link>
      </Button>

      {company.banner_url && (
        <div className="w-full h-40 md:h-56 rounded-xl overflow-hidden mb-6">
          <img src={company.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          {company.logo_url && <img src={company.logo_url} alt="" className="h-14 w-14 rounded-xl" />}
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">{company.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {company.sector && <span>{company.sector}</span>}
              {company.size && <><span>·</span><Badge variant="outline">{company.size}</Badge></>}
              <span>·</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {members.length} members</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={toggleFollow}><Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />{isFollowing ? "Unfollow" : "Follow"}</Button>
            {!isMember && (
              <EntityJoinButton entityType="company" entityId={company.id} joinPolicy="APPROVAL_REQUIRED" applicationQuestions={[]} currentUserId={currentUser.id} onJoined={() => { qc.invalidateQueries({ queryKey: ["company", id] }); qc.invalidateQueries({ queryKey: ["company-members-profiles", id] }); }} />
            )}
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={openEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" asChild><Link to={`/companies/${company.id}/settings`}><Settings className="h-4 w-4 mr-1" /> Settings</Link></Button>
              </>
            )}
          </div>
        </div>

        {company.description && <p className="text-muted-foreground max-w-2xl mb-3">{company.description}</p>}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {territories.map((t: any) => <Badge key={t.id} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
        </div>
        <SocialLinksDisplay data={{ websiteUrl: company.website_url, twitterUrl: company.twitter_url, linkedinUrl: company.linkedin_url, instagramUrl: company.instagram_url }} />

        {/* Edit dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Company</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><label className="text-sm font-medium mb-1 block">Name</label><Input value={editName} onChange={e => setEditName(e.target.value)} maxLength={80} /></div>
              <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
              <ImageUpload label="Logo" currentImageUrl={editLogoUrl} onChange={setEditLogoUrl} aspectRatio="1/1" description="Square logo" />
              <ImageUpload label="Banner" currentImageUrl={editBannerUrl} onChange={setEditBannerUrl} aspectRatio="16/9" />
              <div><label className="text-sm font-medium mb-1 block">Sector</label><Input value={editSector} onChange={e => setEditSector(e.target.value)} maxLength={50} /></div>
              <div><label className="text-sm font-medium mb-1 block">Website URL</label><Input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="https://…" /></div>
              <Button onClick={saveEdit} className="w-full">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"><Building2 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Members ({members.length})</TabsTrigger>
          <TabsTrigger value="quests"><Compass className="h-4 w-4 mr-1" /> Quests ({quests.length})</TabsTrigger>
          <TabsTrigger value="services"><Briefcase className="h-4 w-4 mr-1" /> Services ({services.length})</TabsTrigger>
          <TabsTrigger value="partnerships"><Handshake className="h-4 w-4 mr-1" /> Partners</TabsTrigger>
          <TabsTrigger value="wall">Wall</TabsTrigger>
          {isMember && <TabsTrigger value="ai-chat"><Bot className="h-4 w-4 mr-1" /> Chat & AI</TabsTrigger>}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div><h3 className="font-display font-semibold mb-2">About</h3><p className="text-sm text-foreground/80 leading-relaxed">{company.description}</p></div>
          {contact && (
            <div>
              <h3 className="font-display font-semibold mb-2">Contact</h3>
              <Link to={`/users/${contact.user_id}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                <Avatar className="h-6 w-6"><AvatarImage src={contact.avatar_url ?? undefined} /><AvatarFallback>{contact.name?.[0]}</AvatarFallback></Avatar>
                {contact.name}
              </Link>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center"><p className="text-2xl font-bold text-primary">{members.length}</p><p className="text-sm text-muted-foreground">Members</p></div>
            <div className="rounded-lg border border-border bg-card p-4 text-center"><p className="text-2xl font-bold text-primary">{quests.length}</p><p className="text-sm text-muted-foreground">Quests</p></div>
            <div className="rounded-lg border border-border bg-card p-4 text-center"><p className="text-2xl font-bold text-primary">{services.length}</p><p className="text-sm text-muted-foreground">Services</p></div>
          </div>
          <PartnersBlock entityType="COMPANY" entityId={company.id} />
        </TabsContent>

        {/* Partnerships */}
        <TabsContent value="partnerships" className="mt-6">
          <PartnershipsTab entityType="COMPANY" entityId={company.id} isAdmin={isAdmin} />
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="mt-6 space-y-4">
          {isAdmin && (
            <EntityApplicationsTab entityType="company" entityId={company.id} currentUserId={currentUser.id} />
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((m: any) => (
              <Link key={m.id} to={`/users/${m.user_id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                <Avatar className="h-10 w-10"><AvatarImage src={m.user?.avatar_url} /><AvatarFallback>{m.user?.name?.[0]}</AvatarFallback></Avatar>
                <div className="flex-1"><p className="text-sm font-medium">{m.user?.name}</p><p className="text-xs text-muted-foreground capitalize">{m.role}</p></div>
                <span className="text-xs text-muted-foreground">Joined {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}</span>
              </Link>
            ))}
          </div>
          {members.length === 0 && <p className="text-muted-foreground">No members yet.</p>}
        </TabsContent>

        {/* Quests */}
        <TabsContent value="quests" className="mt-6 space-y-3">
          {isAdmin && (
            <Dialog open={questOpen} onOpenChange={setQuestOpen}>
              <DialogTrigger asChild><Button size="sm" className="mb-3"><Plus className="h-4 w-4 mr-1" /> Create quest for this company</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Quest for {company.name}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={qTitle} onChange={e => setQTitle(e.target.value)} maxLength={120} /></div>
                  <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={qDesc} onChange={e => setQDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Guild (optional)</label>
                    <Select value={qGuildId} onValueChange={setQGuildId}>
                      <SelectTrigger><SelectValue placeholder="Select guild" /></SelectTrigger>
                      <SelectContent>
                        {(allGuilds || []).filter((g: any) => g.is_approved).map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm font-medium mb-1 block">Reward XP</label><Input type="number" value={qRewardXp} onChange={e => setQRewardXp(e.target.value)} min={0} /></div>
                  <Button onClick={createQuest} disabled={!qTitle.trim()} className="w-full">Create Quest</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {quests.map((quest: any) => (
            <Link key={quest.id} to={`/quests/${quest.id}`} className="block rounded-lg border border-border bg-card hover:border-primary/30 transition-all overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-1"><h4 className="font-display font-semibold">{quest.title}</h4><span className="flex items-center gap-1 text-sm font-semibold text-primary"><Zap className="h-3.5 w-3.5" /> {quest.reward_xp}</span></div>
                <p className="text-sm text-muted-foreground line-clamp-2">{quest.description}</p>
                <div className="flex gap-1.5 mt-2"><Badge variant="outline" className="text-[10px] capitalize">{quest.status?.toLowerCase().replace("_", " ")}</Badge></div>
              </div>
            </Link>
          ))}
          {quests.length === 0 && <p className="text-muted-foreground">No quests yet.</p>}
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="mt-6 space-y-3">
          {isAdmin && (
            <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
              <DialogTrigger asChild><Button size="sm" className="mb-3"><Plus className="h-4 w-4 mr-1" /> Create company service</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Company Service</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={svcTitle} onChange={e => setSvcTitle(e.target.value)} placeholder="e.g. Consulting Session" maxLength={120} /></div>
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
                  <Button onClick={createService} disabled={!svcTitle.trim()} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {services.map((svc: any) => (
            <div key={svc.id} className="rounded-lg border border-border bg-card hover:border-primary/30 transition-all overflow-hidden">
              <Link to={`/services/${svc.id}`} className="block">
                {svc.image_url && <div className="h-28 w-full"><img src={svc.image_url} alt="" className="w-full h-full object-cover" /></div>}
                <div className="p-4 pb-2">
                  <div className="flex items-center justify-between"><h4 className="font-display font-semibold">{svc.title}</h4>
                    <div className="flex items-center gap-2">
                      {svc.duration_minutes && <span className="text-xs text-muted-foreground">{svc.duration_minutes} min</span>}
                      {svc.price_amount != null && <Badge className="bg-primary/10 text-primary border-0">{svc.price_amount === 0 ? "Free" : `€${svc.price_amount}`}</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{svc.description}</p>
                  {svc.is_draft && <Badge variant="outline" className="mt-1 text-[10px]">Draft</Badge>}
                </div>
              </Link>
              {isAdmin && (
                <div className="px-4 pb-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={async () => {
                    const { error } = await supabase.from("services").update({ is_active: !svc.is_active }).eq("id", svc.id);
                    if (!error) { qc.invalidateQueries({ queryKey: ["services-for-company", id] }); toast({ title: svc.is_active ? "Service paused" : "Service resumed" }); }
                  }}>{svc.is_active ? "Pause" : "Resume"}</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                    const { error } = await supabase.from("services").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", svc.id);
                    if (!error) { qc.invalidateQueries({ queryKey: ["services-for-company", id] }); toast({ title: "Service deleted" }); }
                  }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
          ))}
          {services.length === 0 && <p className="text-muted-foreground">No services yet.</p>}
        </TabsContent>

        {/* Wall */}
        <TabsContent value="wall" className="mt-6 space-y-6">
          <FeedSection contextType="COMPANY" contextId={company.id} canPost={isMember} />
          <CommentThread targetType={CommentTargetType.COMPANY} targetId={company.id} />
        </TabsContent>

        {/* Chat & AI */}
        {isMember && (
          <TabsContent value="ai-chat" className="mt-6">
            <UnitChat entityType="COMPANY" entityId={company.id} entityName={company.name} />
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}
