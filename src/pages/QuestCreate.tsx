import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Compass, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { usePlanLimits, EXTRA_QUEST_XP_COST } from "@/hooks/usePlanLimits";
import { useRateLimit } from "@/hooks/useRateLimit";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { XpSpendDialog } from "@/components/XpSpendDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function QuestCreate() {
  const navigate = useNavigate();
  const { guildId, companyId } = useParams<{ guildId?: string; companyId?: string }>();
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const limits = usePlanLimits();
  const { checkRateLimit, isChecking } = useRateLimit();

  const { data: topics } = useTopics();
  const { data: territories } = useTerritories();

  // If guild context, fetch guild name
  const { data: guild } = useQuery({
    queryKey: ["guild-for-quest", guildId],
    enabled: !!guildId,
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("id, name").eq("id", guildId!).maybeSingle();
      return data;
    },
  });

  // If company context, fetch company name
  const { data: company } = useQuery({
    queryKey: ["company-for-quest", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").eq("id", companyId!).maybeSingle();
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardXp, setRewardXp] = useState("100");
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>();
  const [isDraft, setIsDraft] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [monetizationType, setMonetizationType] = useState("FREE");
  const [submitting, setSubmitting] = useState(false);
  const [showXpDialog, setShowXpDialog] = useState(false);

  const contextLabel = guild?.name ?? company?.name ?? "Personal";

  const doCreate = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      // Rate limit check
      const allowed = await checkRateLimit("quest_creation");
      if (!allowed) { setSubmitting(false); return; }

      const { data: quest, error } = await supabase
        .from("quests")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverImageUrl || null,
          status: "OPEN" as any,
          monetization_type: monetizationType as any,
          reward_xp: Number(rewardXp) || 100,
          is_featured: false,
          created_by_user_id: currentUser.id,
          guild_id: guildId || null,
          company_id: companyId || null,
          is_draft: isDraft,
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Failed to create quest", description: error.message, variant: "destructive" });
        return;
      }

      // Insert topic links
      if (selectedTopics.length > 0) {
        await supabase.from("quest_topics").insert(
          selectedTopics.map((topicId) => ({ quest_id: quest.id, topic_id: topicId }))
        );
      }

      // Insert territory links
      if (selectedTerritories.length > 0) {
        await supabase.from("quest_territories").insert(
          selectedTerritories.map((territoryId) => ({ quest_id: quest.id, territory_id: territoryId }))
        );
      }

      // Add creator as OWNER participant
      await supabase.from("quest_participants").insert({
        quest_id: quest.id,
        user_id: currentUser.id,
        role: "OWNER",
        status: "ACTIVE",
      });

      // Record weekly usage
      await limits.recordQuestCreation();

      qc.invalidateQueries({ queryKey: ["quests"] });
      if (guildId) qc.invalidateQueries({ queryKey: ["quests-for-guild", guildId] });
      toast({ title: "Quest created!" });
      navigate(`/quests/${quest.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (limits.questLimitReached) {
      setShowXpDialog(true);
    } else {
      doCreate();
    }
  };

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  const toggleTerritory = (id: string) => {
    setSelectedTerritories((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  return (
    <PageShell>
      <XpSpendDialog
        open={showXpDialog}
        onOpenChange={setShowXpDialog}
        canAfford={limits.canAffordExtraQuest}
        xpCost={EXTRA_QUEST_XP_COST}
        userXp={limits.userXp}
        actionLabel="create an extra quest"
        limitLabel="free quests for this week"
        onConfirm={async () => {
          const ok = await limits.spendXp(EXTRA_QUEST_XP_COST, "Extra quest creation", "QUEST");
          if (ok) doCreate();
        }}
      />

      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2 mb-2">
          <Compass className="h-7 w-7 text-primary" /> Create Quest
        </h1>
        <p className="text-muted-foreground mb-6">
          Creating under: <span className="font-medium text-foreground">{contextLabel}</span>
        </p>

        <div className="space-y-5">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quest title" className="mt-1" />
          </div>

          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this quest is about…" className="mt-1" rows={4} />
          </div>

          <div>
            <Label>Cover Image</Label>
            <div className="mt-1">
              <ImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reward">Reward XP</Label>
              <Input id="reward" type="number" value={rewardXp} onChange={(e) => setRewardXp(e.target.value)} min={0} className="mt-1" />
            </div>
            <div>
              <Label>Monetization</Label>
              <Select value={monetizationType} onValueChange={setMonetizationType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(topics ?? []).length > 0 && (
            <div>
              <Label>Topics</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(topics ?? []).map((t) => (
                  <Badge
                    key={t.id}
                    variant={selectedTopics.includes(t.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTopic(t.id)}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(territories ?? []).length > 0 && (
            <div>
              <Label>Territories</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(territories ?? []).map((t) => (
                  <Badge
                    key={t.id}
                    variant={selectedTerritories.includes(t.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTerritory(t.id)}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch id="draft" checked={isDraft} onCheckedChange={setIsDraft} />
            <Label htmlFor="draft">Save as draft</Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={!title.trim() || submitting || isChecking} className="flex-1">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isDraft ? "Save Draft" : "Create Quest"}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
