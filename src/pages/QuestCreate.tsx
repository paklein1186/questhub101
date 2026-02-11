import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Compass, Loader2, Sparkles, X, RotateCcw, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { usePlanLimits, EXTRA_QUEST_CREDIT_COST } from "@/hooks/usePlanLimits";
import { useRateLimit } from "@/hooks/useRateLimit";
import { useXpCredits } from "@/hooks/useXpCredits";
import { usePersona } from "@/hooks/usePersona";
import { XP_EVENT_TYPES } from "@/lib/xpCreditsConfig";
import { CommissionEstimator } from "@/components/quest/CommissionEstimator";
import { PageShell } from "@/components/PageShell";
import { autoFollowEntity } from "@/hooks/useFollow";
import { ImageUpload } from "@/components/ImageUpload";
import { XpSpendDialog } from "@/components/XpSpendDialog";
import { useAcceptedPartners } from "@/hooks/useQuestHosts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Shield, Building2, Handshake, X as XIcon } from "lucide-react";

interface AiSuggestion {
  description: string;
  subtasks: { title: string; description: string }[];
  rewardXp: number;
  creditBudget: number;
  suggestedHouses: string[];
  suggestedTerritories: string[];
  suggestedCollaborators: string[];
  fundingGoal: number | null;
  microcopy: string;
}

