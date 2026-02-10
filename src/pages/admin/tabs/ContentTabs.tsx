/**
 * ContentTabs — shared tab components extracted from AdminDashboard.tsx
 * Each export is a standalone component reused by the admin sub-pages.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check, X, Star, Pencil, Save, Crown, Hash, Plus, Trash2,
  CreditCard, MapPin, Eye, Zap, Settings, ShoppingBag,
  AlertTriangle, Mail, BarChart3, MessageSquare,
  EyeOff, Send, TrendingUp, Flag, ExternalLink,
  ScrollText, Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserRoles, setUserRole } from "@/lib/admin";
import { useXP } from "@/hooks/useXP";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  users as allUsers, guilds as allGuilds, quests as allQuests,
  topics as allTopics, territories as allTerritories,
  guildMembers, questTopics, questTerritories,
  topicStewards as allTopicStewards,
  topicFeatures as allTopicFeatures,
  services as allServices, bookings as allBookings,
  comments as allComments, pods as allPods, getServiceById, getUserById, getQuestsForGuild,
} from "@/data/mock";
import { reports as allReports, questUpdates as allQuestUpdates, companies as allCompanies } from "@/data/mock";
import {
  QuestStatus, MonetizationType, TopicStewardRole,
  TerritoryLevel, TopicFeatureTargetType, BookingStatus, PaymentStatus,
  ReportTargetType, ReportStatus,
} from "@/types/enums";
import type { Guild, Quest, TopicSteward, TopicFeature, Service, Booking, Report } from "@/types";
import { softDelete, restoreItem, permanentDelete } from "@/lib/softDelete";
import { adminActionLogs, logAdminAction } from "@/lib/adminLog";

// ─── Users & Roles Tab (Superadmin) ─────────────────────────
export function UsersRolesTab() {
  const currentUser = useCurrentUser();
  const { isSuperAdmin } = useUserRoles(currentUser.id);
  const { setXpManual } = useXP();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editXp, setEditXp] = useState(0);
  const [editCI, setEditCI] = useState(0);

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url, role, xp, contribution_index, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-all-user-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
  });

  const hasRole = (userId: string, role: string) => allRoles.filter((r) => r.user_id === userId).map((r) => r.role as string).includes(role);

  const handleToggleRole = async (targetUserId: string, role: "admin" | "superadmin", currentlyHas: boolean) => {
    const { error } = await setUserRole(currentUser.id, targetUserId, role, !currentlyHas);
    if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
    toast({ title: currentlyHas ? `${role} removed` : `${role} granted` });
    qc.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
    qc.invalidateQueries({ queryKey: ["user-roles"] });
  };

  const startEdit = (p: typeof profiles[0]) => { setEditingId(p.user_id); setEditXp(p.xp); setEditCI(p.contribution_index); };
  const saveEdit = (userId: string) => { setXpManual(userId, editXp, editCI); setEditingId(null); toast({ title: "XP / CI updated" }); qc.invalidateQueries({ queryKey: ["admin-all-profiles"] }); };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">XP</TableHead>
            <TableHead className="text-right">CI</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Superadmin</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((p) => {
            const isTargetAdmin = hasRole(p.user_id, "admin") || hasRole(p.user_id, "superadmin");
            const isTargetSuperadmin = hasRole(p.user_id, "superadmin");
            const isSelf = p.user_id === currentUser.id;
            return (
              <TableRow key={p.user_id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize text-xs">{p.role?.toLowerCase().replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right">
                  {editingId === p.user_id ? <Input type="number" value={editXp} onChange={(e) => setEditXp(Number(e.target.value))} className="w-20 h-8 text-right ml-auto" /> : p.xp}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === p.user_id ? <Input type="number" value={editCI} onChange={(e) => setEditCI(Number(e.target.value))} className="w-20 h-8 text-right ml-auto" /> : p.contribution_index}
                </TableCell>
                <TableCell>
                  {isSuperAdmin ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Switch checked={isTargetAdmin} /></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{isTargetAdmin ? "Remove Admin" : "Grant Admin"}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {isTargetAdmin ? `Remove admin access from ${p.name}?${isTargetSuperadmin ? " This will also remove their superadmin status." : ""}` : `Grant admin access to ${p.name}?`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleToggleRole(p.user_id, "admin", isTargetAdmin)}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Badge variant={isTargetAdmin ? "default" : "secondary"} className="text-xs">{isTargetAdmin ? "Yes" : "No"}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isSuperAdmin && !isSelf ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Switch checked={isTargetSuperadmin} /></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{isTargetSuperadmin ? "Remove Superadmin" : "Grant Superadmin"}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {isTargetSuperadmin ? `Remove superadmin from ${p.name}?` : `Grant superadmin to ${p.name}? Admin will also be granted.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleToggleRole(p.user_id, "superadmin", isTargetSuperadmin)}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Badge variant={isTargetSuperadmin ? "default" : "secondary"} className="text-xs">{isTargetSuperadmin ? "Yes" : isSelf && isSuperAdmin ? "You" : "No"}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === p.user_id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(p.user_id)}><Save className="h-3.5 w-3.5 text-primary" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {profiles.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Guilds Tab ─────────────────────────────────────────────
export function GuildsTab() {
  const [guildsState, setGuildsState] = useState<Guild[]>(allGuilds);
  const toggleApproved = (id: string) => setGuildsState((prev) => prev.map((g) => (g.id === id ? { ...g, isApproved: !g.isApproved } : g)));

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead className="text-right">Quests</TableHead>
            <TableHead>Approved</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guildsState.map((guild) => {
            const creator = getUserById(guild.createdByUserId);
            const memberCount = guildMembers.filter((gm) => gm.guildId === guild.id).length;
            const questCount = getQuestsForGuild(guild.id).length;
            return (
              <TableRow key={guild.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <img src={guild.logoUrl} className="h-7 w-7 rounded" alt="" />
                    <span className="font-medium">{guild.name}</span>
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary" className="capitalize text-xs">{guild.type.toLowerCase()}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{creator?.name}</TableCell>
                <TableCell className="text-right">{memberCount}</TableCell>
                <TableCell className="text-right">{questCount}</TableCell>
                <TableCell><Switch checked={guild.isApproved} onCheckedChange={() => toggleApproved(guild.id)} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Quests Tab ─────────────────────────────────────────────
export function QuestsTab() {
  const [questsState, setQuestsState] = useState<Quest[]>(allQuests);
  const [statusFilter, setStatusFilter] = useState("all");
  const [monetizationFilter, setMonetizationFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");

  const filtered = questsState.filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (monetizationFilter !== "all" && q.monetizationType !== monetizationFilter) return false;
    if (topicFilter !== "all" && !questTopics.some((qt) => qt.questId === q.id && qt.topicId === topicFilter)) return false;
    if (territoryFilter !== "all" && !questTerritories.some((qt) => qt.questId === q.id && qt.territoryId === territoryFilter)) return false;
    return true;
  });

  const toggleFeatured = (id: string) => {
    const quest = questsState.find((q) => q.id === id);
    setQuestsState((prev) => prev.map((q) => (q.id === id ? { ...q, isFeatured: !q.isFeatured } : q)));
    logAdminAction("u1", quest?.isFeatured ? "QUEST_UNFEATURED" : "QUEST_FEATURED", "Quest", id, quest?.isFeatured ? `Unfeatured: ${quest?.title}` : `Featured: ${quest?.title}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(QuestStatus).map((s) => <SelectItem key={s} value={s}>{s.toLowerCase().replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={monetizationFilter} onValueChange={setMonetizationFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.values(MonetizationType).map((m) => <SelectItem key={m} value={m}>{m.toLowerCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Topic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {allTopics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Territory" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {allTerritories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Guild</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Monetization</TableHead>
              <TableHead className="text-right">Reward XP</TableHead>
              <TableHead>Featured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((quest) => {
              const guild = allGuilds.find((g) => g.id === quest.guildId);
              return (
                <TableRow key={quest.id}>
                  <TableCell className="font-medium">{quest.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{guild?.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{quest.status.toLowerCase().replace("_", " ")}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize text-xs">{quest.monetizationType.toLowerCase()}</Badge></TableCell>
                  <TableCell className="text-right">{quest.rewardXp}</TableCell>
                  <TableCell><Switch checked={quest.isFeatured} onCheckedChange={() => toggleFeatured(quest.id)} /></TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No quests match filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Plans & XP Tab ─────────────────────────────────────────
interface PlanRow {
  id: string; name: string; code: string;
  monthlyPriceAmount: number; freeQuestsPerWeek: number;
  maxGuildMemberships: number | null; maxPods: number | null;
  xpMultiplier: number; marketplaceFeePercent: number | null;
  isPublic: boolean;
}

const DEFAULT_PLANS: PlanRow[] = [
  { id: "plan-free", name: "Free", code: "FREE", monthlyPriceAmount: 0, freeQuestsPerWeek: 1, maxGuildMemberships: 2, maxPods: 1, xpMultiplier: 1, marketplaceFeePercent: 15, isPublic: true },
  { id: "plan-impact", name: "Impact+", code: "IMPACT_PLUS", monthlyPriceAmount: 9, freeQuestsPerWeek: 5, maxGuildMemberships: 10, maxPods: 5, xpMultiplier: 1.5, marketplaceFeePercent: 10, isPublic: true },
  { id: "plan-eco", name: "Ecosystem Pro", code: "ECOSYSTEM_PRO", monthlyPriceAmount: 29, freeQuestsPerWeek: -1, maxGuildMemberships: null, maxPods: null, xpMultiplier: 2, marketplaceFeePercent: 5, isPublic: true },
];

export function PlansXpTab() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanRow[]>(DEFAULT_PLANS);
  const [editPlan, setEditPlan] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PlanRow>>({});
  const [xpCosts, setXpCosts] = useState({ extraQuestXpCost: 50, extraGuildXpCost: 100, extraPodXpCost: 75 });

  const startEditPlan = (p: PlanRow) => { setEditPlan(p.id); setEditValues({ ...p }); };
  const savePlan = () => { if (!editPlan) return; setPlans((prev) => prev.map((p) => p.id === editPlan ? { ...p, ...editValues } as PlanRow : p)); setEditPlan(null); toast({ title: "Plan updated" }); };
  const addPlan = () => {
    const np: PlanRow = { id: `plan-${Date.now()}`, name: "New Plan", code: `PLAN_${Date.now()}`, monthlyPriceAmount: 0, freeQuestsPerWeek: 1, maxGuildMemberships: 3, maxPods: 2, xpMultiplier: 1, marketplaceFeePercent: 15, isPublic: false };
    setPlans((p) => [...p, np]); startEditPlan(np);
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Subscription Plans</h3>
          <Button size="sm" onClick={addPlan}><Plus className="h-4 w-4 mr-1" /> Add plan</Button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead className="text-right">€/mo</TableHead>
                <TableHead className="text-right">Quests/wk</TableHead><TableHead className="text-right">Guilds</TableHead>
                <TableHead className="text-right">Pods</TableHead><TableHead className="text-right">XP×</TableHead>
                <TableHead className="text-right">Fee %</TableHead><TableHead>Public</TableHead><TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => {
                const isEd = editPlan === plan.id;
                return (
                  <TableRow key={plan.id}>
                    <TableCell>{isEd ? <Input value={editValues.name ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} className="h-8 w-28" /> : <span className="font-medium">{plan.name}</span>}</TableCell>
                    <TableCell>{isEd ? <Input value={editValues.code ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, code: e.target.value }))} className="h-8 w-28" /> : <code className="text-xs text-muted-foreground">{plan.code}</code>}</TableCell>
                    <TableCell className="text-right">{isEd ? <Input type="number" value={editValues.monthlyPriceAmount ?? 0} onChange={(e) => setEditValues((v) => ({ ...v, monthlyPriceAmount: Number(e.target.value) }))} className="h-8 w-16 text-right ml-auto" /> : plan.monthlyPriceAmount}</TableCell>
                    <TableCell className="text-right">{isEd ? <Input type="number" value={editValues.freeQuestsPerWeek ?? 0} onChange={(e) => setEditValues((v) => ({ ...v, freeQuestsPerWeek: Number(e.target.value) }))} className="h-8 w-16 text-right ml-auto" /> : (plan.freeQuestsPerWeek === -1 ? "∞" : plan.freeQuestsPerWeek)}</TableCell>
                    <TableCell className="text-right">{isEd ? <Input type="number" value={editValues.maxGuildMemberships ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, maxGuildMemberships: e.target.value ? Number(e.target.value) : null }))} className="h-8 w-16 text-right ml-auto" /> : (plan.maxGuildMemberships ?? "∞")}</TableCell>
                    <TableCell className="text-right">{isEd ? <Input type="number" value={editValues.maxPods ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, maxPods: e.target.value ? Number(e.target.value) : null }))} className="h-8 w-16 text-right ml-auto" /> : (plan.maxPods ?? "∞")}</TableCell>
                    <TableCell className="text-right">{isEd ? <Input type="number" step="0.1" value={editValues.xpMultiplier ?? 1} onChange={(e) => setEditValues((v) => ({ ...v, xpMultiplier: Number(e.target.value) }))} className="h-8 w-16 text-right ml-auto" /> : `${plan.xpMultiplier}×`}</TableCell>
                    <TableCell className="text-right">{isEd ? <Input type="number" value={editValues.marketplaceFeePercent ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, marketplaceFeePercent: e.target.value ? Number(e.target.value) : null }))} className="h-8 w-16 text-right ml-auto" /> : (plan.marketplaceFeePercent != null ? `${plan.marketplaceFeePercent}%` : "—")}</TableCell>
                    <TableCell>{isEd ? <Switch checked={editValues.isPublic ?? false} onCheckedChange={(v) => setEditValues((p) => ({ ...p, isPublic: v }))} /> : (plan.isPublic ? <Badge variant="secondary" className="text-xs">Public</Badge> : <Badge variant="outline" className="text-xs">Internal</Badge>)}</TableCell>
                    <TableCell>
                      {isEd ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={savePlan}><Save className="h-3.5 w-3.5 text-primary" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditPlan(null)}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      ) : <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditPlan(plan)}><Pencil className="h-3.5 w-3.5" /></Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Zap className="h-5 w-5" /> XP Cost Configuration</h3>
        <p className="text-sm text-muted-foreground mb-4">XP deducted when a user exceeds their plan's free allowance.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          {[
            { label: "Extra Quest", key: "extraQuestXpCost" as const, desc: "XP per extra quest beyond plan limit" },
            { label: "Extra Guild Membership", key: "extraGuildXpCost" as const, desc: "XP per extra guild slot" },
            { label: "Extra Pod", key: "extraPodXpCost" as const, desc: "XP per extra pod beyond limit" },
          ].map((item) => (
            <div key={item.key} className="rounded-lg border border-border bg-card p-4">
              <label className="text-sm font-medium block mb-1">{item.label}</label>
              <Input type="number" value={xpCosts[item.key]} onChange={(e) => setXpCosts((c) => ({ ...c, [item.key]: Number(e.target.value) }))} />
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={() => toast({ title: "XP costs saved" })}><Save className="h-4 w-4 mr-1" /> Save costs</Button>
      </div>
    </div>
  );
}

// ─── Houses & Territories Tab ───────────────────────────────
export function HousesTerritoriesTab() {
  const { toast } = useToast();
  const [topicsState, setTopicsState] = useState([...allTopics.map((t) => ({ ...t, isActive: true }))]);
  const [territoriesState, setTerritoriesState] = useState([...allTerritories.map((t) => ({ ...t, isActive: true }))]);
  const [stewardsState, setStewardsState] = useState<TopicSteward[]>([...allTopicStewards]);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTerritoryName, setNewTerritoryName] = useState("");
  const [newTerritoryLevel, setNewTerritoryLevel] = useState<TerritoryLevel>(TerritoryLevel.TOWN);
  const [stewardTopicId, setStewardTopicId] = useState("");
  const [stewardUserId, setStewardUserId] = useState("");
  const [stewardRole, setStewardRole] = useState<TopicStewardRole>(TopicStewardRole.STEWARD);
  const [editTopicId, setEditTopicId] = useState<string | null>(null);
  const [editTopicName, setEditTopicName] = useState("");

  const addTopic = () => {
    if (!newTopicName.trim()) return;
    const slug = newTopicName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setTopicsState((p) => [...p, { id: `t-${Date.now()}`, name: newTopicName.trim(), slug, isActive: true }]);
    setNewTopicName(""); toast({ title: "Topic created" });
  };

  const addTerritory = () => {
    if (!newTerritoryName.trim()) return;
    setTerritoriesState((p) => [...p, { id: `tr-${Date.now()}`, name: newTerritoryName.trim(), level: newTerritoryLevel, isActive: true }]);
    setNewTerritoryName(""); toast({ title: "Territory created" });
  };

  const toggleTopicActive = (id: string) => setTopicsState((p) => p.map((t) => t.id === id ? { ...t, isActive: !t.isActive } : t));
  const toggleTerritoryActive = (id: string) => setTerritoriesState((p) => p.map((t) => t.id === id ? { ...t, isActive: !t.isActive } : t));
  const saveTopicName = (id: string) => { setTopicsState((p) => p.map((t) => t.id === id ? { ...t, name: editTopicName.trim() || t.name } : t)); setEditTopicId(null); toast({ title: "Topic renamed" }); };

  const addSteward = () => {
    if (!stewardTopicId || !stewardUserId) return;
    if (stewardsState.some((s) => s.topicId === stewardTopicId && s.userId === stewardUserId)) return;
    const ts: TopicSteward = { id: `ts-${Date.now()}`, topicId: stewardTopicId, userId: stewardUserId, role: stewardRole, createdAt: new Date().toISOString() };
    allTopicStewards.push(ts); setStewardsState([...allTopicStewards]); setStewardTopicId(""); setStewardUserId(""); toast({ title: "Steward assigned" });
  };

  const removeSteward = (id: string) => {
    const idx = allTopicStewards.findIndex((s) => s.id === id);
    if (idx !== -1) allTopicStewards.splice(idx, 1);
    setStewardsState([...allTopicStewards]); toast({ title: "Steward removed" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Hash className="h-5 w-5" /> Topics (Houses)</h3>
        <div className="flex gap-2 mb-3">
          <Input placeholder="New topic name…" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} className="max-w-xs" />
          <Button size="sm" onClick={addTopic} disabled={!newTopicName.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Stewards</TableHead><TableHead>Active</TableHead><TableHead className="w-[80px]"></TableHead></TableRow></TableHeader>
            <TableBody>
              {topicsState.map((topic) => {
                const stewards = stewardsState.filter((s) => s.topicId === topic.id);
                return (
                  <TableRow key={topic.id} className={!topic.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      {editTopicId === topic.id ? (
                        <div className="flex gap-1">
                          <Input value={editTopicName} onChange={(e) => setEditTopicName(e.target.value)} className="h-8 w-40" />
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => saveTopicName(topic.id)}><Save className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditTopicId(null)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      ) : <span className="font-medium">{topic.name}</span>}
                    </TableCell>
                    <TableCell><code className="text-xs text-muted-foreground">{topic.slug}</code></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {stewards.map((s) => { const user = getUserById(s.userId); return <Badge key={s.id} variant="secondary" className="text-xs">{user?.name} ({s.role.toLowerCase()})</Badge>; })}
                        {stewards.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                    </TableCell>
                    <TableCell><Switch checked={topic.isActive} onCheckedChange={() => toggleTopicActive(topic.id)} /></TableCell>
                    <TableCell>{editTopicId !== topic.id && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditTopicId(topic.id); setEditTopicName(topic.name); }}><Pencil className="h-3.5 w-3.5" /></Button>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><MapPin className="h-5 w-5" /> Territories</h3>
        <div className="flex gap-2 mb-3">
          <Input placeholder="New territory name…" value={newTerritoryName} onChange={(e) => setNewTerritoryName(e.target.value)} className="max-w-xs" />
          <Select value={newTerritoryLevel} onValueChange={(v) => setNewTerritoryLevel(v as TerritoryLevel)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.values(TerritoryLevel).map((l) => <SelectItem key={l} value={l}>{l.toLowerCase()}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={addTerritory} disabled={!newTerritoryName.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Level</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
            <TableBody>
              {territoriesState.map((t) => (
                <TableRow key={t.id} className={!t.isActive ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{t.level.toLowerCase()}</Badge></TableCell>
                  <TableCell><Switch checked={t.isActive} onCheckedChange={() => toggleTerritoryActive(t.id)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Crown className="h-5 w-5" /> Steward Assignments</h3>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block">Topic</label>
              <Select value={stewardTopicId} onValueChange={setStewardTopicId}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Select topic" /></SelectTrigger>
                <SelectContent>{topicsState.filter((t) => t.isActive).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">User</label>
              <Select value={stewardUserId} onValueChange={setStewardUserId}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>{allUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Role</label>
              <Select value={stewardRole} onValueChange={(v) => setStewardRole(v as TopicStewardRole)}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.values(TopicStewardRole).map((r) => <SelectItem key={r} value={r}>{r.toLowerCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={addSteward} disabled={!stewardTopicId || !stewardUserId}><Plus className="h-4 w-4 mr-1" /> Assign</Button>
          </div>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Topic</TableHead><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
            <TableBody>
              {stewardsState.map((s) => {
                const topic = topicsState.find((t) => t.id === s.topicId);
                const user = getUserById(s.userId);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{topic?.name}</TableCell>
                    <TableCell className="text-sm">{user?.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize text-xs">{s.role.toLowerCase()}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeSteward(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                  </TableRow>
                );
              })}
              {stewardsState.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No stewards assigned.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Governance Tab ─────────────────────────────────────────
export function GovernanceTab() {
  const { toast } = useToast();
  const [featuresState, setFeaturesState] = useState<TopicFeature[]>([...allTopicFeatures]);

  const removeFeature = (id: string) => {
    const idx = allTopicFeatures.findIndex((f) => f.id === id);
    if (idx !== -1) allTopicFeatures.splice(idx, 1);
    setFeaturesState([...allTopicFeatures]); toast({ title: "Feature removed" });
  };

  const groupedByTopic = new Map<string, TopicFeature[]>();
  featuresState.forEach((f) => { const arr = groupedByTopic.get(f.topicId) || []; arr.push(f); groupedByTopic.set(f.topicId, arr); });

  return (
    <div className="space-y-6">
      {featuresState.length === 0 && <p className="text-sm text-muted-foreground">No featured content yet.</p>}
      {Array.from(groupedByTopic.entries()).map(([topicId, features]) => {
        const topic = allTopics.find((t) => t.id === topicId);
        return (
          <div key={topicId} className="rounded-xl border border-border bg-card p-5">
            <h4 className="font-display font-semibold mb-3 flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /> {topic?.name ?? topicId}</h4>
            <div className="space-y-2">
              {features.map((f) => {
                const isQuest = f.targetType === TopicFeatureTargetType.QUEST;
                const target = isQuest ? allQuests.find((q) => q.id === f.targetId) : allGuilds.find((g) => g.id === f.targetId);
                const addedBy = getUserById(f.addedByUserId);
                return (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant={isQuest ? "secondary" : "outline"} className="text-xs">{isQuest ? "Quest" : "Guild"}</Badge>
                      <span className="font-medium text-sm">{(target as any)?.title ?? (target as any)?.name ?? f.targetId}</span>
                      <span className="text-xs text-muted-foreground">by {addedBy?.name}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeFeature(f.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Services Section ───────────────────────────────────────
export function ServicesSection() {
  const { toast } = useToast();
  const [servicesState, setServicesState] = useState<Service[]>([...allServices]);

  const toggleServiceActive = (id: string) => { setServicesState((p) => p.map((s) => s.id === id ? { ...s, isActive: !s.isActive } : s)); toast({ title: "Service toggled" }); };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead><TableHead>Provider</TableHead><TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Bookings</TableHead><TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {servicesState.map((svc) => {
            const provider = svc.providerUserId ? getUserById(svc.providerUserId)?.name : allGuilds.find((g) => g.id === svc.providerGuildId)?.name;
            const bookingCount = allBookings.filter((b) => b.serviceId === svc.id).length;
            return (
              <TableRow key={svc.id} className={!svc.isActive ? "opacity-50" : ""}>
                <TableCell className="font-medium">{svc.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{provider ?? "—"}</TableCell>
                <TableCell className="text-right">{svc.priceAmount != null ? `${svc.priceAmount} ${svc.priceCurrency}` : "Free"}</TableCell>
                <TableCell className="text-right">{bookingCount}</TableCell>
                <TableCell><Switch checked={svc.isActive} onCheckedChange={() => toggleServiceActive(svc.id)} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Bookings Section ───────────────────────────────────────
export function BookingsSection() {
  const { toast } = useToast();
  const [bookingsState, setBookingsState] = useState<Booking[]>([...allBookings]);
  const [statusFilter, setStatusFilter] = useState("all");

  const setBookingStatus = (id: string, status: BookingStatus) => { setBookingsState((p) => p.map((b) => b.id === id ? { ...b, status } : b)); toast({ title: `Booking set to ${status.toLowerCase()}` }); };
  const setPaymentSt = (id: string, paymentStatus: PaymentStatus) => { setBookingsState((p) => p.map((b) => b.id === id ? { ...b, paymentStatus } : b)); toast({ title: `Payment set to ${paymentStatus.toLowerCase()}` }); };
  const filteredBookings = bookingsState.filter((b) => statusFilter === "all" || b.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(BookingStatus).map((s) => <SelectItem key={s} value={s}>{s.toLowerCase().replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead><TableHead>Requester</TableHead><TableHead>Provider</TableHead>
              <TableHead>Status</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((b) => {
              const svc = getServiceById(b.serviceId);
              const requester = getUserById(b.requesterId);
              const provider = b.providerUserId ? getUserById(b.providerUserId)?.name : allGuilds.find((g) => g.id === b.providerGuildId)?.name;
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-sm">{svc?.title ?? "—"}</TableCell>
                  <TableCell className="text-sm">{requester?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{provider ?? "—"}</TableCell>
                  <TableCell>
                    <Select value={b.status} onValueChange={(v) => setBookingStatus(b.id, v as BookingStatus)}>
                      <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.values(BookingStatus).map((s) => <SelectItem key={s} value={s}>{s.toLowerCase().replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={b.paymentStatus ?? PaymentStatus.NOT_REQUIRED} onValueChange={(v) => setPaymentSt(b.id, v as PaymentStatus)}>
                      <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.values(PaymentStatus).map((s) => <SelectItem key={s} value={s}>{s.toLowerCase().replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right text-sm">{b.amount != null ? `${b.amount} ${b.currency}` : "—"}</TableCell>
                  <TableCell><Link to={`/services/${b.serviceId}`} className="text-xs text-primary hover:underline">View service</Link></TableCell>
                </TableRow>
              );
            })}
            {filteredBookings.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No bookings match filter.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Moderation Tab ─────────────────────────────────────────
export function ModerationTab() {
  const { toast } = useToast();
  const [commentsState, setCommentsState] = useState(allComments.map((c) => ({ ...c, isDeleted: c.isDeleted ?? false })));
  const [reportsState, setReportsState] = useState<Report[]>(() => [...allReports]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const hideComment = (id: string) => {
    const c = commentsState.find((c) => c.id === id);
    if (!c) return;
    c.isDeleted = !c.isDeleted;
    c.deletedAt = c.isDeleted ? new Date().toISOString() : undefined;
    setCommentsState([...commentsState]);
    const mc = allComments.find((x) => x.id === id);
    if (mc) { mc.isDeleted = c.isDeleted; mc.deletedAt = c.deletedAt; }
    toast({ title: "Comment visibility toggled" });
  };

  // Reports
  const refresh = () => setReportsState([...allReports]);
  const filteredReports = reportsState.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && r.targetEntityType !== typeFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const updateStatus = (reportId: string, newStatus: ReportStatus) => {
    const r = allReports.find((r) => r.id === reportId);
    if (r) { r.status = newStatus; r.reviewedByUserId = "u1"; }
    refresh(); toast({ title: `Report marked as ${newStatus.toLowerCase()}` });
  };

  const targetLink = (r: Report) => {
    const map: Record<string, string> = { USER: `/users/${r.targetEntityId}`, GUILD: `/guilds/${r.targetEntityId}`, QUEST: `/quests/${r.targetEntityId}`, POD: `/pods/${r.targetEntityId}`, SERVICE: `/services/${r.targetEntityId}`, COMMENT: "#", BOOKING: "#" };
    return map[r.targetEntityType] ?? "#";
  };

  const sorted = [...commentsState].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Soft-deleted items
  type DeletedItem = { id: string; type: string; label: string; deletedAt?: string; deletedByUserId?: string };
  const deletedItems: DeletedItem[] = [
    ...allUsers.filter((u) => u.isDeleted).map((u) => ({ id: u.id, type: "User", label: u.name, deletedAt: u.deletedAt, deletedByUserId: u.deletedByUserId })),
    ...allGuilds.filter((g) => g.isDeleted).map((g) => ({ id: g.id, type: "Guild", label: g.name, deletedAt: g.deletedAt, deletedByUserId: g.deletedByUserId })),
    ...allQuests.filter((q) => q.isDeleted).map((q) => ({ id: q.id, type: "Quest", label: q.title, deletedAt: q.deletedAt, deletedByUserId: q.deletedByUserId })),
    ...allPods.filter((p) => p.isDeleted).map((p) => ({ id: p.id, type: "Pod", label: p.name, deletedAt: p.deletedAt, deletedByUserId: p.deletedByUserId })),
    ...allServices.filter((s) => s.isDeleted).map((s) => ({ id: s.id, type: "Service", label: s.title, deletedAt: s.deletedAt, deletedByUserId: s.deletedByUserId })),
    ...allCompanies.filter((c) => c.isDeleted).map((c) => ({ id: c.id, type: "Company", label: c.name, deletedAt: c.deletedAt, deletedByUserId: c.deletedByUserId })),
  ].sort((a, b) => new Date(b.deletedAt ?? 0).getTime() - new Date(a.deletedAt ?? 0).getTime());

  const getArrayForType = (type: string): any[] => {
    const map: Record<string, any[]> = { User: allUsers, Guild: allGuilds, Quest: allQuests, Pod: allPods, Service: allServices, Company: allCompanies, Comment: allComments, QuestUpdate: allQuestUpdates };
    return map[type] ?? [];
  };

  const handleRestore = (item: DeletedItem) => { restoreItem(getArrayForType(item.type), item.id); toast({ title: `${item.type} "${item.label}" restored` }); };
  const handlePermanentDelete = (item: DeletedItem) => { permanentDelete(getArrayForType(item.type), item.id); toast({ title: `${item.type} permanently deleted`, variant: "destructive" }); };

  return (
    <div className="space-y-8">
      {/* Soft-deleted items */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Trash2 className="h-5 w-5" /> Soft-Deleted Items ({deletedItems.length})</h3>
        {deletedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deleted items.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Name</TableHead><TableHead>Deleted At</TableHead><TableHead className="w-[200px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {deletedItems.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell><Badge variant="outline" className="text-xs">{item.type}</Badge></TableCell>
                    <TableCell className="font-medium text-sm">{item.label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleRestore(item)}><Check className="h-3 w-3 mr-1" /> Restore</Button>
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => handlePermanentDelete(item)}><Trash2 className="h-3 w-3 mr-1" /> Purge</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Separator />

      {/* Reports */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Flag className="h-5 w-5" /> Reports ({allReports.length})</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All statuses</SelectItem>{Object.values(ReportStatus).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All types</SelectItem>{Object.values(ReportTargetType).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {filteredReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports matching filters.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Reporter</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="w-[240px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredReports.map((r) => {
                  const reporter = getUserById(r.reporterId);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{reporter?.name ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.targetEntityType}</Badge></TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{r.reason}</TableCell>
                      <TableCell><Badge variant={r.status === "OPEN" ? "destructive" : r.status === "RESOLVED" ? "default" : "secondary"} className="text-xs">{r.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {targetLink(r) !== "#" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild><a href={targetLink(r)}><ExternalLink className="h-3 w-3 mr-1" /> View</a></Button>}
                          {r.status === ReportStatus.OPEN && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => updateStatus(r.id, ReportStatus.REVIEWED)}><Eye className="h-3 w-3 mr-1" /> Reviewed</Button>
                              <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={() => updateStatus(r.id, ReportStatus.RESOLVED)}><Check className="h-3 w-3 mr-1" /> Resolve</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => updateStatus(r.id, ReportStatus.DISMISSED)}><X className="h-3 w-3 mr-1" /> Dismiss</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Separator />

      {/* All comments */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><MessageSquare className="h-5 w-5" /> All Comments</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Author</TableHead><TableHead>Content</TableHead><TableHead>Target</TableHead><TableHead className="text-right">Upvotes</TableHead><TableHead>Visible</TableHead></TableRow></TableHeader>
            <TableBody>
              {sorted.map((c) => {
                const author = getUserById(c.authorId);
                return (
                  <TableRow key={c.id} className={c.isDeleted ? "opacity-50" : ""}>
                    <TableCell className="font-medium text-sm">{author?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{c.content}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-xs">{c.targetType.toLowerCase().replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right">{c.upvoteCount}</TableCell>
                    <TableCell>
                      <Button size="sm" variant={c.isDeleted ? "destructive" : "ghost"} className="h-7 px-2 text-xs" onClick={() => hideComment(c.id)}>
                        {c.isDeleted ? <><EyeOff className="h-3 w-3 mr-1" /> Hidden</> : <><Eye className="h-3 w-3 mr-1" /> Visible</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Monitoring Tab ───────────────────────────
export function NotificationsMonitoringTab() {
  const { toast } = useToast();
  const [testUserId, setTestUserId] = useState("");
  const volumeByType = [
    { type: "COMMENT", count: 142, failed: 2 },
    { type: "UPVOTE", count: 89, failed: 0 },
    { type: "QUEST_UPDATE", count: 67, failed: 1 },
    { type: "BOOKING_REQUESTED", count: 45, failed: 0 },
    { type: "BOOKING_CONFIRMED", count: 38, failed: 0 },
    { type: "GUILD_MEMBER_ADDED", count: 23, failed: 0 },
    { type: "POD_MESSAGE", count: 156, failed: 3 },
    { type: "FOLLOWER_NEW", count: 34, failed: 0 },
    { type: "XP_GAINED", count: 201, failed: 0 },
    { type: "ACHIEVEMENT_UNLOCKED", count: 12, failed: 0 },
    { type: "SYSTEM_ANNOUNCEMENT", count: 3, failed: 0 },
  ];
  const totalNotifications = volumeByType.reduce((s, v) => s + v.count, 0);
  const totalFailed = volumeByType.reduce((s, v) => s + v.failed, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total sent (7d)", value: totalNotifications },
          { label: "Failed deliveries", value: totalFailed, destructive: true },
          { label: "Push subscriptions", value: 24 },
          { label: "Digest emails (last run)", value: 18 },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.destructive ? "text-destructive" : ""}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Volume by Type (7 days)</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Failed</TableHead><TableHead className="text-right">Success %</TableHead></TableRow></TableHeader>
            <TableBody>
              {volumeByType.map((v) => (
                <TableRow key={v.type}>
                  <TableCell><Badge variant="secondary" className="text-xs capitalize">{v.type.toLowerCase().replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-right">{v.count}</TableCell>
                  <TableCell className="text-right">{v.failed > 0 ? <span className="text-destructive font-medium">{v.failed}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                  <TableCell className="text-right">{v.count > 0 ? `${Math.round(((v.count - v.failed) / v.count) * 100)}%` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><Settings className="h-5 w-5" /> Admin Tools</h3>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold mb-2">Test Push Notification</h4>
            <div className="flex gap-2">
              <Select value={testUserId} onValueChange={setTestUserId}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>{allUsers.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={!testUserId} onClick={() => toast({ title: "Test push sent" })}><Send className="h-4 w-4 mr-1" /> Send test push</Button>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold mb-2">Trigger Digest Manually</h4>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toast({ title: "Daily digest triggered" })}><Mail className="h-4 w-4 mr-1" /> Run daily digest</Button>
              <Button size="sm" variant="outline" onClick={() => toast({ title: "Weekly digest triggered" })}><Mail className="h-4 w-4 mr-1" /> Run weekly digest</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Emails & Digests Tab ───────────────────────────────────
interface EmailTemplate {
  id: string; name: string; description: string; enabled: boolean; subject: string; introText: string;
}

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  { id: "welcome", name: "Welcome Email", description: "Sent when a new user signs up.", enabled: true, subject: "Welcome to the platform!", introText: "We're excited to have you join our community." },
  { id: "booking-provider", name: "Booking Confirmation (Provider)", description: "Sent to the provider when a booking is confirmed.", enabled: true, subject: "New booking confirmed", introText: "A new booking has been confirmed for your service." },
  { id: "booking-client", name: "Booking Confirmation (Client)", description: "Sent to the client when a booking is confirmed.", enabled: true, subject: "Your booking is confirmed", introText: "Your booking has been confirmed." },
  { id: "weekly-digest", name: "Weekly Digest", description: "Weekly summary of quests and updates.", enabled: true, subject: "Your weekly digest", introText: "Here's what happened this week." },
  { id: "plan-upgrade", name: "Plan Upgrade", description: "Sent when a user upgrades their subscription.", enabled: true, subject: "Your plan has been upgraded!", introText: "Congratulations on upgrading." },
  { id: "payment-failure", name: "Payment Failure", description: "Sent when a payment fails.", enabled: true, subject: "Payment issue with your subscription", introText: "We were unable to process your payment." },
];

export function EmailsDigestsTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editIntro, setEditIntro] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const toggleEnabled = (id: string) => { setTemplates((p) => p.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t)); toast({ title: "Email template toggled" }); };
  const startEdit = (t: EmailTemplate) => { setEditingId(t.id); setEditSubject(t.subject); setEditIntro(t.introText); };
  const saveEdit = () => { if (!editingId) return; setTemplates((p) => p.map((t) => t.id === editingId ? { ...t, subject: editSubject, introText: editIntro } : t)); setEditingId(null); toast({ title: "Template updated" }); };
  const sendTest = (_templateId: string) => { if (!testEmail.trim()) { toast({ title: "Enter a test email address", variant: "destructive" }); return; } toast({ title: `Test email sent to ${testEmail}` }); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1" />
        <Input placeholder="Test email address…" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="max-w-xs h-9" />
      </div>
      <div className="space-y-3">
        {templates.map((tpl) => (
          <div key={tpl.id} className={`rounded-xl border border-border bg-card p-5 ${!tpl.enabled ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h4 className="font-display font-semibold">{tpl.name}</h4>
                <p className="text-sm text-muted-foreground">{tpl.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={tpl.enabled} onCheckedChange={() => toggleEnabled(tpl.id)} />
                <Button size="sm" variant="outline" onClick={() => sendTest(tpl.id)} disabled={!tpl.enabled}><Send className="h-3.5 w-3.5 mr-1" /> Test</Button>
              </div>
            </div>
            {editingId === tpl.id ? (
              <div className="space-y-3 mt-3 border-t border-border pt-3">
                <div><label className="text-sm font-medium mb-1 block">Subject</label><Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1 block">Intro Text</label><Textarea value={editIntro} onChange={(e) => setEditIntro(e.target.value)} className="resize-none min-h-[80px]" /></div>
                <div className="flex gap-2"><Button size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" /> Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button></div>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {tpl.subject}</p>
                <p className="text-sm"><span className="text-muted-foreground">Intro:</span> {tpl.introText}</p>
                <Button size="sm" variant="ghost" className="mt-1" onClick={() => startEdit(tpl)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit template</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Audit Logs Tab ─────────────────────────────────────────
export function AuditLogsTab() {
  const [typeFilter, setTypeFilter] = useState("all");
  const actionTypes = [...new Set(adminActionLogs.map((l) => l.actionType))];
  const filtered = typeFilter === "all" ? adminActionLogs : adminActionLogs.filter((l) => l.actionType === typeFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Actions</SelectItem>{actionTypes.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} entries</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No audit logs yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((log) => {
                const admin = getUserById(log.adminUserId);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-sm">{admin?.name ?? log.adminUserId}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{log.actionType.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.targetEntityType} / {log.targetEntityId}</TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">{log.details}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
