import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users as UsersIcon, Shield, Compass, Check, X,
  Star, Pencil, Save, ChevronDown, Crown, Hash, Plus, Trash2,
  CreditCard, MapPin, Eye, Ban, Zap, Settings, Globe,
  ShoppingBag, AlertTriangle, Mail, BarChart3, MessageSquare,
  EyeOff, Send, TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isAdmin } from "@/lib/admin";
import { useXP } from "@/hooks/useXP";
import { useToast } from "@/hooks/use-toast";
import {
  users as allUsers, guilds as allGuilds, quests as allQuests,
  topics as allTopics, territories as allTerritories,
  guildMembers, userTopics, userTerritories,
  questTopics, questTerritories,
  getUserById, getQuestsForGuild,
  topicStewards as allTopicStewards,
  topicFeatures as allTopicFeatures,
  services as allServices, bookings as allBookings,
  comments as allComments, pods as allPods, getServiceById,
} from "@/data/mock";
import {
  UserRole, QuestStatus, MonetizationType, TopicStewardRole,
  TerritoryLevel, TopicFeatureTargetType, BookingStatus, PaymentStatus,
} from "@/types/enums";
import type { User, Guild, Quest, TopicSteward, Topic, Territory, TopicFeature, Service, Booking, Comment } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { softDelete, restoreItem, permanentDelete } from "@/lib/softDelete";
import { questUpdates as allQuestUpdates, companies as allCompanies } from "@/data/mock";
import type { QuestUpdate, Company, Pod } from "@/types";