export default function QuestCreate() {
  const navigate = useNavigate();
  const { guildId, companyId } = useParams<{ guildId?: string; companyId?: string }>();
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const limits = usePlanLimits();
  const { checkRateLimit, isChecking } = useRateLimit();
  const { grantXp } = useXpCredits();
  const { persona } = usePersona();

  const { data: topics } = useTopics();
  const { data: territories } = useTerritories();

  const { data: guild } = useQuery({
    queryKey: ["guild-for-quest", guildId],
    enabled: !!guildId,
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("id, name").eq("id", guildId!).maybeSingle();
      return data;
    },
  });

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
  const [isMonetized, setIsMonetized] = useState(false);
  const [creditReward, setCreditReward] = useState("0");
  const [priceFiat, setPriceFiat] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [showXpDialog, setShowXpDialog] = useState(false);
  const [creditBudget, setCreditBudget] = useState("0");
  const [allowFundraising, setAllowFundraising] = useState(false);
  const [fundingGoalCredits, setFundingGoalCredits] = useState("");
  const [openForProposals, setOpenForProposals] = useState(false);
  const [missionBudgetMin, setMissionBudgetMin] = useState("");
  const [missionBudgetMax, setMissionBudgetMax] = useState("");
  const [paymentType, setPaymentType] = useState("INVOICE");

  // Co-hosts state
  const primaryEntityType = guildId ? "GUILD" as const : companyId ? "COMPANY" as const : undefined;
  const primaryEntityId = guildId || companyId || undefined;
  const { data: availablePartners } = useAcceptedPartners(primaryEntityType, primaryEntityId);
  const [selectedCoHosts, setSelectedCoHosts] = useState<{ entityType: "GUILD" | "COMPANY"; entityId: string; name: string; logo_url: string | null }[]>([]);

  // AI state
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiSubtasks, setAiSubtasks] = useState<{ title: string; description: string; accepted: boolean }[]>([]);

  const contextLabel = guild?.name ?? company?.name ?? "Personal";

  const generateWithAI = async () => {
    if (!title.trim()) {
      toast({ title: "Enter a title first", description: "The AI needs at least a quest title to generate suggestions.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const houseNames = (topics ?? []).filter(t => selectedTopics.includes(t.id)).map(t => t.name);
      const territoryNames = (territories ?? []).filter(t => selectedTerritories.includes(t.id)).map(t => t.name);

      const { data, error } = await supabase.functions.invoke("quest-assist", {
        body: {
          title: title.trim(),
          keywords: aiKeywords.trim(),
          persona,
          houses: houseNames,
          territories: territoryNames,
          xpLevel: (currentUser as any)?.xp_level ?? 1,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI unavailable", description: data.error, variant: "destructive" });
        return;
      }

      setAiSuggestion(data);
      setAiSubtasks((data.subtasks || []).map((s: any) => ({ ...s, accepted: true })));
      toast({ title: "AI suggestions ready!", description: data.microcopy || "Review and edit below." });
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const acceptDescription = () => {
    if (aiSuggestion) setDescription(aiSuggestion.description);
    toast({ title: "Description applied" });
  };

  const acceptXpAndBudget = () => {
    if (!aiSuggestion) return;
    setRewardXp(String(aiSuggestion.rewardXp));
    if (aiSuggestion.creditBudget > 0) {
      setCreditBudget(String(aiSuggestion.creditBudget));
      setOpenForProposals(true);
    }
    if (aiSuggestion.fundingGoal) {
      setFundingGoalCredits(String(aiSuggestion.fundingGoal));
      setAllowFundraising(true);
    }
    toast({ title: "XP & budget applied" });
  };

  const acceptHouses = () => {
    if (!aiSuggestion || !topics) return;
    const matching = topics.filter(t => aiSuggestion.suggestedHouses.some(h => t.name.toLowerCase().includes(h.toLowerCase())));
    const newIds = [...new Set([...selectedTopics, ...matching.map(t => t.id)])];
    setSelectedTopics(newIds);
    toast({ title: `${matching.length} Houses added` });
  };

  const acceptTerritories = () => {
    if (!aiSuggestion || !territories) return;
    const matching = territories.filter(t => aiSuggestion.suggestedTerritories.some(st => t.name.toLowerCase().includes(st.toLowerCase())));
    const newIds = [...new Set([...selectedTerritories, ...matching.map(t => t.id)])];
    setSelectedTerritories(newIds);
    toast({ title: `${matching.length} Territories added` });
  };

  const doCreate = async () => {
    if (!title.trim()) return;

    const budget = Number(creditBudget) || 0;

    // Validate credit budget against user's balance
    if (budget > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      const balance = (profile as any)?.credits_balance ?? 0;
      if (budget > balance) {
        toast({
          title: "Insufficient Credits",
          description: `You cannot allocate ${budget} Credits — you only have ${balance}. Top up your wallet or reduce the budget.`,
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const allowed = await checkRateLimit("quest_creation");
      if (!allowed) { setSubmitting(false); return; }

      const fiatCents = isMonetized ? (Number(priceFiat) || 0) : 0;
      const credits = isMonetized ? (Number(creditReward) || 0) : 0;
      const monType = isMonetized ? (fiatCents > 0 ? "PAID" : credits > 0 ? "MIXED" : "FREE") : "FREE";
      const questStatus = isDraft ? "DRAFT" : openForProposals ? "OPEN_FOR_PROPOSALS" : "OPEN";

      const { data: quest, error } = await supabase
        .from("quests")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverImageUrl || null,
          status: questStatus as any,
          monetization_type: monType as any,
          reward_xp: Number(rewardXp) || 100,
          is_featured: false,
          created_by_user_id: currentUser.id,
          guild_id: guildId || null,
          company_id: companyId || null,
          is_draft: isDraft,
          credit_reward: credits,
          price_fiat: fiatCents,
          price_currency: "EUR",
          payout_user_id: currentUser.id,
          credit_budget: budget,
          escrow_credits: budget,
          allow_fundraising: allowFundraising,
          funding_goal_credits: fundingGoalCredits ? Number(fundingGoalCredits) : null,
          mission_budget_min: missionBudgetMin ? Number(missionBudgetMin) : null,
          mission_budget_max: missionBudgetMax ? Number(missionBudgetMax) : null,
          payment_type: paymentType,
        } as any)
        .select()
        .single();

      if (error) {
        toast({ title: "Failed to create quest", description: error.message, variant: "destructive" });
        return;
      }

      if (selectedTopics.length > 0) {
        await supabase.from("quest_topics").insert(
          selectedTopics.map((topicId) => ({ quest_id: quest.id, topic_id: topicId }))
        );
      }

      if (selectedTerritories.length > 0) {
        await supabase.from("quest_territories").insert(
          selectedTerritories.map((territoryId) => ({ quest_id: quest.id, territory_id: territoryId }))
        );
      }

      // Insert accepted AI subtasks
      const acceptedSubtasks = aiSubtasks.filter(s => s.accepted);
      if (acceptedSubtasks.length > 0) {
        await supabase.from("quest_subtasks").insert(
          acceptedSubtasks.map((s, i) => ({
            quest_id: quest.id,
            title: s.title,
            description: s.description || null,
            order_index: i,
            status: "TODO",
          }))
        );
      }

      // Insert quest hosts (PRIMARY + co-hosts)
      if (primaryEntityType && primaryEntityId) {
        await supabase.from("quest_hosts").insert({
          quest_id: quest.id,
          entity_type: primaryEntityType,
          entity_id: primaryEntityId,
          role: "PRIMARY",
          created_by_user_id: currentUser.id,
        } as any);

        if (selectedCoHosts.length > 0) {
          await supabase.from("quest_hosts").insert(
            selectedCoHosts.map(ch => ({
              quest_id: quest.id,
              entity_type: ch.entityType,
              entity_id: ch.entityId,
              role: "CO_HOST",
              created_by_user_id: currentUser.id,
            })) as any
          );
        }
      }

      await supabase.from("quest_participants").insert({
        quest_id: quest.id,
        user_id: currentUser.id,
        role: "OWNER",
        status: "ACTIVE",
      });

      await limits.recordQuestCreation();

      await grantXp(currentUser.id, {
        type: XP_EVENT_TYPES.QUEST_CREATED,
        relatedEntityType: "Quest",
        relatedEntityId: quest.id,
      }, true);

      // Auto-follow the new quest
      await autoFollowEntity(currentUser.id, "QUEST", quest.id);

      qc.invalidateQueries({ queryKey: ["quests"] });
      if (guildId) qc.invalidateQueries({ queryKey: ["quests-for-guild", guildId] });
      toast({ title: "Quest created! +5 XP" });
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
        xpCost={EXTRA_QUEST_CREDIT_COST}
        userXp={limits.userCredits}
        actionLabel="create an extra quest"
        limitLabel="free quests for this week"
        onConfirm={async () => {
          const ok = await limits.spendCredits(EXTRA_QUEST_CREDIT_COST, "Extra quest creation", "QUEST");
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

        {/* Co-hosts selection (only when creating under a guild/company) */}
        {primaryEntityType && primaryEntityId && (availablePartners ?? []).length > 0 && (
          <Card className="p-4 space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Co-hosts (partner guilds/companies)</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Invite partner guilds or companies to co-host this quest. Only accepted partners of the primary host can be selected.
            </p>
            {selectedCoHosts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCoHosts.map(ch => (
                  <div key={`${ch.entityType}:${ch.entityId}`} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={ch.logo_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">{ch.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{ch.name}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0">
                      {ch.entityType === "GUILD" ? "Guild" : "Company"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setSelectedCoHosts(prev => prev.filter(p => !(p.entityType === ch.entityType && p.entityId === ch.entityId)))}
                      className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(availablePartners ?? [])
                .filter(p => !selectedCoHosts.some(ch => ch.entityType === p.entityType && ch.entityId === p.entityId))
                .map(p => (
                  <Button
                    key={`${p.entityType}:${p.entityId}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedCoHosts(prev => [...prev, p])}
                  >
                    {p.entityType === "GUILD" ? <Shield className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                    {p.name}
                  </Button>
                ))}
            </div>
          </Card>
        )}

        <div className="space-y-5">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quest title" className="mt-1" />
          </div>

          {/* AI Generation Section */}
          <Card className="p-4 border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Generate with AI</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a title above and optionally add keywords, then let AI draft your quest.
            </p>
            <div>
              <Label htmlFor="aiKeywords" className="text-xs">Keywords / notes (optional)</Label>
              <Input
                id="aiKeywords"
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder="e.g. community garden, workshops, youth engagement"
                className="mt-1 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={generateWithAI}
                disabled={aiLoading || !title.trim()}
                size="sm"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {aiLoading ? "Generating…" : aiSuggestion ? "Regenerate" : "Generate"}
              </Button>
              {aiSuggestion && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAiSuggestion(null); setAiSubtasks([]); }}>
                  <X className="h-4 w-4 mr-1" /> Dismiss
                </Button>
              )}
            </div>
          </Card>

          {/* AI Suggestion Results */}
          {aiSuggestion && (
            <div className="space-y-4">
              {aiSuggestion.microcopy && (
                <p className="text-sm italic text-primary">&ldquo;{aiSuggestion.microcopy}&rdquo;</p>
              )}

              {/* Description suggestion */}
              <Card className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Suggested Description</h4>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={acceptDescription}>
                      <Check className="h-3 w-3 mr-1" /> Use
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {aiSuggestion.description}
                </p>
              </Card>

              {/* Subtasks suggestion */}
              {aiSubtasks.length > 0 && (
                <Card className="p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Suggested Subtasks</h4>
                  <p className="text-xs text-muted-foreground">Toggle subtasks to include when creating the quest.</p>
                  <div className="space-y-1.5">
                    {aiSubtasks.map((s, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2 rounded-md text-sm cursor-pointer transition-colors ${
                          s.accepted ? "bg-primary/10" : "bg-muted/50 opacity-60"
                        }`}
                        onClick={() => setAiSubtasks(prev => prev.map((st, idx) => idx === i ? { ...st, accepted: !st.accepted } : st))}
                      >
                        <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 ${s.accepted ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                          {s.accepted && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <span className="font-medium">{s.title}</span>
                          {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* XP, Budget, Funding */}
              <Card className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">XP & Budget Suggestions</h4>
                  <Button type="button" size="sm" variant="outline" onClick={acceptXpAndBudget}>
                    <Check className="h-3 w-3 mr-1" /> Apply
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Reward XP</p>
                    <p className="font-bold text-primary">{aiSuggestion.rewardXp}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Credit Budget</p>
                    <p className="font-bold text-primary">{aiSuggestion.creditBudget}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Funding Goal</p>
                    <p className="font-bold text-primary">{aiSuggestion.fundingGoal ?? "—"}</p>
                  </div>
                </div>
              </Card>

              {/* Houses & Territories */}
              <div className="grid grid-cols-2 gap-3">
                {aiSuggestion.suggestedHouses.length > 0 && (
                  <Card className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold">Houses</h4>
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={acceptHouses}>
                        <Check className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aiSuggestion.suggestedHouses.map(h => (
                        <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
                      ))}
                    </div>
                  </Card>
                )}
                {aiSuggestion.suggestedTerritories.length > 0 && (
                  <Card className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold">Territories</h4>
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={acceptTerritories}>
                        <Check className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aiSuggestion.suggestedTerritories.map(t => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Collaborators */}
              {aiSuggestion.suggestedCollaborators.length > 0 && (
                <Card className="p-3 space-y-2">
                  <h4 className="text-xs font-semibold">Suggested Collaborator Profiles</h4>
                  <div className="flex flex-wrap gap-1">
                    {aiSuggestion.suggestedCollaborators.map(c => (
                      <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this quest is about…" className="mt-1" rows={4} />
          </div>

          <div>
            <Label>Cover Image</Label>
            <div className="mt-1">
              <ImageUpload label="Cover Image" currentImageUrl={coverImageUrl} onChange={setCoverImageUrl} aspectRatio="16/9" />
            </div>
          </div>

          {/* Mission Budget (Euros) */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">💰 Mission Budget (€)</h3>
            <p className="text-xs text-muted-foreground">Mission budgets are in euros. Credits are not used for compensation.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budgetMin">Budget Min (€)</Label>
                <Input id="budgetMin" type="number" value={missionBudgetMin} onChange={(e) => setMissionBudgetMin(e.target.value)} min={0} className="mt-1" placeholder="e.g. 500" />
              </div>
              <div>
                <Label htmlFor="budgetMax">Budget Max (€)</Label>
                <Input id="budgetMax" type="number" value={missionBudgetMax} onChange={(e) => setMissionBudgetMax(e.target.value)} min={0} className="mt-1" placeholder="e.g. 5000" />
              </div>
            </div>
            <div>
              <Label htmlFor="paymentType">Payment Method</Label>
              <select
                id="paymentType"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="INVOICE">Invoice</option>
                <option value="STRIPE">Stripe</option>
              </select>
            </div>

            {/* Commission Estimator */}
            {(missionBudgetMin || missionBudgetMax) && (
              <CommissionEstimator budgetMin={missionBudgetMin} budgetMax={missionBudgetMax} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reward">Reward XP</Label>
              <Input id="reward" type="number" value={rewardXp} onChange={(e) => setRewardXp(e.target.value)} min={0} className="mt-1" />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Switch id="monetized" checked={isMonetized} onCheckedChange={setIsMonetized} />
              <Label htmlFor="monetized" className="font-semibold">Is this quest monetized?</Label>
            </div>
            {isMonetized && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="creditReward">Credit Reward (to participants)</Label>
                  <Input id="creditReward" type="number" value={creditReward} onChange={(e) => setCreditReward(e.target.value)} min={0} className="mt-1" placeholder="0" />
                  <p className="text-xs text-muted-foreground mt-1">Credits granted on quest completion</p>
                </div>
                <div>
                  <Label htmlFor="priceFiat">Fiat Price (€ cents)</Label>
                  <Input id="priceFiat" type="number" value={priceFiat} onChange={(e) => setPriceFiat(e.target.value)} min={0} className="mt-1" placeholder="0" />
                  <p className="text-xs text-muted-foreground mt-1">Stripe payment required to join (in cents)</p>
                </div>
              </div>
          )}

          <div className="rounded-lg border border-border p-4 space-y-4">
            <h3 className="text-sm font-semibold">Budget & Proposals</h3>
            <div className="flex items-center gap-3">
              <Switch id="openForProposals" checked={openForProposals} onCheckedChange={setOpenForProposals} />
              <Label htmlFor="openForProposals">Open for proposals (community can submit proposals)</Label>
            </div>
            {openForProposals && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="creditBudget">Credit Budget (pot)</Label>
                    <Input id="creditBudget" type="number" value={creditBudget} onChange={e => setCreditBudget(e.target.value)} min={0} className="mt-1" placeholder="0" />
                    <p className="text-xs text-muted-foreground mt-1">Credits you commit to fund proposals</p>
                  </div>
                  <div>
                    <Label htmlFor="fundingGoal">Funding Goal (optional)</Label>
                    <Input id="fundingGoal" type="number" value={fundingGoalCredits} onChange={e => setFundingGoalCredits(e.target.value)} min={0} className="mt-1" placeholder="Target" />
                    <p className="text-xs text-muted-foreground mt-1">Target Credits for the quest</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="allowFundraising" checked={allowFundraising} onCheckedChange={setAllowFundraising} />
                  <Label htmlFor="allowFundraising">Allow community fundraising</Label>
                </div>
              </>
            )}
          </div>
          </div>

          {(topics ?? []).length > 0 && (
            <div>
              <Label>Topics (Houses)</Label>
              <div className="flex items-center gap-2 mt-1 mb-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setSelectedTopics((topics ?? []).map((t) => t.id))}>Select all</Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedTopics([])} disabled={selectedTopics.length === 0}>Clear all</Button>
              </div>
              <div className="flex flex-wrap gap-2">
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
              <div className="flex items-center gap-2 mt-1 mb-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setSelectedTerritories((territories ?? []).map((t) => t.id))}>Select all</Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedTerritories([])} disabled={selectedTerritories.length === 0}>Clear all</Button>
              </div>
              <div className="flex flex-wrap gap-2">
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
