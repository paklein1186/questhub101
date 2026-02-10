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
            <TabsTrigger value="houses"><Hash className="h-4 w-4 mr-1" /> Houses & Territories</TabsTrigger>
            <TabsTrigger value="governance"><Star className="h-4 w-4 mr-1" /> Governance</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6"><UsersRolesTab /></TabsContent>
          <TabsContent value="guilds" className="mt-6"><GuildsTab /></TabsContent>
          <TabsContent value="quests" className="mt-6"><QuestsTab /></TabsContent>
          <TabsContent value="plans" className="mt-6"><PlansXpTab /></TabsContent>
          <TabsContent value="houses" className="mt-6"><HousesTerritoriesTab /></TabsContent>
          <TabsContent value="governance" className="mt-6"><GovernanceTab /></TabsContent>
        </Tabs>
      </motion.div>
    </PageShell>
  );
}
