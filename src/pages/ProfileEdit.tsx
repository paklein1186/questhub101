import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/enums";
import {
  users, topics, territories, userTopics, userTerritories,
} from "@/data/mock";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function ProfileEdit() {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(currentUser.name);
  const [headline, setHeadline] = useState(currentUser.headline ?? "");
  const [bio, setBio] = useState(currentUser.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl ?? "");
  const [role, setRole] = useState<UserRole>(currentUser.role);

  const currentTopicIds = userTopics
    .filter((ut) => ut.userId === currentUser.id)
    .map((ut) => ut.topicId);
  const currentTerritoryIds = userTerritories
    .filter((ut) => ut.userId === currentUser.id)
    .map((ut) => ut.territoryId);

  const [selectedTopics, setSelectedTopics] = useState<string[]>(currentTopicIds);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(currentTerritoryIds);

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
    // Update user in mock
    const userIndex = users.findIndex((u) => u.id === currentUser.id);
    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        name: name.trim() || currentUser.name,
        headline: headline.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        role,
      };
    }

    // Update topic relations
    const existingUTs = userTopics.filter((ut) => ut.userId === currentUser.id);
    existingUTs.forEach((ut) => {
      const idx = userTopics.indexOf(ut);
      if (idx !== -1) userTopics.splice(idx, 1);
    });
    selectedTopics.forEach((topicId, i) => {
      userTopics.push({
        id: `ut-${Date.now()}-${i}`,
        userId: currentUser.id,
        topicId,
      });
    });

    // Update territory relations
    const existingUTrs = userTerritories.filter((ut) => ut.userId === currentUser.id);
    existingUTrs.forEach((ut) => {
      const idx = userTerritories.indexOf(ut);
      if (idx !== -1) userTerritories.splice(idx, 1);
    });
    selectedTerritories.forEach((territoryId, i) => {
      userTerritories.push({
        id: `utr-${Date.now()}-${i}`,
        userId: currentUser.id,
        territoryId,
      });
    });

    toast({ title: "Profile updated!" });
    navigate(`/users/${currentUser.id}`);
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/users/${currentUser.id}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to profile</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold mb-6">Edit Profile</h1>

        {/* Read-only stats */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-muted/50 border border-border">
          <span className="flex items-center gap-1 text-sm font-semibold text-primary">
            <Zap className="h-4 w-4" /> {currentUser.xp} XP
          </span>
          <span className="text-sm text-muted-foreground">Contribution Index: {currentUser.contributionIndex}</span>
        </div>

        <div className="space-y-6 max-w-lg">
          {/* Avatar */}
          <div>
            <label className="text-sm font-medium mb-2 block">Avatar URL</label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-xl">{name[0]}</AvatarFallback>
              </Avatar>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="flex-1" />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>

          {/* Headline */}
          <div>
            <label className="text-sm font-medium mb-1 block">Headline</label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Community Builder" maxLength={120} />
          </div>

          {/* Bio */}
          <div>
            <label className="text-sm font-medium mb-1 block">Bio</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself…" maxLength={500} className="resize-none min-h-[100px]" />
          </div>

          {/* Role */}
          <div>
            <label className="text-sm font-medium mb-1 block">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.GAMECHANGER}>Gamechanger</SelectItem>
                <SelectItem value={UserRole.ECOSYSTEM_BUILDER}>Ecosystem Builder</SelectItem>
                <SelectItem value={UserRole.BOTH}>Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Topics */}
          <div>
            <label className="text-sm font-medium mb-2 block">Topics (Houses)</label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card max-h-48 overflow-y-auto">
              {topics.map((t) => {
                const selected = selectedTopics.includes(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={selected} onCheckedChange={() => toggleTopic(t.id)} />
                    <span className="text-sm">{t.name}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selectedTopics.length} selected</p>
          </div>

          {/* Territories */}
          <div>
            <label className="text-sm font-medium mb-2 block">Territories</label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-card">
              {territories.map((t) => {
                const selected = selectedTerritories.includes(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={selected} onCheckedChange={() => toggleTerritory(t.id)} />
                    <span className="text-sm">{t.name} <span className="text-muted-foreground text-xs">({t.level.toLowerCase()})</span></span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selectedTerritories.length} selected</p>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" /> Save changes
          </Button>
        </div>
      </motion.div>
    </PageShell>
  );
}