// ─── Users & Roles Tab ──────────────────────────────────────
function UsersRolesTab() {
  const [usersState, setUsersState] = useState<User[]>(allUsers);
  const [roleFilter, setRoleFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editXp, setEditXp] = useState(0);
  const [editCI, setEditCI] = useState(0);
  const { setXpManual } = useXP();
  const { toast } = useToast();

  // Simple admin/blocked flags stored per-user via local maps (mock)
  const [adminFlags, setAdminFlags] = useState<Record<string, boolean>>({ u1: true });
  const [blockedFlags, setBlockedFlags] = useState<Record<string, boolean>>({});

  const filtered = usersState.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (topicFilter !== "all" && !userTopics.some((ut) => ut.userId === u.id && ut.topicId === topicFilter)) return false;
    if (territoryFilter !== "all" && !userTerritories.some((ut) => ut.userId === u.id && ut.territoryId === territoryFilter)) return false;
    return true;
  });

  const startEdit = (u: User) => { setEditingId(u.id); setEditXp(u.xp); setEditCI(u.contributionIndex); };

  const saveEdit = (id: string) => {
    setXpManual(id, editXp, editCI);
    setUsersState((prev) => prev.map((u) => (u.id === id ? { ...u, xp: editXp, contributionIndex: editCI } : u)));
    setEditingId(null);
  };

  const toggleAdmin = (id: string) => {
    setAdminFlags((p) => ({ ...p, [id]: !p[id] }));
    toast({ title: adminFlags[id] ? "Admin removed" : "Admin granted" });
  };

  const toggleBlocked = (id: string) => {
    setBlockedFlags((p) => ({ ...p, [id]: !p[id] }));
    toast({ title: blockedFlags[id] ? "User unblocked" : "User blocked" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.values(UserRole).map((r) => <SelectItem key={r} value={r}>{r.toLowerCase().replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Topic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {allTopics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Territory" /></SelectTrigger>
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead className="text-right">CI</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id} className={blockedFlags[user.id] ? "opacity-50" : ""}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-xs">{user.role.toLowerCase().replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === user.id ? (
                    <Input type="number" value={editXp} onChange={(e) => setEditXp(Number(e.target.value))} className="w-20 h-8 text-right ml-auto" />
                  ) : user.xp}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === user.id ? (
                    <Input type="number" value={editCI} onChange={(e) => setEditCI(Number(e.target.value))} className="w-20 h-8 text-right ml-auto" />
                  ) : user.contributionIndex}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">Free</Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={!!adminFlags[user.id]} onCheckedChange={() => toggleAdmin(user.id)} />
                </TableCell>
                <TableCell>
                  <Button size="sm" variant={blockedFlags[user.id] ? "destructive" : "ghost"} className="h-7 px-2 text-xs" onClick={() => toggleBlocked(user.id)}>
                    <Ban className="h-3 w-3 mr-1" /> {blockedFlags[user.id] ? "Blocked" : "Active"}
                  </Button>
                </TableCell>
                <TableCell>
                  {editingId === user.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(user.id)}><Save className="h-3.5 w-3.5 text-primary" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(user)}><Pencil className="h-3.5 w-3.5" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No users match filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Guilds Tab ─────────────────────────────────────────────
function GuildsTab() {
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
function QuestsTab() {
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

  const toggleFeatured = (id: string) => setQuestsState((prev) => prev.map((q) => (q.id === id ? { ...q, isFeatured: !q.isFeatured } : q)));

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
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No quests match filters.</TableCell></TableRow>
            )}
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

function PlansXpTab() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanRow[]>(DEFAULT_PLANS);
  const [editPlan, setEditPlan] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PlanRow>>({});

  // XP costs config
  const [xpCosts, setXpCosts] = useState({ extraQuestXpCost: 50, extraGuildXpCost: 100, extraPodXpCost: 75 });

  const startEditPlan = (p: PlanRow) => { setEditPlan(p.id); setEditValues({ ...p }); };

  const savePlan = () => {
    if (!editPlan) return;
    setPlans((prev) => prev.map((p) => p.id === editPlan ? { ...p, ...editValues } as PlanRow : p));
    setEditPlan(null);
    toast({ title: "Plan updated" });
  };

  const addPlan = () => {
    const np: PlanRow = {
      id: `plan-${Date.now()}`, name: "New Plan", code: `PLAN_${Date.now()}`,
      monthlyPriceAmount: 0, freeQuestsPerWeek: 1, maxGuildMemberships: 3,
      maxPods: 2, xpMultiplier: 1, marketplaceFeePercent: 15, isPublic: false,
    };
    setPlans((p) => [...p, np]);
    startEditPlan(np);
  };

  return (
    <div className="space-y-8">
      {/* Plans */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Subscription Plans</h3>
          <Button size="sm" onClick={addPlan}><Plus className="h-4 w-4 mr-1" /> Add plan</Button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">€/mo</TableHead>
                <TableHead className="text-right">Quests/wk</TableHead>
                <TableHead className="text-right">Guilds</TableHead>
                <TableHead className="text-right">Pods</TableHead>
                <TableHead className="text-right">XP×</TableHead>
                <TableHead className="text-right">Fee %</TableHead>
                <TableHead>Public</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => {
                const isEd = editPlan === plan.id;
                return (
                  <TableRow key={plan.id}>
                    <TableCell>
                      {isEd ? <Input value={editValues.name ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} className="h-8 w-28" /> : <span className="font-medium">{plan.name}</span>}
                    </TableCell>
                    <TableCell>
                      {isEd ? <Input value={editValues.code ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, code: e.target.value }))} className="h-8 w-28" /> : <code className="text-xs text-muted-foreground">{plan.code}</code>}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEd ? <Input type="number" value={editValues.monthlyPriceAmount ?? 0} onChange={(e) => setEditValues((v) => ({ ...v, monthlyPriceAmount: Number(e.target.value) }))} className="h-8 w-16 text-right ml-auto" /> : plan.monthlyPriceAmount}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEd ? <Input type="number" value={editValues.freeQuestsPerWeek ?? 0} onChange={(e) => setEditValues((v) => ({ ...v, freeQuestsPerWeek: Number(e.target.value) }))} className="h-8 w-16 text-right ml-auto" /> : (plan.freeQuestsPerWeek === -1 ? "∞" : plan.freeQuestsPerWeek)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEd ? <Input type="number" value={editValues.maxGuildMemberships ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, maxGuildMemberships: e.target.value ? Number(e.target.value) : null }))} className="h-8 w-16 text-right ml-auto" /> : (plan.maxGuildMemberships ?? "∞")}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEd ? <Input type="number" value={editValues.maxPods ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, maxPods: e.target.value ? Number(e.target.value) : null }))} className="h-8 w-16 text-right ml-auto" /> : (plan.maxPods ?? "∞")}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEd ? <Input type="number" step="0.1" value={editValues.xpMultiplier ?? 1} onChange={(e) => setEditValues((v) => ({ ...v, xpMultiplier: Number(e.target.value) }))} className="h-8 w-16 text-right ml-auto" /> : `${plan.xpMultiplier}×`}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEd ? <Input type="number" value={editValues.marketplaceFeePercent ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, marketplaceFeePercent: e.target.value ? Number(e.target.value) : null }))} className="h-8 w-16 text-right ml-auto" /> : (plan.marketplaceFeePercent != null ? `${plan.marketplaceFeePercent}%` : "—")}
                    </TableCell>
                    <TableCell>
                      {isEd ? <Switch checked={editValues.isPublic ?? false} onCheckedChange={(v) => setEditValues((p) => ({ ...p, isPublic: v }))} /> : (plan.isPublic ? <Badge variant="secondary" className="text-xs">Public</Badge> : <Badge variant="outline" className="text-xs">Internal</Badge>)}
                    </TableCell>
                    <TableCell>
                      {isEd ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={savePlan}><Save className="h-3.5 w-3.5 text-primary" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditPlan(null)}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditPlan(plan)}><Pencil className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      {/* XP Costs */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Zap className="h-5 w-5" /> XP Cost Configuration</h3>
        <p className="text-sm text-muted-foreground mb-4">XP deducted when a user exceeds their plan's free allowance.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="text-sm font-medium block mb-1">Extra Quest</label>
            <Input type="number" value={xpCosts.extraQuestXpCost} onChange={(e) => setXpCosts((c) => ({ ...c, extraQuestXpCost: Number(e.target.value) }))} />
            <p className="text-xs text-muted-foreground mt-1">XP per extra quest beyond plan limit</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="text-sm font-medium block mb-1">Extra Guild Membership</label>
            <Input type="number" value={xpCosts.extraGuildXpCost} onChange={(e) => setXpCosts((c) => ({ ...c, extraGuildXpCost: Number(e.target.value) }))} />
            <p className="text-xs text-muted-foreground mt-1">XP per extra guild slot</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="text-sm font-medium block mb-1">Extra Pod</label>
            <Input type="number" value={xpCosts.extraPodXpCost} onChange={(e) => setXpCosts((c) => ({ ...c, extraPodXpCost: Number(e.target.value) }))} />
            <p className="text-xs text-muted-foreground mt-1">XP per extra pod beyond limit</p>
          </div>
        </div>
        <Button className="mt-4" onClick={() => toast({ title: "XP costs saved" })}><Save className="h-4 w-4 mr-1" /> Save costs</Button>
      </div>
    </div>
  );
}

