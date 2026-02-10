import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Trash2, UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { GuildType, GuildMemberRole } from "@/types/enums";
import {
  getGuildById, guilds, topics, territories, guildTopics, guildTerritories,
  guildMembers, users, getUserById, getMembersForGuild,
} from "@/data/mock";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function GuildEdit() {
  const { id } = useParams<{ id: string }>();
  const guild = getGuildById(id!);
  const currentUser = useCurrentUser();

  if (!guild) return <PageShell><p>Guild not found.</p></PageShell>;

  const currentMembership = guildMembers.find(
    (gm) => gm.guildId === guild.id && gm.userId === currentUser.id
  );
  if (currentMembership?.role !== GuildMemberRole.ADMIN) {
    return <PageShell><p>You must be an admin of this guild to edit it.</p></PageShell>;
  }

  return <GuildEditForm guildId={guild.id} />;
}

function GuildEditForm({ guildId }: { guildId: string }) {
  const guild = getGuildById(guildId)!;
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(guild.name);
  const [logoUrl, setLogoUrl] = useState(guild.logoUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(guild.bannerUrl ?? "");
  const [description, setDescription] = useState(guild.description ?? "");
  const [type, setType] = useState<GuildType>(guild.type);

  const currentTopicIds = guildTopics.filter((gt) => gt.guildId === guildId).map((gt) => gt.topicId);
  const currentTerritoryIds = guildTerritories.filter((gt) => gt.guildId === guildId).map((gt) => gt.territoryId);

  const [selectedTopics, setSelectedTopics] = useState<string[]>(currentTopicIds);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(currentTerritoryIds);
  const [members, setMembers] = useState(() => getMembersForGuild(guildId));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const toggleTerritory = (territoryId: string) => {
    setSelectedTerritories((prev) =>
      prev.includes(territoryId) ? prev.filter((id) => id !== territoryId) : [...prev, territoryId]
    );
  };

  const handleSave = () => {
    const target = guilds.find((g) => g.id === guildId);
    if (target) {
      target.name = name.trim() || guild.name;
      target.logoUrl = logoUrl.trim() || undefined;
      target.bannerUrl = bannerUrl.trim() || undefined;
      target.description = description.trim() || undefined;
      target.type = type;
    }

    // Update topic relations
    const existing = guildTopics.filter((gt) => gt.guildId === guildId);
    existing.forEach((gt) => {
      const i = guildTopics.indexOf(gt);
      if (i !== -1) guildTopics.splice(i, 1);
    });
    selectedTopics.forEach((topicId, i) => {
      guildTopics.push({ id: `gt-${Date.now()}-${i}`, guildId, topicId });
    });

    // Update territory relations
    const existingT = guildTerritories.filter((gt) => gt.guildId === guildId);
    existingT.forEach((gt) => {
      const i = guildTerritories.indexOf(gt);
      if (i !== -1) guildTerritories.splice(i, 1);
    });
    selectedTerritories.forEach((territoryId, i) => {
      guildTerritories.push({ id: `gtr-${Date.now()}-${i}`, guildId, territoryId });
    });

    toast({ title: "Guild updated!" });
    navigate(`/guilds/${guildId}`);
  };

  const inviteMember = () => {
    if (!inviteUserId) return;
    const already = guildMembers.some((gm) => gm.guildId === guildId && gm.userId === inviteUserId);
    if (already) {
      toast({ title: "Already a member", variant: "destructive" });
      return;
    }
    const newMember = {
      id: `gm-${Date.now()}`,
      guildId,
      userId: inviteUserId,
      role: GuildMemberRole.MEMBER,
      joinedAt: new Date().toISOString(),
    };
    guildMembers.push(newMember);
    setMembers((prev) => [...prev, { ...newMember, user: getUserById(inviteUserId) }]);
    setInviteUserId("");
    setInviteOpen(false);
    toast({ title: "Member added!" });
  };

  const toggleMemberRole = (memberId: string) => {
    const gm = guildMembers.find((m) => m.id === memberId);
    if (!gm) return;
    gm.role = gm.role === GuildMemberRole.ADMIN ? GuildMemberRole.MEMBER : GuildMemberRole.ADMIN;
    setMembers(getMembersForGuild(guildId));
    toast({ title: `Role changed to ${gm.role.toLowerCase()}` });
  };

  const removeMember = (memberId: string) => {
    const gm = guildMembers.find((m) => m.id === memberId);
    if (!gm || gm.userId === currentUser.id) return;
    const idx = guildMembers.indexOf(gm);
    if (idx !== -1) guildMembers.splice(idx, 1);
    setMembers(getMembersForGuild(guildId));
    toast({ title: "Member removed" });
  };

  const nonMembers = users.filter(
    (u) => !guildMembers.some((gm) => gm.guildId === guildId && gm.userId === u.id)
  );

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/guilds/${guildId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to guild</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold mb-2">Edit Guild</h1>

        <div className="flex items-center gap-2 mb-6">
          {guild.isApproved ? (
            <Badge className="bg-primary/10 text-primary border-0"><ShieldCheck className="h-3 w-3 mr-1" /> Approved</Badge>
          ) : (
            <Badge variant="outline">Pending approval (admin only)</Badge>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Guild info */}
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>

            <ImageUpload
              label="Logo"
              currentImageUrl={logoUrl || undefined}
              onChange={(url) => setLogoUrl(url ?? "")}
              aspectRatio="1/1"
              description="Square logo, recommended 256×256"
            />

            <ImageUpload
              label="Banner (optional)"
              currentImageUrl={bannerUrl || undefined}
              onChange={(url) => setBannerUrl(url ?? "")}
              aspectRatio="16/9"
              description="Wide banner, recommended 1200×400"
            />

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="resize-none min-h-[120px]" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as GuildType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={GuildType.GUILD}>Guild</SelectItem>
                  <SelectItem value={GuildType.NETWORK}>Network</SelectItem>
                  <SelectItem value={GuildType.COLLECTIVE}>Collective</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Topics */}
            <div>
              <label className="text-sm font-medium mb-2 block">Topics (Houses)</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card max-h-48 overflow-y-auto">
                {topics.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={selectedTopics.includes(t.id)} onCheckedChange={() => toggleTopic(t.id)} />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedTopics.length} selected</p>
            </div>

            {/* Territories */}
            <div>
              <label className="text-sm font-medium mb-2 block">Territories</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card">
                {territories.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={selectedTerritories.includes(t.id)} onCheckedChange={() => toggleTerritory(t.id)} />
                    <span className="text-sm">{t.name} <span className="text-muted-foreground text-xs">({t.level.toLowerCase()})</span></span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedTerritories.length} selected</p>
            </div>

            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" /> Save changes
            </Button>
          </div>

          {/* Right: Members management */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Members ({members.length})</h2>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Add member</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <Select value={inviteUserId} onValueChange={setInviteUserId}>
                      <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                      <SelectContent>
                        {nonMembers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={inviteMember} disabled={!inviteUserId} className="w-full">Add to guild</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={m.user?.avatarUrl} />
                    <AvatarFallback>{m.user?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.user?.name}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{m.role.toLowerCase()}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => toggleMemberRole(m.id)}
                      title={m.role === GuildMemberRole.ADMIN ? "Demote to member" : "Promote to admin"}
                    >
                      {m.role === GuildMemberRole.ADMIN ? "Demote" : "Promote"}
                    </Button>
                    {m.userId !== currentUser.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-destructive"
                        onClick={() => removeMember(m.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </PageShell>
  );
}
