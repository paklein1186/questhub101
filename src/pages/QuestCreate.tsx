import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Compass, Loader2, Sparkles, X, RotateCcw, Check, Tag, Globe, Lightbulb } from "lucide-react";
import { QuestNature } from "@/types/enums";
import {
  QUEST_NATURE_LABELS,
  QUEST_NATURE_DESCRIPTIONS,
  QUEST_NATURE_ICONS,
} from "@/lib/questTypes";
import { UrlScrapePanel } from "@/components/UrlScrapePanel";
import { SearchableTagPicker } from "@/components/SearchableTagPicker";
import { AIWriterButton } from "@/components/AIWriterButton";
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
import { FundingPoolWizard } from "@/components/quest/FundingPoolWizard";
import { PageShell } from "@/components/PageShell";
import { autoFollowEntity } from "@/hooks/useFollow";
import { useNotifications } from "@/hooks/useNotifications";
import { ImageUpload } from "@/components/ImageUpload";
import { XpSpendDialog } from "@/components/XpSpendDialog";
import { useAcceptedPartners } from "@/hooks/useQuestHosts";
import { useCoinsRate } from "@/hooks/useCoinsRate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { guildId, companyId } = useParams<{ guildId?: string; companyId?: string }>();
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const limits = usePlanLimits();
  const { checkRateLimit, isChecking } = useRateLimit();
  const { grantXp } = useXpCredits();
  const { persona } = usePersona();
  const { notifyGuildQuestCreated, notifyFollowersQuestCreated } = useNotifications();

  const { data: topics } = useTopics();
  const { data: territories } = useTerritories();

  // Let user pick an entity if none provided via URL params
  const [chosenEntityType, setChosenEntityType] = useState<"GUILD" | "COMPANY" | "PERSONAL" | null>(
    guildId ? "GUILD" : companyId ? "COMPANY" : null
  );
  const [chosenEntityId, setChosenEntityId] = useState<string | null>(guildId || companyId || null);

  // Fetch user's guilds and companies for the entity picker
  const { data: userGuilds } = useQuery({
    queryKey: ["user-guilds-for-quest", currentUser.id],
    enabled: !!currentUser.id && !guildId && !companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("guild_id, role, guilds:guild_id(id, name, logo_url, is_deleted)")
        .eq("user_id", currentUser.id)
        .in("role", ["ADMIN"]);
      return (data ?? [])
        .map((m: any) => m.guilds)
        .filter((g: any) => g && !g.is_deleted);
    },
  });

  const { data: userCompanies } = useQuery({
    queryKey: ["user-companies-for-quest", currentUser.id],
    enabled: !!currentUser.id && !guildId && !companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("company_members")
        .select("company_id, role, companies:company_id(id, name, logo_url, is_deleted)")
        .eq("user_id", currentUser.id)
        .in("role", ["OWNER", "ADMIN"]);
      return (data ?? [])
        .map((m: any) => m.companies)
        .filter((c: any) => c && !c.is_deleted);
    },
  });

  // Effective IDs (from URL params or user selection)
  const effectiveGuildId = chosenEntityType === "GUILD" ? chosenEntityId : guildId || null;
  const effectiveCompanyId = chosenEntityType === "COMPANY" ? chosenEntityId : companyId || null;

  const { data: guild } = useQuery({
    queryKey: ["guild-for-quest", effectiveGuildId],
    enabled: !!effectiveGuildId,
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("id, name, logo_url, ocu_default_enabled").eq("id", effectiveGuildId!).maybeSingle();
      return data;
    },
  });

  // Auto-enable OCU moved below state declarations (useEffect)

  const { data: company } = useQuery({
    queryKey: ["company-for-quest", effectiveCompanyId],
    enabled: !!effectiveCompanyId,
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, logo_url").eq("id", effectiveCompanyId!).maybeSingle();
      return data;
    },
  });

  // Auto-populate topics and territories from the parent unit
  const { data: unitTopics } = useQuery({
    queryKey: ["unit-topics-for-quest", effectiveGuildId, effectiveCompanyId],
    enabled: !!effectiveGuildId || !!effectiveCompanyId,
    queryFn: async () => {
      if (effectiveGuildId) {
        const { data } = await supabase.from("guild_topics").select("topic_id").eq("guild_id", effectiveGuildId);
        return data?.map(r => r.topic_id) ?? [];
      }
      if (effectiveCompanyId) {
        const { data } = await supabase.from("company_topics").select("topic_id").eq("company_id", effectiveCompanyId);
        return data?.map(r => r.topic_id) ?? [];
      }
      return [];
    },
  });

  const { data: unitTerritories } = useQuery({
    queryKey: ["unit-territories-for-quest", effectiveGuildId, effectiveCompanyId],
    enabled: !!effectiveGuildId || !!effectiveCompanyId,
    queryFn: async () => {
      if (effectiveGuildId) {
        const { data } = await supabase.from("guild_territories").select("territory_id").eq("guild_id", effectiveGuildId);
        return data?.map(r => r.territory_id) ?? [];
      }
      if (effectiveCompanyId) {
        const { data } = await supabase.from("company_territories").select("territory_id").eq("company_id", effectiveCompanyId);
        return data?.map(r => r.territory_id) ?? [];
      }
      return [];
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardXp, setRewardXp] = useState("100");
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>();
  const [isDraft, setIsDraft] = useState(false);
  const [searchParams] = useSearchParams();

  // Prefill from URL params (Pi integration)
  useEffect(() => {
    const prefillTitle = searchParams.get("prefill_title");
    const prefillType = searchParams.get("prefill_type");
    if (prefillTitle) setTitle(decodeURIComponent(prefillTitle));
    if (prefillType) setQuestNature(prefillType as QuestNature);
  }, []);
  const [questStatus, setQuestStatus] = useState<string>("OPEN");
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
  const [fundingType, setFundingType] = useState<"CREDITS" | "FIAT">("CREDITS");
  const [openForProposals, setOpenForProposals] = useState(false);
  const [missionBudgetMin, setMissionBudgetMin] = useState("");
  const [missionBudgetMax, setMissionBudgetMax] = useState("");
  const [paymentType, setPaymentType] = useState("INVOICE");
  const [questNature, setQuestNature] = useState(QuestNature.PROJECT);
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Dual funding pools
  const [coinsBudget, setCoinsBudget] = useState("0");
  const [ctgBudgetVal, setCtgBudgetVal] = useState("0");
  const [coinsEnabled, setCoinsEnabled] = useState(false);
  const [ctgEnabled, setCtgEnabled] = useState(false);
  const [ocuEnabled, setOcuEnabled] = useState(false);
  const { rate: coinEurRate, toEur } = useCoinsRate();

  // Fetch user wallet balances
  const { data: walletData } = useQuery({
    queryKey: ["user-wallet-for-quest", currentUser.id],
    enabled: !!currentUser.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("coins_balance, ctg_balance")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      return {
        coinsBalance: Number((data as any)?.coins_balance ?? 0),
        ctgBalance: Number((data as any)?.ctg_balance ?? 0),
      };
    },
  });
  const coinsBalance = walletData?.coinsBalance ?? 0;
  const ctgBalance = walletData?.ctgBalance ?? 0;

  // Co-hosts state
  const primaryEntityType = effectiveGuildId ? "GUILD" as const : effectiveCompanyId ? "COMPANY" as const : undefined;
  const primaryEntityId = effectiveGuildId || effectiveCompanyId || undefined;
  const { data: availablePartners } = useAcceptedPartners(primaryEntityType, primaryEntityId);
  const [selectedCoHosts, setSelectedCoHosts] = useState<{ entityType: "GUILD" | "COMPANY"; entityId: string; name: string; logo_url: string | null }[]>([]);

  // AI state
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiSubtasks, setAiSubtasks] = useState<{ title: string; description: string; accepted: boolean; ctg_reward: number }[]>([]);

  // Pre-populate topics & territories from the parent unit
  useEffect(() => {
    if (unitTopics && unitTopics.length > 0) {
      setSelectedTopics(prev => [...new Set([...prev, ...unitTopics])]);
    }
  }, [unitTopics]);

  useEffect(() => {
    if (unitTerritories && unitTerritories.length > 0) {
      setSelectedTerritories(prev => [...new Set([...prev, ...unitTerritories])]);
    }
  }, [unitTerritories]);

  const contextLabel = guild?.name ?? company?.name ?? (chosenEntityType === "PERSONAL" ? "Personal" : "Select an entity below");

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
      setAiSubtasks((data.subtasks || []).map((s: any) => ({ ...s, accepted: true, ctg_reward: 1 })));
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
      setCoinsBudget(String(aiSuggestion.creditBudget));
      setCoinsEnabled(true);
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
    toast({ title: `${matching.length} Topics added` });
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

    const finalCoinsBudget = coinsEnabled ? (Number(coinsBudget) || 0) : 0;
    const finalCtgBudget = ctgEnabled ? (Number(ctgBudgetVal) || 0) : 0;

    // Validate Coins balance
    if (finalCoinsBudget > 0 && finalCoinsBudget > coinsBalance) {
      toast({ title: "Insufficient Coins", description: `Your Coins balance is ${coinsBalance.toFixed(0)}.`, variant: "destructive" });
      return;
    }
    // Validate CTG balance
    if (finalCtgBudget > 0 && finalCtgBudget > ctgBalance) {
      toast({ title: "Insufficient $CTG", description: `Your $CTG balance is ${ctgBalance.toFixed(1)}.`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const allowed = await checkRateLimit("quest_creation");
      if (!allowed) { setSubmitting(false); return; }

      const fiatCents = isMonetized ? (Number(priceFiat) || 0) : 0;
      const credits = isMonetized ? (Number(creditReward) || 0) : 0;
      const monType = isMonetized ? (fiatCents > 0 ? "PAID" : credits > 0 ? "MIXED" : "FREE") : "FREE";
      const finalStatus = (isDraft || questNature === QuestNature.IDEA) ? "DRAFT" : questStatus;

      const { data: quest, error } = await supabase
        .from("quests")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          website_url: websiteUrl.trim() || null,
          cover_image_url: coverImageUrl || null,
          status: finalStatus as any,
          monetization_type: monType as any,
          reward_xp: Number(rewardXp) || 100,
          is_featured: false,
          created_by_user_id: currentUser.id,
          guild_id: effectiveGuildId || null,
          company_id: effectiveCompanyId || null,
          is_draft: isDraft,
          credit_reward: credits,
          price_fiat: fiatCents,
          price_currency: "EUR",
          payout_user_id: currentUser.id,
          coins_budget: finalCoinsBudget,
          coins_escrow: finalCoinsBudget,
          coins_escrow_status: finalCoinsBudget > 0 ? "active" : "idle",
          ctg_budget: finalCtgBudget,
          ctg_escrow: finalCtgBudget,
          ctg_escrow_status: finalCtgBudget > 0 ? "active" : "idle",
          ctg_escrow_frozen_at: finalCtgBudget > 0 ? new Date().toISOString() : null,
          ocu_enabled: ocuEnabled,
          allow_fundraising: allowFundraising,
          funding_goal_credits: fundingGoalCredits ? Number(fundingGoalCredits) : null,
          funding_type: fundingType,
          mission_budget_min: missionBudgetMin ? Number(missionBudgetMin) : null,
          mission_budget_max: missionBudgetMax ? Number(missionBudgetMax) : null,
          payment_type: paymentType,
          quest_nature: questNature,
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

      // Insert accepted AI subtasks (with ctg_reward)
      const acceptedSubtasks = aiSubtasks.filter(s => s.accepted);
      if (acceptedSubtasks.length > 0) {
        await supabase.from("quest_subtasks").insert(
          acceptedSubtasks.map((s, i) => ({
            quest_id: quest.id,
            title: s.title,
            description: s.description || null,
            order_index: i,
            status: "TODO",
            ctg_reward: s.ctg_reward ?? 1,
          })) as any
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

        await supabase.from("quest_affiliations" as any).insert({
          quest_id: quest.id,
          entity_type: primaryEntityType,
          entity_id: primaryEntityId,
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

          await supabase.from("quest_affiliations" as any).insert(
            selectedCoHosts.map(ch => ({
              quest_id: quest.id,
              entity_type: ch.entityType,
              entity_id: ch.entityId,
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

      // Deduct Coins from user wallet
      if (finalCoinsBudget > 0) {
        await supabase.from("coin_transactions").insert({
          user_id: currentUser.id,
          type: "QUEST_BUDGET_ALLOCATED",
          amount: -finalCoinsBudget,
          quest_id: quest.id,
          source: `Quest budget: ${title.trim()}`,
        } as any);
        const newCoins = coinsBalance - finalCoinsBudget;
        await supabase.from("profiles").update({ coins_balance: newCoins } as any).eq("user_id", currentUser.id);
        await supabase.from("quest_funding_contributions" as any).insert({
          quest_id: quest.id,
          funder_user_id: currentUser.id,
          currency: "coins",
          amount: finalCoinsBudget,
        });
      }

      // Deduct $CTG from user wallet
      if (finalCtgBudget > 0) {
        await supabase.from("ctg_transactions" as any).insert({
          user_id: currentUser.id,
          type: "QUEST_BUDGET_ALLOCATED",
          amount: -finalCtgBudget,
          related_entity_id: quest.id,
          related_entity_type: "quest",
          source: `Quest budget: ${title.trim()}`,
        });
        const newCtg = ctgBalance - finalCtgBudget;
        await supabase.from("profiles").update({ ctg_balance: newCtg } as any).eq("user_id", currentUser.id);
        await supabase.from("quest_funding_contributions" as any).insert({
          quest_id: quest.id,
          funder_user_id: currentUser.id,
          currency: "ctg",
          amount: finalCtgBudget,
        });
      }

      await grantXp(currentUser.id, {
        type: XP_EVENT_TYPES.QUEST_CREATED,
        relatedEntityType: "Quest",
        relatedEntityId: quest.id,
      }, true);

      // Auto-follow the new quest
      await autoFollowEntity(currentUser.id, "QUEST", quest.id);

      qc.invalidateQueries({ queryKey: ["quests"] });
      if (effectiveGuildId) {
        qc.invalidateQueries({ queryKey: ["quests-for-guild", effectiveGuildId] });
        notifyGuildQuestCreated({ guildId: effectiveGuildId, questId: quest.id, questTitle: title.trim() });
      } else {
        // No guild context — still notify followers of the creator
        notifyFollowersQuestCreated({ questId: quest.id, questTitle: title.trim() });
      }
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
        ctgBalance={limits.userCtgBalance}
        onConfirm={async () => {
          const ok = await limits.spendCredits(EXTRA_QUEST_CREDIT_COST, "Extra quest creation", "QUEST");
          if (ok) doCreate();
        }}
      />

      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2 mb-2">
          <Compass className="h-7 w-7 text-primary" /> Create Quest
        </h1>
        <p className="text-muted-foreground mb-2">
          Creating under: <span className="font-medium text-foreground">{contextLabel}</span>
        </p>

        {/* Entity picker — only shown when no guildId/companyId in URL */}
        {!guildId && !companyId && (
          <Card className="p-4 space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Launch from</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose which entity hosts this quest, or create it as a personal quest.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={chosenEntityType === "PERSONAL" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => { setChosenEntityType("PERSONAL"); setChosenEntityId(null); setSelectedCoHosts([]); }}
              >
                <Compass className="h-3 w-3 mr-1" /> Personal
              </Button>
              {(userGuilds ?? []).map((g: any) => (
                <Button
                  key={g.id}
                  type="button"
                  variant={chosenEntityType === "GUILD" && chosenEntityId === g.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => { setChosenEntityType("GUILD"); setChosenEntityId(g.id); setSelectedCoHosts([]); }}
                >
                  <Avatar className="h-4 w-4 mr-1">
                    <AvatarImage src={g.logo_url ?? undefined} />
                    <AvatarFallback className="text-[7px]">{g.name?.[0]}</AvatarFallback>
                  </Avatar>
                  {g.name}
                  <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">Guild</Badge>
                </Button>
              ))}
              {(userCompanies ?? []).map((c: any) => (
                <Button
                  key={c.id}
                  type="button"
                  variant={chosenEntityType === "COMPANY" && chosenEntityId === c.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => { setChosenEntityType("COMPANY"); setChosenEntityId(c.id); setSelectedCoHosts([]); }}
                >
                  <Avatar className="h-4 w-4 mr-1">
                    <AvatarImage src={c.logo_url ?? undefined} />
                    <AvatarFallback className="text-[7px]">{c.name?.[0]}</AvatarFallback>
                  </Avatar>
                  {c.name}
                  <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">Company</Badge>
                </Button>
              ))}
            </div>
          </Card>
        )}

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

        {/* URL Scrape Panel */}
        <UrlScrapePanel
          topics={topics ?? []}
          territories={territories ?? []}
          onApply={({ title: t, description: d, coverImage, topicIds, territoryIds }) => {
            if (t && !title.trim()) setTitle(t);
            if (d && !description.trim()) setDescription(d);
            if (coverImage && !coverImageUrl) setCoverImageUrl(coverImage);
            if (topicIds.length) setSelectedTopics(prev => [...new Set([...prev, ...topicIds])]);
            if (territoryIds.length) setSelectedTerritories(prev => [...new Set([...prev, ...territoryIds])]);
          }}
        />

        <div className="space-y-5">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quest title" className="mt-1" />
            <AIWriterButton
              type="rewrite_title"
              context={{ entityType: "quest", keywords: aiKeywords }}
              currentText={title}
              onAccept={(text) => setTitle(text)}
              label="Rewrite title with AI"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold">Quest Nature *</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              What kind of intent is this?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.values(QuestNature) as QuestNature[]).map((nature) => (
                <button
                  key={nature}
                  type="button"
                  onClick={() => setQuestNature(nature)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                    questNature === nature
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-background hover:border-muted-foreground/40"
                  }`}
                >
                  <span className="text-lg leading-none">{QUEST_NATURE_ICONS[nature]}</span>
                  <p className="text-sm font-medium mt-1">{QUEST_NATURE_LABELS[nature]}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {QUEST_NATURE_DESCRIPTIONS[nature]}
                  </p>
                </button>
              ))}
            </div>

            {questNature === QuestNature.IDEA && (
              <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                💡 Ideas are saved as drafts — not published to the Marketplace until promoted.
              </p>
            )}
          </div>

          {/* Status — only shown for non-IDEA natures */}
          {questNature !== QuestNature.IDEA && (
            <div>
              <Label htmlFor="questStatus">Initial Status</Label>
              <select
                id="questStatus"
                value={questStatus}
                onChange={(e) => setQuestStatus(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="OPEN">Open — visible and accepting interest</option>
                <option value="OPEN_FOR_PROPOSALS">Open for Proposals</option>
                <option value="ACTIVE">Active — contributors confirmed</option>
              </select>
            </div>
          )}

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
                        className={`flex items-start gap-2 p-2 rounded-md text-sm transition-colors ${
                          s.accepted ? "bg-primary/10" : "bg-muted/50 opacity-60"
                        }`}
                      >
                        <div
                          className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${s.accepted ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}
                          onClick={() => setAiSubtasks(prev => prev.map((st, idx) => idx === i ? { ...st, accepted: !st.accepted } : st))}
                        >
                          {s.accepted && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => setAiSubtasks(prev => prev.map((st, idx) => idx === i ? { ...st, accepted: !st.accepted } : st))}>
                          <span className="font-medium">{s.title}</span>
                          {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-muted-foreground">🌱</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={s.ctg_reward}
                            onChange={(e) => setAiSubtasks(prev => prev.map((st, idx) => idx === i ? { ...st, ctg_reward: Number(e.target.value) || 0 } : st))}
                            className="h-6 w-14 text-xs px-1 text-center"
                          />
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
                    <p className="text-xs text-muted-foreground">Suggested Coins incentive</p>
                    <p className="font-bold text-primary">{aiSuggestion.creditBudget}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Funding Goal</p>
                    <p className="font-bold text-primary">{aiSuggestion.fundingGoal ?? "—"}</p>
                  </div>
                </div>
              </Card>

              {/* Topics & Territories */}
              <div className="grid grid-cols-2 gap-3">
                {aiSuggestion.suggestedHouses.length > 0 && (
                  <Card className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold">Topics</h4>
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
            <AIWriterButton
              type="rewrite_description"
              context={{ entityType: "quest", title, keywords: aiKeywords }}
              currentText={description}
              onAccept={(text) => setDescription(text)}
              label="Rewrite description with AI"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="websiteUrl" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Link / Website URL
            </Label>
            <Input
              id="websiteUrl"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Optional link displayed on the quest page</p>
          </div>

          <ImageUpload label="Cover Image" currentImageUrl={coverImageUrl} onChange={setCoverImageUrl} aspectRatio="16/9" />

          {/* Needs */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div>
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-primary" /> Needs <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                You can add specific needs (skills, tools, volunteers…) after creating the quest via its Settings page.
              </p>
            </div>
          </div>

          {/* Funding Pools — only for PROJECT / ONGOING_MISSION */}
          {(questNature === QuestNature.PROJECT || questNature === ("ONGOING_MISSION" as QuestNature)) && (
            <FundingPoolWizard
              coinsBudget={coinsBudget}
              setCoinsBudget={setCoinsBudget}
              ctgBudget={ctgBudgetVal}
              setCtgBudget={setCtgBudgetVal}
              coinsEnabled={coinsEnabled}
              setCoinsEnabled={setCoinsEnabled}
              ctgEnabled={ctgEnabled}
              setCtgEnabled={setCtgEnabled}
              coinsBalance={coinsBalance}
              ctgBalance={ctgBalance}
              coinEurRate={coinEurRate}
              toEur={toEur}
            />
          )}

          {/* OCU quick-enable toggle — only for PROJECT / ONGOING_MISSION */}
          {(questNature === QuestNature.PROJECT || questNature === ("ONGOING_MISSION" as QuestNature)) && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">🧮 Track contributions & distribute value fairly?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enable the Open Contributive Unit (OCU) module to log half-days,
                    calculate each contributor's share, and govern distribution via a live pie.
                  </p>
                </div>
                <Switch checked={ocuEnabled} onCheckedChange={(checked) => {
                  setOcuEnabled(checked);
                  // If enabling OCU on a guild quest & guild doesn't have default yet, offer to homogenize
                  if (checked && effectiveGuildId && guild && !(guild as any).ocu_default_enabled) {
                    if (confirm("Do you want to enable OCU by default for all future quests in this guild?")) {
                      supabase.from("guilds").update({ ocu_default_enabled: true } as any).eq("id", effectiveGuildId).then(() => {
                        toast({ title: "🧮 OCU default enabled", description: "All future guild quests will have OCU active." });
                      });
                    }
                  }
                }} />
              </div>
              <Label className="text-xs text-muted-foreground">
                Enable OCU (can also be activated later in Quest Settings)
              </Label>
              {(guild as any)?.ocu_default_enabled && (
                <p className="text-xs text-muted-foreground/80 rounded-md bg-muted px-3 py-1.5">
                  ℹ️ OCU is enabled by default for this guild's quests. You can change this in Guild Settings → Quests & Pods Defaults.
                </p>
              )}
              {ocuEnabled && (
                <p className="text-xs text-primary rounded-md bg-primary/10 px-3 py-2">
                  ✅ OCU active — contributors will log work, earn Coins from the pool,
                  and see their % share live. A contract can be added after creation.
                </p>
              )}
            </Card>
          )}

          {(topics ?? []).length > 0 && (
            <SearchableTagPicker
              label="Topics"
              items={(topics ?? []).map(t => ({ id: t.id, name: t.name }))}
              selectedIds={selectedTopics}
              onToggle={toggleTopic}
              onSelectAll={() => setSelectedTopics((topics ?? []).map(t => t.id))}
              onClearAll={() => setSelectedTopics([])}
            />
          )}

          {(territories ?? []).length > 0 && (
            <SearchableTagPicker
              label="Territories"
              items={(territories ?? []).map(t => ({ id: t.id, name: t.name }))}
              selectedIds={selectedTerritories}
              onToggle={toggleTerritory}
              onSelectAll={() => setSelectedTerritories((territories ?? []).map(t => t.id))}
              onClearAll={() => setSelectedTerritories([])}
            />
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
