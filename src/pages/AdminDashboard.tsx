import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users as UsersIcon, Shield, Compass, Check, X,
  Star, Pencil, Save, ChevronDown,
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
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isAdmin } from "@/lib/admin";
import { useXP } from "@/hooks/useXP";
import {
  users as allUsers, guilds as allGuilds, quests as allQuests,
  topics, territories,
  guildMembers, userTopics, userTerritories,
  questTopics, questTerritories,
  getUserById, getQuestsForGuild,
} from "@/data/mock";
import { UserRole, QuestStatus, MonetizationType } from "@/types/enums";
import type { User, Guild, Quest } from "@/types";

// ─── Users Tab ───────────────────────────────────────────────
function UsersTab() {
  const [usersState, setUsersState] = useState<User[]>(allUsers);
  const [roleFilter, setRoleFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editXp, setEditXp] = useState(0);
  const [editCI, setEditCI] = useState(0);
  const { setXpManual } = useXP();

  const filtered = usersState.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (topicFilter !== "all" && !userTopics.some((ut) => ut.userId === u.id && ut.topicId === topicFilter)) return false;
    if (territoryFilter !== "all" && !userTerritories.some((ut) => ut.userId === u.id && ut.territoryId === territoryFilter)) return false;
    return true;
  });

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditXp(u.xp);
    setEditCI(u.contributionIndex);
  };

  const saveEdit = (id: string) => {
    setUsersState((prev) =>
      prev.map((u) => (u.id === id ? { ...u, xp: editXp, contributionIndex: editCI } : u))
    );
    setEditingId(null);
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
            {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Territory" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-xs">{user.role.toLowerCase().replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === user.id ? (
                    <Input type="number" value={editXp} onChange={(e) => setEditXp(Number(e.target.value))} className="w-20 h-8 text-right ml-auto" />
                  ) : (
                    user.xp
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === user.id ? (
                    <Input type="number" value={editCI} onChange={(e) => setEditCI(Number(e.target.value))} className="w-20 h-8 text-right ml-auto" />
                  ) : (
                    user.contributionIndex
                  )}
                </TableCell>
                <TableCell>
                  {editingId === user.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(user.id)}>
                        <Save className="h-3.5 w-3.5 text-success" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(user)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users match filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Guilds Tab ──────────────────────────────────────────────
function GuildsTab() {
  const [guildsState, setGuildsState] = useState<Guild[]>(allGuilds);

  const toggleApproved = (id: string) => {
    setGuildsState((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isApproved: !g.isApproved } : g))
    );
  };

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
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-xs">{guild.type.toLowerCase()}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{creator?.name}</TableCell>
                <TableCell className="text-right">{memberCount}</TableCell>
                <TableCell className="text-right">{questCount}</TableCell>
                <TableCell>
                  <Switch checked={guild.isApproved} onCheckedChange={() => toggleApproved(guild.id)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Quests Tab ──────────────────────────────────────────────
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

  const toggleFeatured = (id: string) => {
    setQuestsState((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isFeatured: !q.isFeatured } : q))
    );
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
            {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Territory" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{quest.status.toLowerCase().replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">{quest.monetizationType.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{quest.rewardXp}</TableCell>
                  <TableCell>
                    <Switch checked={quest.isFeatured} onCheckedChange={() => toggleFeatured(quest.id)} />
                  </TableCell>
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

// ─── Main Dashboard ──────────────────────────────────────────
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
          <TabsList>
            <TabsTrigger value="users"><UsersIcon className="h-4 w-4 mr-1" /> Users</TabsTrigger>
            <TabsTrigger value="guilds"><Shield className="h-4 w-4 mr-1" /> Guilds</TabsTrigger>
            <TabsTrigger value="quests"><Compass className="h-4 w-4 mr-1" /> Quests</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
          <TabsContent value="guilds" className="mt-6"><GuildsTab /></TabsContent>
          <TabsContent value="quests" className="mt-6"><QuestsTab /></TabsContent>
        </Tabs>
      </motion.div>
    </PageShell>
  );
}
