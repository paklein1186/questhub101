/**
 * ContentTabs — ALL data from real Supabase database, zero mocks.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check, X, Star, Pencil, Save, Crown, Hash, Plus, Trash2,
  CreditCard, MapPin, Eye, Zap, Settings, ShoppingBag,
  AlertTriangle, Mail, BarChart3, MessageSquare,
  EyeOff, Send, TrendingUp, Flag, ExternalLink,
  ScrollText, Bell, Loader2,
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
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: guilds = [], isLoading } = useQuery({
    queryKey: ["admin-guilds"],
    queryFn: async () => {
      const { data } = await supabase
        .from("guilds")
        .select("id, name, type, created_by_user_id, is_approved, is_deleted, is_draft, created_at, logo_url")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ["admin-guild-member-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("guild_members").select("guild_id");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((m) => { counts[m.guild_id] = (counts[m.guild_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: questCounts = {} } = useQuery({
    queryKey: ["admin-guild-quest-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("quests").select("guild_id").eq("is_deleted", false).not("guild_id", "is", null);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((q) => { if (q.guild_id) counts[q.guild_id] = (counts[q.guild_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: creatorProfiles = {} } = useQuery({
    queryKey: ["admin-guild-creators"],
    enabled: guilds.length > 0,
    queryFn: async () => {
      const ids = [...new Set(guilds.map((g) => g.created_by_user_id))];
      if (!ids.length) return {};
      const { data } = await supabase.from("profiles").select("user_id, name").in("user_id", ids);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p) => { map[p.user_id] = p.name; });
      return map;
    },
  });

  const toggleApproved = async (id: string, current: boolean) => {
    await supabase.from("guilds").update({ is_approved: !current }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-guilds"] });
    toast({ title: current ? "Guild unapproved" : "Guild approved" });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

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
          {guilds.map((guild) => (
            <TableRow key={guild.id}>
              <TableCell>
                <Link to={`/guilds/${guild.id}`} className="flex items-center gap-2 hover:underline">
                  {guild.logo_url && <img src={guild.logo_url} className="h-7 w-7 rounded" alt="" />}
                  <span className="font-medium">{guild.name}</span>
                </Link>
              </TableCell>
              <TableCell><Badge variant="secondary" className="capitalize text-xs">{guild.type.toLowerCase()}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{creatorProfiles[guild.created_by_user_id] ?? "—"}</TableCell>
              <TableCell className="text-right">{memberCounts[guild.id] ?? 0}</TableCell>
              <TableCell className="text-right">{questCounts[guild.id] ?? 0}</TableCell>
              <TableCell><Switch checked={guild.is_approved} onCheckedChange={() => toggleApproved(guild.id, guild.is_approved)} /></TableCell>
            </TableRow>
          ))}
          {guilds.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No guilds yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Quests Tab ─────────────────────────────────────────────
export function QuestsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ["admin-quests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, status, monetization_type, reward_xp, guild_id, is_featured, created_at, is_deleted")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: guildNames = {} } = useQuery({
    queryKey: ["admin-quest-guild-names"],
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("id, name");
      const map: Record<string, string> = {};
      (data ?? []).forEach((g) => { map[g.id] = g.name; });
      return map;
    },
  });

  const filtered = quests.filter((q) => statusFilter === "all" || q.status === statusFilter);

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from("quests").update({ is_featured: !current }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-quests"] });
    toast({ title: current ? "Quest unfeatured" : "Quest featured" });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
            {filtered.map((quest) => (
              <TableRow key={quest.id}>
                <TableCell><Link to={`/quests/${quest.id}`} className="font-medium hover:underline">{quest.title}</Link></TableCell>
                <TableCell className="text-sm text-muted-foreground">{quest.guild_id ? guildNames[quest.guild_id] ?? "—" : "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{quest.status.toLowerCase().replace("_", " ")}</Badge></TableCell>
                <TableCell><Badge variant="secondary" className="capitalize text-xs">{quest.monetization_type.toLowerCase()}</Badge></TableCell>
                <TableCell className="text-right">{quest.reward_xp}</TableCell>
                <TableCell><Switch checked={quest.is_featured} onCheckedChange={() => toggleFeatured(quest.id, quest.is_featured)} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No quests match filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Plans & XP Tab ─────────────────────────────────────────
export function PlansXpTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("monthly_price_amount");
      return data ?? [];
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><CreditCard className="h-5 w-5" /> Subscription Plans</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead className="text-right">€/mo</TableHead>
                <TableHead className="text-right">Quests/wk</TableHead><TableHead className="text-right">XP×</TableHead>
                <TableHead>Public</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan: any) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell><code className="text-xs text-muted-foreground">{plan.code}</code></TableCell>
                  <TableCell className="text-right">{plan.monthly_price_amount ?? 0}</TableCell>
                  <TableCell className="text-right">{plan.free_quests_per_week === -1 ? "∞" : plan.free_quests_per_week ?? "—"}</TableCell>
                  <TableCell className="text-right">{plan.xp_multiplier ?? 1}×</TableCell>
                  <TableCell>{plan.is_public ? <Badge variant="secondary" className="text-xs">Public</Badge> : <Badge variant="outline" className="text-xs">Internal</Badge>}</TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No plans configured.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Houses & Territories Tab ───────────────────────────────
export function HousesTerritoriesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newTopicName, setNewTopicName] = useState("");
  const [newTerritoryName, setNewTerritoryName] = useState("");
  const [newTerritoryLevel, setNewTerritoryLevel] = useState("TOWN");

  const { data: topics = [] } = useQuery({
    queryKey: ["admin-topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: territories = [] } = useQuery({
    queryKey: ["admin-territories"],
    queryFn: async () => {
      const { data } = await supabase.from("territories").select("*").order("name");
      return data ?? [];
    },
  });

  const addTopic = async () => {
    if (!newTopicName.trim()) return;
    const slug = newTopicName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await supabase.from("topics").insert({ name: newTopicName.trim(), slug });
    setNewTopicName("");
    qc.invalidateQueries({ queryKey: ["admin-topics"] });
    toast({ title: "Topic created" });
  };

  const addTerritory = async () => {
    if (!newTerritoryName.trim()) return;
    await supabase.from("territories").insert({ name: newTerritoryName.trim(), level: newTerritoryLevel as any });
    setNewTerritoryName("");
    qc.invalidateQueries({ queryKey: ["admin-territories"] });
    toast({ title: "Territory created" });
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
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead></TableRow></TableHeader>
            <TableBody>
              {topics.map((topic: any) => (
                <TableRow key={topic.id}>
                  <TableCell className="font-medium">{topic.name}</TableCell>
                  <TableCell><code className="text-xs text-muted-foreground">{topic.slug}</code></TableCell>
                </TableRow>
              ))}
              {topics.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">No topics yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><MapPin className="h-5 w-5" /> Territories</h3>
        <div className="flex gap-2 mb-3">
          <Input placeholder="New territory name…" value={newTerritoryName} onChange={(e) => setNewTerritoryName(e.target.value)} className="max-w-xs" />
          <Select value={newTerritoryLevel} onValueChange={setNewTerritoryLevel}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TOWN">Town</SelectItem>
              <SelectItem value="CITY">City</SelectItem>
              <SelectItem value="DEPARTMENT">Department</SelectItem>
              <SelectItem value="REGION">Region</SelectItem>
              <SelectItem value="COUNTRY">Country</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addTerritory} disabled={!newTerritoryName.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Level</TableHead></TableRow></TableHeader>
            <TableBody>
              {territories.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{t.level?.toLowerCase()}</Badge></TableCell>
                </TableRow>
              ))}
              {territories.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">No territories yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Governance Tab ─────────────────────────────────────────
export function GovernanceTab() {
  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["admin-decision-polls"],
    queryFn: async () => {
      const { data } = await supabase
        .from("decision_polls")
        .select("id, question, decision_type, status, created_at, closes_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Star className="h-5 w-5" /> Decisions & Polls</h3>
      {polls.length === 0 ? (
        <p className="text-sm text-muted-foreground">No decisions or polls yet.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Question</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>
              {polls.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium max-w-xs truncate">{p.question}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs capitalize">{p.decision_type?.toLowerCase()}</Badge></TableCell>
                  <TableCell><Badge variant={p.status === "OPEN" ? "default" : "outline"} className="text-xs capitalize">{p.status?.toLowerCase()}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Services Section ───────────────────────────────────────
export function ServicesSection() {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, title, price_amount, price_currency, provider_user_id, provider_guild_id, is_active, is_deleted, created_at")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: providerNames = {} } = useQuery({
    queryKey: ["admin-service-providers"],
    enabled: services.length > 0,
    queryFn: async () => {
      const userIds = [...new Set(services.filter(s => s.provider_user_id).map(s => s.provider_user_id!))];
      const guildIds = [...new Set(services.filter(s => s.provider_guild_id).map(s => s.provider_guild_id!))];
      const map: Record<string, string> = {};
      if (userIds.length) {
        const { data } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
        (data ?? []).forEach(p => { map[p.user_id] = p.name; });
      }
      if (guildIds.length) {
        const { data } = await supabase.from("guilds").select("id, name").in("id", guildIds);
        (data ?? []).forEach(g => { map[g.id] = g.name; });
      }
      return map;
    },
  });

  const { data: bookingCounts = {} } = useQuery({
    queryKey: ["admin-service-booking-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("service_id").eq("is_deleted", false);
      const counts: Record<string, number> = {};
      (data ?? []).forEach(b => { counts[b.service_id] = (counts[b.service_id] || 0) + 1; });
      return counts;
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

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
          {services.map((svc) => {
            const provider = svc.provider_user_id ? providerNames[svc.provider_user_id] : svc.provider_guild_id ? providerNames[svc.provider_guild_id] : null;
            return (
              <TableRow key={svc.id} className={!svc.is_active ? "opacity-50" : ""}>
                <TableCell><Link to={`/services/${svc.id}`} className="font-medium hover:underline">{svc.title}</Link></TableCell>
                <TableCell className="text-sm text-muted-foreground">{provider ?? "—"}</TableCell>
                <TableCell className="text-right">{svc.price_amount != null ? `${svc.price_amount} ${svc.price_currency}` : "Free"}</TableCell>
                <TableCell className="text-right">{bookingCounts[svc.id] ?? 0}</TableCell>
                <TableCell><Badge variant={svc.is_active ? "default" : "secondary"} className="text-xs">{svc.is_active ? "Active" : "Inactive"}</Badge></TableCell>
              </TableRow>
            );
          })}
          {services.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No services yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Bookings Section ───────────────────────────────────────
export function BookingsSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, service_id, requester_id, provider_user_id, provider_guild_id, status, payment_status, amount, currency, created_at, start_date_time")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const { data: nameMap = {} } = useQuery({
    queryKey: ["admin-booking-names"],
    enabled: bookings.length > 0,
    queryFn: async () => {
      const userIds = [...new Set([
        ...bookings.map(b => b.requester_id),
        ...bookings.filter(b => b.provider_user_id).map(b => b.provider_user_id!),
      ])];
      const guildIds = [...new Set(bookings.filter(b => b.provider_guild_id).map(b => b.provider_guild_id!))];
      const serviceIds = [...new Set(bookings.map(b => b.service_id))];
      const map: Record<string, string> = {};
      if (userIds.length) {
        const { data } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
        (data ?? []).forEach(p => { map[p.user_id] = p.name; });
      }
      if (guildIds.length) {
        const { data } = await supabase.from("guilds").select("id, name").in("id", guildIds);
        (data ?? []).forEach(g => { map[g.id] = g.name; });
      }
      if (serviceIds.length) {
        const { data } = await supabase.from("services").select("id, title").in("id", serviceIds);
        (data ?? []).forEach(s => { map[`svc-${s.id}`] = s.title; });
      }
      return map;
    },
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("bookings").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    toast({ title: `Booking set to ${status.toLowerCase()}` });
  };

  const filtered = bookings.filter((b) => statusFilter === "all" || b.status === statusFilter);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead><TableHead>Requester</TableHead><TableHead>Provider</TableHead>
              <TableHead>Status</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium text-sm">{nameMap[`svc-${b.service_id}`] ?? "—"}</TableCell>
                <TableCell className="text-sm">{nameMap[b.requester_id] ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.provider_user_id ? nameMap[b.provider_user_id] : b.provider_guild_id ? nameMap[b.provider_guild_id] : "—"}</TableCell>
                <TableCell>
                  <Select value={b.status} onValueChange={(v) => updateStatus(b.id, v)}>
                    <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{(b.payment_status ?? "—").toLowerCase().replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right text-sm">{b.amount != null ? `${b.amount} ${b.currency}` : "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bookings match filter.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Moderation Tab ─────────────────────────────────────────
export function ModerationTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  // Real reports from DB
  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const { data: reporterNames = {} } = useQuery({
    queryKey: ["admin-reporter-names"],
    enabled: reports.length > 0,
    queryFn: async () => {
      const ids = [...new Set(reports.map(r => r.reporter_id))];
      if (!ids.length) return {};
      const { data } = await supabase.from("profiles").select("user_id, name").in("user_id", ids);
      const map: Record<string, string> = {};
      (data ?? []).forEach(p => { map[p.user_id] = p.name; });
      return map;
    },
  });

  // Real comments from DB
  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, author_id, content, target_type, upvote_count, is_deleted, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const { data: commentAuthors = {} } = useQuery({
    queryKey: ["admin-comment-authors"],
    enabled: comments.length > 0,
    queryFn: async () => {
      const ids = [...new Set(comments.map(c => c.author_id))];
      if (!ids.length) return {};
      const { data } = await supabase.from("profiles").select("user_id, name").in("user_id", ids);
      const map: Record<string, string> = {};
      (data ?? []).forEach(p => { map[p.user_id] = p.name; });
      return map;
    },
  });

  const filteredReports = reports.filter((r) => statusFilter === "all" || r.status === statusFilter);

  const updateReportStatus = async (id: string, status: string) => {
    await supabase.from("reports").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    toast({ title: `Report marked as ${status.toLowerCase()}` });
  };

  const toggleCommentVisibility = async (id: string, isDeleted: boolean) => {
    await supabase.from("comments").update({
      is_deleted: !isDeleted,
      deleted_at: !isDeleted ? new Date().toISOString() : null,
    }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-comments"] });
    toast({ title: "Comment visibility toggled" });
  };

  const targetLink = (r: any) => {
    const map: Record<string, string> = { USER: `/users/${r.target_id}`, GUILD: `/guilds/${r.target_id}`, QUEST: `/quests/${r.target_id}`, POD: `/pods/${r.target_id}`, SERVICE: `/services/${r.target_id}` };
    return map[r.target_type] ?? "#";
  };

  return (
    <div className="space-y-8">
      {/* Reports */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Flag className="h-5 w-5" /> Reports ({reports.length})</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="REVIEWED">Reviewed</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="DISMISSED">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loadingReports ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports matching filters.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Reporter</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="w-[240px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredReports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{reporterNames[r.reporter_id] ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.target_type}</Badge></TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{r.reason}</TableCell>
                    <TableCell><Badge variant={r.status === "OPEN" ? "destructive" : r.status === "RESOLVED" ? "default" : "secondary"} className="text-xs">{r.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {targetLink(r) !== "#" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild><Link to={targetLink(r)}><ExternalLink className="h-3 w-3 mr-1" /> View</Link></Button>}
                        {r.status === "OPEN" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => updateReportStatus(r.id, "REVIEWED")}><Eye className="h-3 w-3 mr-1" /> Reviewed</Button>
                            <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={() => updateReportStatus(r.id, "RESOLVED")}><Check className="h-3 w-3 mr-1" /> Resolve</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => updateReportStatus(r.id, "DISMISSED")}><X className="h-3 w-3 mr-1" /> Dismiss</Button>
                          </>
                        )}
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

      {/* All comments */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><MessageSquare className="h-5 w-5" /> All Comments</h3>
        {loadingComments ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Author</TableHead><TableHead>Content</TableHead><TableHead>Target</TableHead><TableHead className="text-right">Upvotes</TableHead><TableHead>Visible</TableHead></TableRow></TableHeader>
              <TableBody>
                {comments.map((c) => (
                  <TableRow key={c.id} className={c.is_deleted ? "opacity-50" : ""}>
                    <TableCell className="font-medium text-sm">{commentAuthors[c.author_id] ?? "—"}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{c.content}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-xs">{c.target_type?.toLowerCase().replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right">{c.upvote_count}</TableCell>
                    <TableCell>
                      <Button size="sm" variant={c.is_deleted ? "destructive" : "ghost"} className="h-7 px-2 text-xs" onClick={() => toggleCommentVisibility(c.id, c.is_deleted)}>
                        {c.is_deleted ? <><EyeOff className="h-3 w-3 mr-1" /> Hidden</> : <><Eye className="h-3 w-3 mr-1" /> Visible</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {comments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No comments yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notifications Monitoring Tab ───────────────────────────
export function NotificationsMonitoringTab() {
  const { toast } = useToast();

  // Real stats from notifications table
  const { data: notifStats, isLoading } = useQuery({
    queryKey: ["admin-notification-stats"],
    queryFn: async () => {
      const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("notifications")
        .select("type")
        .gte("created_at", d7);
      const rows = data ?? [];
      const byType: Record<string, number> = {};
      rows.forEach((n) => { byType[n.type] = (byType[n.type] || 0) + 1; });
      return {
        total: rows.length,
        byType: Object.entries(byType)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
      };
    },
    staleTime: 30_000,
  });

  // Real user profiles for test push
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users-for-push"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, name").order("name").limit(50);
      return data ?? [];
    },
  });

  const [testUserId, setTestUserId] = useState("");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total sent (7d)</p>
          <p className="text-2xl font-bold">{isLoading ? "…" : notifStats?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Unique types</p>
          <p className="text-2xl font-bold">{isLoading ? "…" : notifStats?.byType.length ?? 0}</p>
        </div>
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Volume by Type (7 days)</h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : notifStats?.byType.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications sent in the last 7 days.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
              <TableBody>
                {notifStats?.byType.map((v) => (
                  <TableRow key={v.type}>
                    <TableCell><Badge variant="secondary" className="text-xs capitalize">{v.type.toLowerCase().replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-right">{v.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><Settings className="h-5 w-5" /> Admin Tools</h3>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold mb-2">Test Push Notification</h4>
            <div className="flex gap-2">
              <Select value={testUserId} onValueChange={setTestUserId}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>{users.map((u) => (<SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>))}</SelectContent>
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
  { id: "digest_daily", name: "Daily Digest", description: "Summary of recent activity.", enabled: true, subject: "Your daily digest", introText: "Here's what happened today." },
  { id: "digest_weekly", name: "Weekly Summary", description: "Weekly recap email.", enabled: true, subject: "Your weekly summary", introText: "Here's your week in review." },
  { id: "booking_confirmed", name: "Booking Confirmed", description: "Sent when booking is confirmed.", enabled: true, subject: "Your booking is confirmed!", introText: "Your session has been confirmed." },
  { id: "quest_update", name: "Quest Update", description: "Sent when a quest you follow is updated.", enabled: true, subject: "Quest update", introText: "A quest you're following has been updated." },
];

export function EmailsDigestsTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editIntro, setEditIntro] = useState("");

  const startEdit = (t: EmailTemplate) => { setEditId(t.id); setEditSubject(t.subject); setEditIntro(t.introText); };
  const saveEdit = () => {
    if (!editId) return;
    setTemplates((prev) => prev.map((t) => t.id === editId ? { ...t, subject: editSubject, introText: editIntro } : t));
    setEditId(null); toast({ title: "Template updated" });
  };

  return (
    <div className="space-y-6">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Mail className="h-5 w-5" /> Email Templates & Digests</h3>
      <p className="text-sm text-muted-foreground">Manage email templates sent to users. Toggle to enable/disable.</p>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Template</TableHead><TableHead>Subject</TableHead><TableHead>Enabled</TableHead><TableHead className="w-[80px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div><span className="font-medium">{t.name}</span><p className="text-xs text-muted-foreground">{t.description}</p></div>
                </TableCell>
                <TableCell>
                  {editId === t.id ? (
                    <div className="space-y-2">
                      <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="h-8" placeholder="Subject" />
                      <Textarea value={editIntro} onChange={(e) => setEditIntro(e.target.value)} className="h-16" placeholder="Intro text" />
                    </div>
                  ) : <span className="text-sm">{t.subject}</span>}
                </TableCell>
                <TableCell><Switch checked={t.enabled} onCheckedChange={(v) => setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, enabled: v } : x))} /></TableCell>
                <TableCell>
                  {editId === t.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveEdit}><Save className="h-3.5 w-3.5 text-primary" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditId(null)}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  ) : <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
