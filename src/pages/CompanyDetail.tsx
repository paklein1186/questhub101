import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Globe, MapPin, Hash, Zap, Plus, Users, Heart, Pencil, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { CommentThread } from "@/components/CommentThread";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollow } from "@/hooks/useFollow";
import { useToast } from "@/hooks/use-toast";
import { QuestStatus, MonetizationType, CommentTargetType, FollowTargetType } from "@/types/enums";
import type { Quest } from "@/types";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { SocialLinksDisplay } from "@/components/SocialLinks";
import {
  getCompanyById, getUserById, getTopicsForCompany, getTerritoriesForCompany,
  getQuestsForCompany, getBookingsForCompany, getServiceById,
  guilds, quests as allQuests, companies,
} from "@/data/mock";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const company = getCompanyById(id!);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.COMPANY, id!);
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate(n => n + 1);

  const [questOpen, setQuestOpen] = useState(false);
  const [qTitle, setQTitle] = useState("");
  const [qDesc, setQDesc] = useState("");
  const [qGuildId, setQGuildId] = useState("");
  const [qRewardXp, setQRewardXp] = useState("100");

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState<string | undefined>();
  const [editBannerUrl, setEditBannerUrl] = useState<string | undefined>();

  if (!company) return <PageShell><p>Company not found.</p></PageShell>;
  if (company.isDeleted && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>This company has been removed.</p></PageShell>;

  const contact = company.contactUserId ? getUserById(company.contactUserId) : null;
  const cTopics = getTopicsForCompany(company.id);
  const cTerrs = getTerritoriesForCompany(company.id);
  const companyQuests = getQuestsForCompany(company.id);
  const companyBookings = getBookingsForCompany(company.id);
  const isContact = currentUser.id === company.contactUserId;

  const createQuest = () => {
    if (!qTitle.trim() || !qGuildId) return;
    const quest: Quest = { id: `q-${Date.now()}`, title: qTitle.trim(), description: qDesc.trim() || undefined, status: QuestStatus.OPEN, monetizationType: MonetizationType.PAID, rewardXp: Number(qRewardXp) || 100, isFeatured: false, createdByUserId: currentUser.id, guildId: qGuildId, companyId: company.id };
    allQuests.push(quest);
    setQuestOpen(false); setQTitle(""); setQDesc(""); setQGuildId(""); setQRewardXp("100");
    rerender(); toast({ title: "Quest created!" });
  };

  const openEdit = () => { setEditName(company.name); setEditDesc(company.description || ""); setEditSector(company.sector || ""); setEditWebsite(company.websiteUrl || ""); setEditLogoUrl(company.logoUrl); setEditBannerUrl(company.bannerUrl); setEditOpen(true); };

  const saveEdit = () => {
    const c = companies.find(c => c.id === company.id);
    if (c) { c.name = editName.trim() || c.name; c.description = editDesc.trim() || undefined; c.sector = editSector.trim() || undefined; c.websiteUrl = editWebsite.trim() || undefined; c.logoUrl = editLogoUrl; c.bannerUrl = editBannerUrl; c.updatedAt = new Date().toISOString(); }
    setEditOpen(false); rerender(); toast({ title: "Company updated" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=companies"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Companies</Link>
      </Button>

      {company.bannerUrl && (
        <div className="w-full h-40 md:h-56 rounded-xl overflow-hidden mb-6">
          <img src={company.bannerUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          {company.logoUrl && <img src={company.logoUrl} alt="" className="h-14 w-14 rounded-xl" />}
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">{company.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {company.sector && <span>{company.sector}</span>}
              {company.size && <><span>·</span><Badge variant="outline">{company.size}</Badge></>}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={toggleFollow}><Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />{isFollowing ? "Unfollow" : "Follow"}</Button>
            {isContact && (
              <>
                <Button size="sm" variant="outline" asChild><Link to={`/companies/${company.id}/settings`}><Settings className="h-4 w-4 mr-1" /> Settings</Link></Button>
              </>
            )}
          </div>
        </div>

        {company.description && <p className="text-muted-foreground max-w-2xl mb-3">{company.description}</p>}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cTopics.map(t => <Badge key={t.id} variant="secondary"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
          {cTerrs.map(t => <Badge key={t.id} variant="outline"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>)}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {company.websiteUrl && <a href={company.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors"><Globe className="h-3.5 w-3.5" /> Website</a>}
          {contact && <Link to={`/users/${contact.id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors"><Avatar className="h-5 w-5"><AvatarImage src={contact.avatarUrl} /><AvatarFallback>{contact.name[0]}</AvatarFallback></Avatar>Contact: {contact.name}</Link>}
        </div>

        <div className="mt-4">
          <Dialog open={questOpen} onOpenChange={setQuestOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create quest for this company</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Quest for {company.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={qTitle} onChange={e => setQTitle(e.target.value)} maxLength={120} /></div>
                <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={qDesc} onChange={e => setQDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
                <div><label className="text-sm font-medium mb-1 block">Guild</label><Select value={qGuildId} onValueChange={setQGuildId}><SelectTrigger><SelectValue placeholder="Select guild" /></SelectTrigger><SelectContent>{guilds.filter(g => g.isApproved).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select></div>
                <div><label className="text-sm font-medium mb-1 block">Reward XP</label><Input type="number" value={qRewardXp} onChange={e => setQRewardXp(e.target.value)} min={0} /></div>
                <Button onClick={createQuest} disabled={!qTitle.trim() || !qGuildId} className="w-full">Create Quest</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Company</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><label className="text-sm font-medium mb-1 block">Name</label><Input value={editName} onChange={e => setEditName(e.target.value)} maxLength={80} /></div>
              <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
              <ImageUpload label="Logo" currentImageUrl={editLogoUrl} onChange={setEditLogoUrl} aspectRatio="1/1" description="Square logo, 256×256 recommended" />
              <ImageUpload label="Banner (optional)" currentImageUrl={editBannerUrl} onChange={setEditBannerUrl} aspectRatio="16/9" description="Wide banner, 1200×400 recommended" />
              <div><label className="text-sm font-medium mb-1 block">Sector</label><Input value={editSector} onChange={e => setEditSector(e.target.value)} maxLength={50} /></div>
              <div><label className="text-sm font-medium mb-1 block">Website URL</label><Input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="https://…" /></div>
              <Button onClick={saveEdit} className="w-full">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs defaultValue="quests">
        <TabsList>
          <TabsTrigger value="quests">Quests ({companyQuests.length})</TabsTrigger>
          <TabsTrigger value="bookings">Booked Services ({companyBookings.length})</TabsTrigger>
          <TabsTrigger value="wall">Wall</TabsTrigger>
        </TabsList>

        <TabsContent value="quests" className="mt-6">
          {companyQuests.length === 0 && <p className="text-muted-foreground">No quests yet.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {companyQuests.map(quest => (
              <Link key={quest.id} to={`/quests/${quest.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-1"><h4 className="font-display font-semibold">{quest.title}</h4><span className="flex items-center gap-1 text-sm font-semibold text-primary"><Zap className="h-3.5 w-3.5" /> {quest.rewardXp}</span></div>
                <p className="text-sm text-muted-foreground line-clamp-2">{quest.description}</p>
                <div className="flex gap-1.5 mt-2"><Badge className="bg-accent text-accent-foreground border-0 text-[10px]"><Building2 className="h-2.5 w-2.5 mr-0.5" />Client quest</Badge><Badge variant="outline" className="text-[10px] capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge></div>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          {companyBookings.length === 0 && <p className="text-muted-foreground">No booked services yet.</p>}
          <div className="space-y-3">
            {companyBookings.map(booking => {
              const svc = getServiceById(booking.serviceId);
              return (<div key={booking.id} className="rounded-lg border border-border bg-card p-4"><div className="flex items-center justify-between"><Link to={`/services/${booking.serviceId}`} className="font-medium hover:text-primary transition-colors">{svc?.title}</Link><Badge variant="outline" className="capitalize">{booking.status.toLowerCase()}</Badge></div>{booking.notes && <p className="text-sm text-muted-foreground mt-1">{booking.notes}</p>}</div>);
            })}
          </div>
        </TabsContent>

        <TabsContent value="wall" className="mt-6">
          <CommentThread targetType={CommentTargetType.COMPANY} targetId={company.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
