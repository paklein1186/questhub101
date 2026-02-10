import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserCircle, Pencil, Zap, Settings, Briefcase, Clock, Plus, Trash2,
  Video, Euro, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { OnlineLocationType } from "@/types/enums";
import type { Service } from "@/types";
import {
  userTopics, userTerritories, getTopicById, getTerritoryById,
  services, getServicesForUser,
} from "@/data/mock";
import MyAvailability from "./MyAvailability";

export default function MeHub() {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [tab, setTab] = useState("profile");
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  const topics = userTopics.filter((ut) => ut.userId === currentUser.id).map((ut) => getTopicById(ut.topicId)!).filter(Boolean);
  const territories = userTerritories.filter((ut) => ut.userId === currentUser.id).map((ut) => getTerritoryById(ut.territoryId)!).filter(Boolean);
  const myServices = getServicesForUser(currentUser.id);
  const allMyServices = services.filter((s) => s.providerUserId === currentUser.id);

  // Create service form
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formPrice, setFormPrice] = useState("0");
  const [formCurrency, setFormCurrency] = useState("EUR");
  const [formLocationType, setFormLocationType] = useState<OnlineLocationType>(OnlineLocationType.JITSI);

  const resetForm = () => {
    setFormTitle(""); setFormDesc(""); setFormDuration("60"); setFormPrice("0");
    setFormCurrency("EUR"); setFormLocationType(OnlineLocationType.JITSI);
    setEditId(null);
  };

  const openEdit = (svc: Service) => {
    setEditId(svc.id);
    setFormTitle(svc.title);
    setFormDesc(svc.description);
    setFormDuration(String(svc.durationMinutes ?? 60));
    setFormPrice(String(svc.priceAmount ?? 0));
    setFormCurrency(svc.priceCurrency);
    setFormLocationType(svc.onlineLocationType ?? OnlineLocationType.JITSI);
    setCreateOpen(true);
  };

  const saveService = () => {
    if (!formTitle.trim()) return;
    if (editId) {
      const svc = services.find((s) => s.id === editId);
      if (svc) {
        svc.title = formTitle.trim();
        svc.description = formDesc.trim();
        svc.durationMinutes = Number(formDuration) || 60;
        svc.priceAmount = Number(formPrice) || 0;
        svc.priceCurrency = formCurrency;
        svc.onlineLocationType = formLocationType;
        svc.updatedAt = new Date().toISOString();
        toast({ title: "Service updated" });
      }
    } else {
      const newSvc: Service = {
        id: `svc-${Date.now()}`,
        title: formTitle.trim(),
        description: formDesc.trim(),
        providerUserId: currentUser.id,
        durationMinutes: Number(formDuration) || 60,
        priceAmount: Number(formPrice) || 0,
        priceCurrency: formCurrency,
        onlineLocationType: formLocationType,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      services.push(newSvc);
      toast({ title: "Service created" });
    }
    setCreateOpen(false);
    resetForm();
    rerender();
  };

  const toggleActive = (svc: Service) => {
    svc.isActive = !svc.isActive;
    svc.updatedAt = new Date().toISOString();
    rerender();
    toast({ title: svc.isActive ? "Service resumed" : "Service paused" });
  };

  const deleteService = (id: string) => {
    const idx = services.findIndex((s) => s.id === id);
    if (idx !== -1) services.splice(idx, 1);
    rerender();
    toast({ title: "Service deleted" });
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback className="text-3xl">{currentUser.name[0]}</AvatarFallback>
          </Avatar>
          <h1 className="font-display text-2xl font-bold">{currentUser.name}</h1>
          {currentUser.headline && <p className="text-muted-foreground mt-1">{currentUser.headline}</p>}
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary" className="capitalize">{currentUser.role.toLowerCase().replace("_", " ")}</Badge>
            <span className="flex items-center gap-1 text-sm font-semibold text-primary">
              <Zap className="h-4 w-4" /> {currentUser.xp} XP
            </span>
            <span className="text-sm text-muted-foreground">CI: {currentUser.contributionIndex}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {topics.map((t) => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
            {territories.map((t) => <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>)}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="services">Services ({allMyServices.length})</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start h-12">
                <Link to={`/users/${currentUser.id}`}>
                  <UserCircle className="h-5 w-5 mr-3" /> View my public profile
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start h-12">
                <Link to="/me/settings?tab=profile">
                  <Pencil className="h-5 w-5 mr-3" /> Edit profile
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start h-12">
                <Link to="/me/settings?tab=billing">
                  <Zap className="h-5 w-5 mr-3" /> XP, Plan & Billing
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start h-12">
                <Link to="/me/settings">
                  <Settings className="h-5 w-5 mr-3" /> Settings
                </Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="services">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">My Services</h2>
              <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create service</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editId ? "Edit Service" : "Create Service"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Title</label>
                      <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Strategy Workshop" maxLength={120} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Description</label>
                      <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="What this service includes…" maxLength={500} className="resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Duration (min)</label>
                        <Input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} min={15} max={480} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Price (€)</label>
                        <Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} min={0} step={5} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Location type</label>
                      <Select value={formLocationType} onValueChange={(v) => setFormLocationType(v as OnlineLocationType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={OnlineLocationType.JITSI}>Jitsi</SelectItem>
                          <SelectItem value={OnlineLocationType.ZOOM}>Zoom</SelectItem>
                          <SelectItem value={OnlineLocationType.OTHER}>Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={saveService} disabled={!formTitle.trim()} className="w-full">
                      {editId ? "Save changes" : "Create service"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {allMyServices.length === 0 && (
              <p className="text-muted-foreground">No services yet. Create your first service above.</p>
            )}

            <div className="space-y-3">
              {allMyServices.map((svc, i) => (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Link to={`/services/${svc.id}`} className="font-display font-semibold hover:text-primary transition-colors">{svc.title}</Link>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {svc.durationMinutes} min</span>
                        <span className="flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          {(!svc.priceAmount || svc.priceAmount === 0) ? "Free" : `€${svc.priceAmount}`}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          <Video className="h-2.5 w-2.5 mr-0.5" /> {svc.onlineLocationType}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={svc.isActive ? "bg-emerald-500/10 text-emerald-600 border-0" : "bg-muted text-muted-foreground border-0"}>
                        {svc.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{svc.description}</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(svc)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(svc)}>
                      {svc.isActive ? <><ToggleRight className="h-3.5 w-3.5 mr-1" /> Pause</> : <><ToggleLeft className="h-3.5 w-3.5 mr-1" /> Resume</>}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteService(svc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <MyAvailability bare />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