// ─── Houses & Territories Tab ───────────────────────────────
function HousesTerritoriesTab() {
  const { toast } = useToast();
  const [topicsState, setTopicsState] = useState([...allTopics.map((t) => ({ ...t, isActive: true }))]);
  const [territoriesState, setTerritoriesState] = useState([...allTerritories.map((t) => ({ ...t, isActive: true }))]);
  const [stewardsState, setStewardsState] = useState<TopicSteward[]>([...allTopicStewards]);

  // New topic form
  const [newTopicName, setNewTopicName] = useState("");
  const [newTerritoryName, setNewTerritoryName] = useState("");
  const [newTerritoryLevel, setNewTerritoryLevel] = useState<TerritoryLevel>(TerritoryLevel.TOWN);

  // Steward assignment
  const [stewardTopicId, setStewardTopicId] = useState("");
  const [stewardUserId, setStewardUserId] = useState("");
  const [stewardRole, setStewardRole] = useState<TopicStewardRole>(TopicStewardRole.STEWARD);

  // Editing
  const [editTopicId, setEditTopicId] = useState<string | null>(null);
  const [editTopicName, setEditTopicName] = useState("");

  const addTopic = () => {
    if (!newTopicName.trim()) return;
    const slug = newTopicName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const t = { id: `t-${Date.now()}`, name: newTopicName.trim(), slug, isActive: true };
    setTopicsState((p) => [...p, t]);
    setNewTopicName("");
    toast({ title: "Topic created" });
  };

  const addTerritory = () => {
    if (!newTerritoryName.trim()) return;
    const t = { id: `tr-${Date.now()}`, name: newTerritoryName.trim(), level: newTerritoryLevel, isActive: true };
    setTerritoriesState((p) => [...p, t]);
    setNewTerritoryName("");
    toast({ title: "Territory created" });
  };

  const toggleTopicActive = (id: string) => setTopicsState((p) => p.map((t) => t.id === id ? { ...t, isActive: !t.isActive } : t));
  const toggleTerritoryActive = (id: string) => setTerritoriesState((p) => p.map((t) => t.id === id ? { ...t, isActive: !t.isActive } : t));

  const saveTopicName = (id: string) => {
    setTopicsState((p) => p.map((t) => t.id === id ? { ...t, name: editTopicName.trim() || t.name } : t));
    setEditTopicId(null);
    toast({ title: "Topic renamed" });
  };

  const addSteward = () => {
    if (!stewardTopicId || !stewardUserId) return;
    if (stewardsState.some((s) => s.topicId === stewardTopicId && s.userId === stewardUserId)) return;
    const ts: TopicSteward = { id: `ts-${Date.now()}`, topicId: stewardTopicId, userId: stewardUserId, role: stewardRole, createdAt: new Date().toISOString() };
    allTopicStewards.push(ts);
    setStewardsState([...allTopicStewards]);
    setStewardTopicId(""); setStewardUserId("");
    toast({ title: "Steward assigned" });
  };

  const removeSteward = (id: string) => {
    const idx = allTopicStewards.findIndex((s) => s.id === id);
    if (idx !== -1) allTopicStewards.splice(idx, 1);
    setStewardsState([...allTopicStewards]);
    toast({ title: "Steward removed" });
  };

  return (
    <div className="space-y-8">
      {/* Topics */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Hash className="h-5 w-5" /> Topics (Houses)</h3>
        <div className="flex gap-2 mb-3">
          <Input placeholder="New topic name…" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} className="max-w-xs" />
          <Button size="sm" onClick={addTopic} disabled={!newTopicName.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Stewards</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
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
                        {stewards.map((s) => {
                          const user = getUserById(s.userId);
                          return <Badge key={s.id} variant="secondary" className="text-xs">{user?.name} ({s.role.toLowerCase()})</Badge>;
                        })}
                        {stewards.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                    </TableCell>
                    <TableCell><Switch checked={topic.isActive} onCheckedChange={() => toggleTopicActive(topic.id)} /></TableCell>
                    <TableCell>
                      {editTopicId !== topic.id && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditTopicId(topic.id); setEditTopicName(topic.name); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      {/* Territories */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><MapPin className="h-5 w-5" /> Territories</h3>
        <div className="flex gap-2 mb-3">
          <Input placeholder="New territory name…" value={newTerritoryName} onChange={(e) => setNewTerritoryName(e.target.value)} className="max-w-xs" />
          <Select value={newTerritoryLevel} onValueChange={(v) => setNewTerritoryLevel(v as TerritoryLevel)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(TerritoryLevel).map((l) => <SelectItem key={l} value={l}>{l.toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addTerritory} disabled={!newTerritoryName.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
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

      {/* Stewards */}
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
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stewardsState.map((s) => {
                const topic = topicsState.find((t) => t.id === s.topicId);
                const user = getUserById(s.userId);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{topic?.name}</TableCell>
                    <TableCell className="text-sm">{user?.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize text-xs">{s.role.toLowerCase()}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeSteward(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {stewardsState.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No stewards assigned.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Governance & Featured Content Tab ──────────────────────
function GovernanceTab() {
  const { toast } = useToast();
  const [featuresState, setFeaturesState] = useState<TopicFeature[]>([...allTopicFeatures]);

  const removeFeature = (id: string) => {
    const idx = allTopicFeatures.findIndex((f) => f.id === id);
    if (idx !== -1) allTopicFeatures.splice(idx, 1);
    setFeaturesState([...allTopicFeatures]);
    toast({ title: "Feature removed" });
  };

  // Group features by topic
  const groupedByTopic = new Map<string, TopicFeature[]>();
  featuresState.forEach((f) => {
    const arr = groupedByTopic.get(f.topicId) || [];
    arr.push(f);
    groupedByTopic.set(f.topicId, arr);
  });

  return (
    <div className="space-y-6">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Star className="h-5 w-5" /> Featured Content by House</h3>

      {featuresState.length === 0 && <p className="text-sm text-muted-foreground">No featured content yet.</p>}

      {Array.from(groupedByTopic.entries()).map(([topicId, features]) => {
        const topic = allTopics.find((t) => t.id === topicId);
        return (
          <div key={topicId} className="rounded-xl border border-border bg-card p-5">
            <h4 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" /> {topic?.name ?? topicId}
            </h4>
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
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeFeature(f.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
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

// ─── Marketplace Tab ────────────────────────────────────────
function MarketplaceTab() {
  const { toast } = useToast();
  const [servicesState, setServicesState] = useState<Service[]>([...allServices]);
  const [bookingsState, setBookingsState] = useState<Booking[]>([...allBookings]);
  const [statusFilter, setStatusFilter] = useState("all");

  const toggleServiceActive = (id: string) => {
    setServicesState((p) => p.map((s) => s.id === id ? { ...s, isActive: !s.isActive } : s));
    toast({ title: "Service toggled" });
  };

  const setBookingStatus = (id: string, status: BookingStatus) => {
    setBookingsState((p) => p.map((b) => b.id === id ? { ...b, status } : b));
    toast({ title: `Booking set to ${status.toLowerCase()}` });
  };

  const setPaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    setBookingsState((p) => p.map((b) => b.id === id ? { ...b, paymentStatus } : b));
    toast({ title: `Payment set to ${paymentStatus.toLowerCase()}` });
  };

  const filteredBookings = bookingsState.filter((b) => statusFilter === "all" || b.status === statusFilter);

  return (
    <div className="space-y-8">
      {/* Services */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><ShoppingBag className="h-5 w-5" /> Services</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead>Active</TableHead>
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
      </div>

      <Separator />

      {/* Bookings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Bookings</h3>
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
                <TableHead>Service</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
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
                      <Select value={b.paymentStatus ?? PaymentStatus.NOT_REQUIRED} onValueChange={(v) => setPaymentStatus(b.id, v as PaymentStatus)}>
                        <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.values(PaymentStatus).map((s) => <SelectItem key={s} value={s}>{s.toLowerCase().replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-sm">{b.amount != null ? `${b.amount} ${b.currency}` : "—"}</TableCell>
                    <TableCell>
                      <Link to={`/services/${b.serviceId}`} className="text-xs text-primary hover:underline">View service</Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredBookings.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No bookings match filter.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Moderation Tab ─────────────────────────────────────────
function ModerationTab() {
  const { toast } = useToast();
  const [commentsState, setCommentsState] = useState(allComments.map((c) => ({ ...c, isDeleted: c.isDeleted ?? false })));
  const [, rerender] = useState(0);
  const refresh = () => rerender((n) => n + 1);

  const hideComment = (id: string) => {
    const c = commentsState.find((c) => c.id === id);
    if (!c) return;
    c.isDeleted = !c.isDeleted;
    c.deletedAt = c.isDeleted ? new Date().toISOString() : undefined;
    setCommentsState([...commentsState]);
    // sync mock
    const mc = allComments.find((x) => x.id === id);
    if (mc) { mc.isDeleted = c.isDeleted; mc.deletedAt = c.deletedAt; }
    toast({ title: "Comment visibility toggled" });
  };

  const sorted = [...commentsState].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const topUpvoted = [...commentsState].filter((c) => !c.isDeleted).sort((a, b) => b.upvoteCount - a.upvoteCount).slice(0, 5);

  const authorCounts = new Map<string, number>();
  commentsState.forEach((c) => authorCounts.set(c.authorId, (authorCounts.get(c.authorId) || 0) + 1));
  const topCommenters = Array.from(authorCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Soft-deleted items across all entity types
  type DeletedItem = { id: string; type: string; label: string; deletedAt?: string; deletedByUserId?: string };
  const deletedItems: DeletedItem[] = [
    ...allUsers.filter((u) => u.isDeleted).map((u) => ({ id: u.id, type: "User", label: u.name, deletedAt: u.deletedAt, deletedByUserId: u.deletedByUserId })),
    ...allGuilds.filter((g) => g.isDeleted).map((g) => ({ id: g.id, type: "Guild", label: g.name, deletedAt: g.deletedAt, deletedByUserId: g.deletedByUserId })),
    ...allQuests.filter((q) => q.isDeleted).map((q) => ({ id: q.id, type: "Quest", label: q.title, deletedAt: q.deletedAt, deletedByUserId: q.deletedByUserId })),
    ...allPods.filter((p) => p.isDeleted).map((p) => ({ id: p.id, type: "Pod", label: p.name, deletedAt: p.deletedAt, deletedByUserId: p.deletedByUserId })),
    ...allServices.filter((s) => s.isDeleted).map((s) => ({ id: s.id, type: "Service", label: s.title, deletedAt: s.deletedAt, deletedByUserId: s.deletedByUserId })),
    ...allBookings.filter((b) => b.isDeleted).map((b) => ({ id: b.id, type: "Booking", label: `Booking ${b.id}`, deletedAt: b.deletedAt, deletedByUserId: b.deletedByUserId })),
    ...allCompanies.filter((c) => c.isDeleted).map((c) => ({ id: c.id, type: "Company", label: c.name, deletedAt: c.deletedAt, deletedByUserId: c.deletedByUserId })),
    ...allComments.filter((c) => c.isDeleted).map((c) => ({ id: c.id, type: "Comment", label: c.content.slice(0, 50), deletedAt: c.deletedAt, deletedByUserId: c.deletedByUserId })),
    ...allQuestUpdates.filter((qu) => qu.isDeleted).map((qu) => ({ id: qu.id, type: "QuestUpdate", label: qu.title, deletedAt: qu.deletedAt, deletedByUserId: qu.deletedByUserId })),
  ].sort((a, b) => new Date(b.deletedAt ?? 0).getTime() - new Date(a.deletedAt ?? 0).getTime());

  const getArrayForType = (type: string): any[] => {
    const map: Record<string, any[]> = {
      User: allUsers, Guild: allGuilds, Quest: allQuests, Pod: allPods,
      Service: allServices, Booking: allBookings, Company: allCompanies,
      Comment: allComments, QuestUpdate: allQuestUpdates,
    };
    return map[type] ?? [];
  };

  const handleRestore = (item: DeletedItem) => {
    restoreItem(getArrayForType(item.type), item.id);
    if (item.type === "Comment") {
      setCommentsState((p) => p.map((c) => c.id === item.id ? { ...c, isDeleted: false, deletedAt: undefined, deletedByUserId: undefined } : c));
    }
    refresh();
    toast({ title: `${item.type} "${item.label}" restored` });
  };

  const handlePermanentDelete = (item: DeletedItem) => {
    permanentDelete(getArrayForType(item.type), item.id);
    if (item.type === "Comment") {
      setCommentsState((p) => p.filter((c) => c.id !== item.id));
    }
    refresh();
    toast({ title: `${item.type} "${item.label}" permanently deleted`, variant: "destructive" });
  };

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
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead>Deleted By</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedItems.map((item) => {
                  const deletedBy = item.deletedByUserId ? getUserById(item.deletedByUserId) : null;
                  return (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell><Badge variant="outline" className="text-xs">{item.type}</Badge></TableCell>
                      <TableCell className="font-medium text-sm">{item.label}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{deletedBy?.name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleRestore(item)}>
                            <Check className="h-3 w-3 mr-1" /> Restore
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => handlePermanentDelete(item)}>
                            <Trash2 className="h-3 w-3 mr-1" /> Purge
                          </Button>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{commentsState.length}</p>
          <p className="text-sm text-muted-foreground">Total comments</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{commentsState.filter((c) => c.isDeleted).length}</p>
          <p className="text-sm text-muted-foreground">Hidden</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{authorCounts.size}</p>
          <p className="text-sm text-muted-foreground">Unique authors</p>
        </div>
      </div>

      {/* Top commenters */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><TrendingUp className="h-5 w-5" /> Most Active Commenters</h3>
        <div className="flex flex-wrap gap-2">
          {topCommenters.map(([userId, count]) => {
            const user = getUserById(userId);
            return (
              <Badge key={userId} variant="secondary" className="text-sm py-1 px-3">
                {user?.name ?? userId} — {count} comments
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Top upvoted */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Star className="h-5 w-5" /> Most Upvoted</h3>
        <div className="space-y-2">
          {topUpvoted.map((c) => {
            const author = getUserById(c.authorId);
            return (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{author?.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">on {c.targetType.toLowerCase()}</span>
                  <p className="text-sm text-muted-foreground truncate">{c.content}</p>
                </div>
                <Badge variant="secondary" className="ml-2 shrink-0">{c.upvoteCount} ↑</Badge>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* All comments */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><MessageSquare className="h-5 w-5" /> All Comments</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Upvotes</TableHead>
                <TableHead>Visible</TableHead>
              </TableRow>
            </TableHeader>
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

// ─── Emails & Digests Tab ───────────────────────────────────
interface EmailTemplate {
  id: string; name: string; description: string; enabled: boolean;
  subject: string; introText: string;
}

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  { id: "welcome", name: "Welcome Email", description: "Sent when a new user signs up.", enabled: true, subject: "Welcome to the platform!", introText: "We're excited to have you join our community." },
  { id: "booking-provider", name: "Booking Confirmation (Provider)", description: "Sent to the provider when a booking is confirmed.", enabled: true, subject: "New booking confirmed", introText: "A new booking has been confirmed for your service." },
  { id: "booking-client", name: "Booking Confirmation (Client)", description: "Sent to the client when a booking is confirmed.", enabled: true, subject: "Your booking is confirmed", introText: "Your booking has been confirmed." },
  { id: "weekly-digest", name: "Weekly Digest", description: "Weekly summary of quests and updates in user's Houses.", enabled: true, subject: "Your weekly digest", introText: "Here's what happened this week in your Houses & Territories." },
  { id: "plan-upgrade", name: "Plan Upgrade", description: "Sent when a user upgrades their subscription plan.", enabled: true, subject: "Your plan has been upgraded!", introText: "Congratulations on upgrading your plan." },
  { id: "payment-failure", name: "Payment Failure", description: "Sent when a subscription payment fails.", enabled: true, subject: "Payment issue with your subscription", introText: "We were unable to process your payment." },
];

function EmailsDigestsTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editIntro, setEditIntro] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const toggleEnabled = (id: string) => {
    setTemplates((p) => p.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t));
    toast({ title: "Email template toggled" });
  };

  const startEdit = (t: EmailTemplate) => {
    setEditingId(t.id); setEditSubject(t.subject); setEditIntro(t.introText);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setTemplates((p) => p.map((t) => t.id === editingId ? { ...t, subject: editSubject, introText: editIntro } : t));
    setEditingId(null);
    toast({ title: "Template updated" });
  };

  const sendTest = (templateId: string) => {
    if (!testEmail.trim()) { toast({ title: "Enter a test email address", variant: "destructive" }); return; }
    toast({ title: `Test email sent to ${testEmail}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Mail className="h-5 w-5" /> Email Templates</h3>
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
                <Button size="sm" variant="outline" onClick={() => sendTest(tpl.id)} disabled={!tpl.enabled}>
                  <Send className="h-3.5 w-3.5 mr-1" /> Test
                </Button>
              </div>
            </div>

            {editingId === tpl.id ? (
              <div className="space-y-3 mt-3 border-t border-border pt-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Subject</label>
                  <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Intro Text</label>
                  <Textarea value={editIntro} onChange={(e) => setEditIntro(e.target.value)} className="resize-none min-h-[80px]" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {tpl.subject}</p>
                <p className="text-sm"><span className="text-muted-foreground">Intro:</span> {tpl.introText}</p>
                <Button size="sm" variant="ghost" className="mt-1" onClick={() => startEdit(tpl)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit template
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics Tab ──────────────────────────────────────────
function AnalyticsTab() {
  const totalUsers = allUsers.length;
  const totalQuests = allQuests.length;
  const totalPods = allPods.length;
  const totalBookings = allBookings.length;
  const totalServices = allServices.length;
  const totalXpAwarded = allUsers.reduce((sum, u) => sum + u.xp, 0);
  const totalRevenue = allBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);

  // Per-topic breakdown
  const topicStats = allTopics.map((topic) => {
    const qCount = questTopics.filter((qt) => qt.topicId === topic.id).length;
    const bCount = allBookings.filter((b) => {
      const svc = getServiceById(b.serviceId);
      return svc ? allServices.some((s) => s.id === svc.id) : false;
    });
    return { topic, quests: qCount };
  }).filter((t) => t.quests > 0).sort((a, b) => b.quests - a.quests).slice(0, 10);

  // Per-territory breakdown
  const territoryStats = allTerritories.map((territory) => {
    const qCount = questTerritories.filter((qt) => qt.territoryId === territory.id).length;
    return { territory, quests: qCount };
  }).filter((t) => t.quests > 0).sort((a, b) => b.quests - a.quests);

  return (
    <div className="space-y-8">
      {/* High-level metrics */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><BarChart3 className="h-5 w-5" /> Platform Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Users", value: totalUsers, icon: UsersIcon },
            { label: "Quests", value: totalQuests, icon: Compass },
            { label: "Pods", value: totalPods, icon: Hash },
            { label: "Services", value: totalServices, icon: ShoppingBag },
            { label: "Bookings", value: totalBookings, icon: CreditCard },
            { label: "Total XP Awarded", value: totalXpAwarded.toLocaleString(), icon: Zap },
            { label: "Marketplace Revenue", value: `€${totalRevenue}`, icon: TrendingUp },
            { label: "Guilds", value: allGuilds.length, icon: Shield },
          ].map((stat, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* By Topic */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Hash className="h-5 w-5" /> Quests by Topic</h3>
        <div className="space-y-2 max-w-lg">
          {topicStats.map(({ topic, quests }) => (
            <div key={topic.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <span className="text-sm font-medium">{topic.name}</span>
              <div className="flex items-center gap-2">
                <div className="h-2 rounded-full bg-primary/20 w-24 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (quests / Math.max(...topicStats.map((t) => t.quests))) * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold w-8 text-right">{quests}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* By Territory */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><MapPin className="h-5 w-5" /> Quests by Territory</h3>
        <div className="space-y-2 max-w-lg">
          {territoryStats.map(({ territory, quests }) => (
            <div key={territory.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div>
                <span className="text-sm font-medium">{territory.name}</span>
                <Badge variant="outline" className="ml-2 capitalize text-xs">{territory.level.toLowerCase()}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 rounded-full bg-primary/20 w-24 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (quests / Math.max(...territoryStats.map((t) => t.quests))) * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold w-8 text-right">{quests}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────
export default function AdminDashboard() {
  const currentUser = useCurrentUser();

  if (!isAdmin(currentUser.email)) {
    return <Navigate to="/" replace />;
  }

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2 mb-6">
          <LayoutDashboard className="h-7 w-7 text-primary" /> Admin Dashboard
        </h1>

        <Tabs defaultValue="users">
          <TabsList className="flex-wrap">
            <TabsTrigger value="users"><UsersIcon className="h-4 w-4 mr-1" /> Users & Roles</TabsTrigger>
            <TabsTrigger value="guilds"><Shield className="h-4 w-4 mr-1" /> Guilds</TabsTrigger>
            <TabsTrigger value="quests"><Compass className="h-4 w-4 mr-1" /> Quests</TabsTrigger>
            <TabsTrigger value="plans"><CreditCard className="h-4 w-4 mr-1" /> Plans & XP</TabsTrigger>
            <TabsTrigger value="houses"><Hash className="h-4 w-4 mr-1" /> Houses</TabsTrigger>
            <TabsTrigger value="governance"><Star className="h-4 w-4 mr-1" /> Governance</TabsTrigger>
            <TabsTrigger value="marketplace"><ShoppingBag className="h-4 w-4 mr-1" /> Marketplace</TabsTrigger>
            <TabsTrigger value="moderation"><AlertTriangle className="h-4 w-4 mr-1" /> Moderation</TabsTrigger>
            <TabsTrigger value="emails"><Mail className="h-4 w-4 mr-1" /> Emails</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6"><UsersRolesTab /></TabsContent>
          <TabsContent value="guilds" className="mt-6"><GuildsTab /></TabsContent>
          <TabsContent value="quests" className="mt-6"><QuestsTab /></TabsContent>
          <TabsContent value="plans" className="mt-6"><PlansXpTab /></TabsContent>
          <TabsContent value="houses" className="mt-6"><HousesTerritoriesTab /></TabsContent>
          <TabsContent value="governance" className="mt-6"><GovernanceTab /></TabsContent>
          <TabsContent value="marketplace" className="mt-6"><MarketplaceTab /></TabsContent>
          <TabsContent value="moderation" className="mt-6"><ModerationTab /></TabsContent>
          <TabsContent value="emails" className="mt-6"><EmailsDigestsTab /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><AnalyticsTab /></TabsContent>
        </Tabs>
      </motion.div>
    </PageShell>
  );
}
