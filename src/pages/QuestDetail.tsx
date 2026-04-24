import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useContentTranslations } from "@/hooks/useContentTranslation";
import { useAutoTranslateEntity } from "@/hooks/useAutoTranslateEntity";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { autoFollowEntity } from "@/hooks/useFollow";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Users, Sparkles, Megaphone, BookOpen, MessageCircle, Trophy, Plus, Heart, CircleDot, Building2, UserPlus, Pencil, Send, CreditCard, Lock, ListChecks, FileText, Bot, Brain, MoreHorizontal, TrendingDown, Handshake, Trash2, Hash, MapPin, Star, Mail, Loader2, Ban, Clock, AlertTriangle, Calendar, Puzzle, Save, Settings, Globe, Lightbulb, Shield, PieChart } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { CommissionEstimator } from "@/components/quest/CommissionEstimator";

import { useCoinsRate } from "@/hooks/useCoinsRate";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { AttachmentUpload, AttachmentList } from "@/components/AttachmentUpload";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType, QuestUpdateType, QuestStatus, FollowTargetType, ReportTargetType, AttachmentTargetType } from "@/types/enums";
import { ReportButton } from "@/components/ReportButton";
import { DraftBanner } from "@/components/DraftBanner";
import { PiContextSetter } from "@/components/assistant/PiContextSetter";
import { useFollow } from "@/hooks/useFollow";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQuestById, useQuestParticipants, useQuestUpdates, usePodsForQuest, usePublicProfile } from "@/hooks/useEntityQueries";
import { formatDistanceToNow } from "date-fns";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { FeedSection } from "@/components/feed/FeedSection";
import { GuildDiscussionTab } from "@/components/guild/GuildDiscussionTab";
import { computeLevelFromXp, XP_EVENT_TYPES, XP_REWARDS, CREDIT_TX_TYPES } from "@/lib/xpCreditsConfig";
import { useXpCredits } from "@/hooks/useXpCredits";
import { QuestSubtasks } from "@/components/guild/QuestSubtasks";
import { CTGEstimateBlock } from "@/components/ctg/CTGIntegrationWidgets";
import { SectionBanner, HintTooltip, HINTS } from "@/components/onboarding/ContextualHint";
import { QuestProposals } from "@/components/quest/QuestProposals";
import { ContributionLogPanel } from "@/components/quest/ContributionLogPanel";
import { OCUContributionsList } from "@/components/ocu/OCUContributionsList";
import { OCUFeatureGate } from "@/components/ocu/OCUFeatureGate";
import { QuestPiePanel } from "@/components/ocu/QuestPiePanel";
import { DistributeCompensation } from "@/components/ocu/DistributeCompensation";
import { DistributionPanel } from "@/components/ocu/DistributionPanel";
import { ContractTab } from "@/components/ocu/ContractTab";
import { UnitChat } from "@/components/UnitChat";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { UnitAgentsTab } from "@/components/UnitAgentsTab";
import { MemoryEnginePanel } from "@/components/MemoryEnginePanel";
import { FundraisingAIPanel } from "@/components/FundraisingAIPanel";
import { QuestExploreTab } from "@/components/quest/QuestExploreTab";
import { QuestWorkTab } from "@/components/quest/QuestWorkTab";
import { QuestActivityTab } from "@/components/quest/QuestActivityTab";
import { AIWriterButton } from "@/components/AIWriterButton";
import { PostAsSelector, type PostAsEntity } from "@/components/feed/PostAsSelector";
import { TerritoryCreateWizard } from "@/components/territory/TerritoryCreateWizard";
import { useResolvedQuestHosts } from "@/hooks/useQuestHosts";
import { QuestHostsDisplay, QuestCoHostsManager } from "@/components/quest/QuestCoHosts";
import { PublicExploreCTA } from "@/components/PublicExploreCTA";
import { GuestOnboardingAssistant } from "@/components/GuestOnboardingAssistant";
import { GuestContentGate } from "@/components/GuestContentGate";
import { UserSearchInput } from "@/components/UserSearchInput";
import { sendInviteNotification } from "@/lib/inviteNotification";
import { InviteLinkButton } from "@/components/InviteLinkButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { GiveTrustButton } from "@/components/GiveTrustButton";
import { TrustNodeType } from "@/types/enums";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import {
  QUEST_NATURE_LABELS,
  QUEST_NATURE_COLORS,
  QUEST_NATURE_ICONS,
  isMission,
} from "@/lib/questTypes";
import { QuestNature } from "@/types/enums";
import { GuildRitualsTab } from "@/components/guild/GuildRitualsTab";
import { QuestNeedsManager } from "@/components/quest/QuestNeedsManager";
import { TrustTab } from "@/components/trust/TrustTab";
import { TopTrustedMembers } from "@/components/trust/TopTrustedMembers";
import { QuestLivingTab } from "@/components/living/QuestLivingTab";
import { ExternalLinksPanel, type ExternalLinkItem } from "@/components/guild/ExternalLinksPanel";
import { Leaf } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const updateIcons: Record<string, typeof Sparkles> = {
  MILESTONE: Sparkles,
  CALL_FOR_HELP: Megaphone,
  REFLECTION: BookOpen,
  GENERAL: MessageCircle,
};

function QuestExternalLinks({ questId, isOwner }: { questId: string; isOwner: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: links = [] } = useQuery<ExternalLinkItem[]>({
    queryKey: ["quest-external-links", questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("features_config")
        .eq("id", questId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return [];

      const cfg = (data.features_config as Record<string, unknown> | null) ?? {};
      const externalLinks = cfg.external_links;

      return Array.isArray(externalLinks) ? (externalLinks as ExternalLinkItem[]) : [];
    },
    enabled: !!questId,
  });

  const updateLinks = async (newLinks: ExternalLinkItem[]) => {
    const previousLinks = qc.getQueryData<ExternalLinkItem[]>(["quest-external-links", questId]) ?? [];
    qc.setQueryData<ExternalLinkItem[]>(["quest-external-links", questId], newLinks);

    try {
      const { data: quest, error: fetchErr } = await supabase
        .from("quests")
        .select("features_config")
        .eq("id", questId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!quest) throw new Error("Quest not found or access denied.");

      const cfg = (quest.features_config as Record<string, unknown> | null) ?? {};
      const { data: updatedQuest, error: updateErr } = await supabase
        .from("quests")
        .update({ features_config: { ...cfg, external_links: newLinks } } as any)
        .eq("id", questId)
        .select("id")
        .maybeSingle();

      if (updateErr) throw updateErr;
      if (!updatedQuest) throw new Error("You don't have permission to update this quest.");
    } catch (error: any) {
      qc.setQueryData<ExternalLinkItem[]>(["quest-external-links", questId], previousLinks);
      toast({
        title: "Failed to save link",
        description: error?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      qc.invalidateQueries({ queryKey: ["quest-external-links", questId] });
    }
  };

  return <ExternalLinksPanel links={links} onLinksChange={updateLinks} canEdit={isOwner} />;
}

function QuestFollowersSection({ questId, participantUserIds }: { questId: string; participantUserIds: string[] }) {
  const { data: followers = [] } = useQuery({
    queryKey: ["quest-followers-overview", questId],
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("target_id", questId)
        .eq("target_type", "QUEST")
        .limit(200);
      const ids = (data ?? []).map((f) => f.follower_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids)
        .not("name", "is", null);
      return (profiles ?? []) as { user_id: string; name: string; avatar_url: string | null }[];
    },
    enabled: !!questId,
  });

  const nonParticipantFollowers = followers.filter((f) => !participantUserIds.includes(f.user_id));

  if (nonParticipantFollowers.length === 0) return null;

  return (
    <div className="mt-2">
      <h3 className="font-display font-semibold flex items-center gap-2 mb-3 text-sm">
        <Heart className="h-4 w-4 text-muted-foreground" />
        <span>Following this Quest</span>
        <Badge variant="secondary" className="text-[10px]">{nonParticipantFollowers.length}</Badge>
      </h3>
      <div className="flex flex-wrap gap-2">
        {nonParticipantFollowers.map((f) => (
          <Link key={f.user_id} to={`/users/${f.user_id}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:border-primary/30 transition-all">
            <Avatar className="h-6 w-6">
              <AvatarImage src={f.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">{f.name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{f.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function QuestDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: quest, isLoading } = useQuestById(id);
  const { data: participants } = useQuestParticipants(id);
  const { data: updates } = useQuestUpdates(id);
  const { data: questPods } = usePodsForQuest(id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { grantXp, grantCredits, spendCredits } = useXpCredits();
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.QUEST, id!);
  const { notifyQuestUpdate, notifyFollowersQuestCreated } = useNotifications();
  const { toCoins, rate: coinsRate } = useCoinsRate();
  const navigate = useNavigate();

  const { data: creator } = usePublicProfile(quest?.created_by_user_id);
  const { data: resolvedHosts } = useResolvedQuestHosts(id);
  const { data: allTopicsList } = useTopics();
  const { data: allTerritoriesList } = useTerritories();

  // Auto-translate quest title + description
  const questFields = [
    { fieldName: "title", originalText: quest?.title ?? null },
    { fieldName: "description", originalText: quest?.description ?? null },
    { fieldName: "ai_summary", originalText: (quest as any)?.ai_summary ?? null },
  ];
  const { translations: questTr } = useContentTranslations("QUEST", id, questFields);
  useAutoTranslateEntity("QUEST", id, questFields, questTr);

  // Fetch multi-affiliations
  const { data: questAffiliations = [] } = useQuery({
    queryKey: ["quest-affiliations-overview", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_affiliations" as any)
        .select("id, entity_type, entity_id")
        .eq("quest_id", id!);
      const rows = (data ?? []) as any[];
      const results: { id: string; entity_type: string; entity_id: string; name: string; logo_url: string | null; link: string }[] = [];
      for (const row of rows) {
        if (row.entity_type === "GUILD") {
          const { data: g } = await supabase.from("guilds").select("id, name, logo_url").eq("id", row.entity_id).maybeSingle();
          if (g) results.push({ id: row.id, entity_type: "GUILD", entity_id: g.id, name: g.name, logo_url: g.logo_url, link: `/guilds/${g.id}` });
        } else {
          const { data: c } = await supabase.from("companies").select("id, name, logo_url").eq("id", row.entity_id).maybeSingle();
          if (c) results.push({ id: row.id, entity_type: "COMPANY", entity_id: c.id, name: c.name, logo_url: c.logo_url, link: `/companies/${c.id}` });
        }
      }
      return results;
    },
    enabled: !!id,
  });

  // Highlighted quest star
  const { data: highlightedIds = [] } = useQuery({
    queryKey: ["highlighted-quests", currentUser.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("highlighted_quests" as any)
        .select("quest_id")
        .eq("user_id", currentUser.id);
      return (data || []).map((h: any) => h.quest_id as string);
    },
    enabled: !!currentUser.id,
  });
  const isHighlighted = id ? highlightedIds.includes(id) : false;
  const toggleHighlight = async () => {
    if (!id || !currentUser.id) return;
    if (isHighlighted) {
      await supabase.from("highlighted_quests" as any).delete().eq("user_id", currentUser.id).eq("quest_id", id);
    } else {
      await supabase.from("highlighted_quests" as any).insert({ user_id: currentUser.id, quest_id: id } as any);
    }
    qc.invalidateQueries({ queryKey: ["highlighted-quests", currentUser.id] });
  };

  // Subtask counts for tab label
  const { data: subtaskCounts } = useQuery({
    queryKey: ["quest-subtask-counts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_subtasks" as any)
        .select("status")
        .eq("quest_id", id!);
      if (error) throw error;
      const all = data || [];
      const open = all.filter((s: any) => s.status !== "DONE").length;
      return { open, total: all.length };
    },
    enabled: !!id,
  });

  // Activity timeline for quest
  const { data: questTimeline = [] } = useQuery({
    queryKey: ["quest-timeline", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("target_id", id!)
        .in("action_type", [
          "quest_joined", "quest_funded", "quest_deleted",
          "post_created", "subtask_completed", "quest_highlighted",
        ])
        .order("created_at", { ascending: true })
        .limit(50);
      return data ?? [];
    },
    enabled: !!id,
  });

  // Guilds where user is admin (for re-attaching quest)
  const { data: myAdminGuilds = [] } = useQuery({
    queryKey: ["my-admin-guilds", currentUser.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("guild_id, role, guilds(id, name, logo_url, is_draft, is_deleted)")
        .eq("user_id", currentUser.id!)
        .in("role", ["ADMIN", "MEMBER"]);
      return (data ?? [])
        .filter((m: any) => m.guilds && !m.guilds.is_draft && !m.guilds.is_deleted && (m.role === "ADMIN" || m.role === "OWNER"))
        .map((m: any) => m.guilds);
    },
    enabled: !!currentUser.id,
  });

  const [updateOpen, setUpdateOpen] = useState(false);
  const [uTitle, setUTitle] = useState("");
  const [uContent, setUContent] = useState("");
  const [uType, setUType] = useState("GENERAL");
  const [uImageUrl, setUImageUrl] = useState<string | undefined>();
  const [uDraft, setUDraft] = useState(false);
  const [uVisibility, setUVisibility] = useState("PUBLIC");
  const [uPostAs, setUPostAs] = useState<import("@/components/feed/PostAsSelector").PostAsEntity | null>(null);
  const activeTab = searchParams.get("tab") || "explore";
  const setActiveTab = (v: string) => setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    if (v === "explore") next.delete("tab"); else next.set("tab", v);
    return next;
  }, { replace: true });
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);

  const [podOpen, setPodOpen] = useState(false);
  const [podName, setPodName] = useState("");
  const [podDesc, setPodDesc] = useState("");
  const [podStart, setPodStart] = useState("");
  const [podEnd, setPodEnd] = useState("");
  const [podImageUrl, setPodImageUrl] = useState<string | undefined>();

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editWebsiteUrl, setEditWebsiteUrl] = useState("");
  const [editStatus, setEditStatus] = useState<QuestStatus>(QuestStatus.OPEN);
  const [editCoverImageUrl, setEditCoverImageUrl] = useState<string | undefined>();
  const [editCoverFocalY, setEditCoverFocalY] = useState(50);
  const [editCreditReward, setEditCreditReward] = useState("0");
  const [editPriceFiat, setEditPriceFiat] = useState("0");
  const [editCreditBudget, setEditCreditBudget] = useState("0");
  const [editAllowFundraising, setEditAllowFundraising] = useState(false);
  const [editFundingGoal, setEditFundingGoal] = useState("");
  const [editTopics, setEditTopics] = useState<string[]>([]);
  const [editTerritories, setEditTerritories] = useState<string[]>([]);
  const [editQuestNature, setEditQuestNature] = useState("PROJECT");
  const [editGuildId, setEditGuildId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailSending, setInviteEmailSending] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState("");
  const [editFundingType, setEditFundingType] = useState<"CREDITS" | "FIAT">("CREDITS");
  const [showTerritoryWizard, setShowTerritoryWizard] = useState(false);

  // Quest features config (read-only, managed on Settings page)
  const questDefaultFeatures = { rituals: true, subtasks: true, discussion: true };
  const qfc = typeof (quest as any)?.features_config === "object" && (quest as any)?.features_config
    ? { ...questDefaultFeatures, ...(quest as any).features_config }
    : questDefaultFeatures;

  // Check if user is admin of the guild (must be before early returns)
  const { data: guildMembership } = useQuery({
    queryKey: ["guild-membership-check", quest?.guild_id, currentUser.id],
    enabled: !!quest?.guild_id && !!currentUser.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("role")
        .eq("guild_id", quest!.guild_id!)
        .eq("user_id", currentUser.id!)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!quest) return <PageShell><p>Quest not found.</p></PageShell>;
  if (quest.is_deleted && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>This quest has been removed.</p></PageShell>;

  const isCancelled = quest.status === "CANCELLED";
  if (quest.is_draft && quest.created_by_user_id !== currentUser.id && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>Quest not found.</p></PageShell>;

  const isLoggedIn = !!currentUser.id;
  const guild = quest.guilds;
  const topics = (quest.quest_topics || []).map((qt: any) => qt.topics).filter(Boolean);
  const territories = (quest.quest_territories || []).map((qt: any) => qt.territories).filter(Boolean);
  const isOwner = isLoggedIn && currentUser.id === quest.created_by_user_id;
  const isParticipant = isLoggedIn && (participants || []).some((qp: any) => qp.user_id === currentUser.id);
  const isCollaborator = isLoggedIn && (participants || []).some((qp: any) => qp.user_id === currentUser.id && (qp.role === "OWNER" || qp.role === "COLLABORATOR"));

  const isGuildAdmin = !!guildMembership && ["admin", "moderator", "owner"].includes(guildMembership.role);

  // Check if user is admin of a host or co-host entity
  const isHostAdmin = (() => {
    if (!resolvedHosts || resolvedHosts.length === 0) return false;
    return false;
  })();
  const canPostUpdate = isOwner || isCollaborator || isHostAdmin;

  const isPaidQuest = quest && quest.price_fiat > 0;

  const joinQuest = async () => {
    if (isPaidQuest) {
      // Redirect to Stripe checkout for paid quests
      try {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { quest_id: quest.id, price_fiat: quest.price_fiat, currency: quest.price_currency || "EUR" },
        });
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, "_blank");
        }
      } catch (err: any) {
        toast({ title: "Payment error", description: err.message, variant: "destructive" });
      }
      return;
    }
    await supabase.from("quest_participants").insert({ quest_id: quest.id, user_id: currentUser.id, role: "COLLABORATOR", status: "ACCEPTED" });
    qc.invalidateQueries({ queryKey: ["quest-participants", id] });
    toast({ title: "Joined quest!" });
  };

  const postUpdate = async () => {
    if (!uTitle.trim() || !uContent.trim()) return;
    if (editingUpdateId) {
      await supabase.from("quest_updates").update({
        title: uTitle.trim(), content: uContent.trim(), image_url: uImageUrl || null, type: uType, is_draft: uDraft, visibility: uVisibility,
      } as any).eq("id", editingUpdateId);
    } else {
      await supabase.from("quest_updates").insert({
        quest_id: quest.id, author_id: currentUser.id, title: uTitle.trim(), content: uContent.trim(), image_url: uImageUrl || null, type: uType, is_draft: uDraft, visibility: uVisibility,
        posted_as_entity_type: uPostAs?.entityType || null,
        posted_as_entity_id: uPostAs?.entityId || null,
        posted_as_label: uPostAs?.label || null,
      } as any);

      // Notify participants & followers for published (non-draft) updates
      if (!uDraft) {
        const { data: inserted } = await supabase
          .from("quest_updates")
          .select("id")
          .eq("quest_id", quest.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (inserted?.id) {
          notifyQuestUpdate({ questId: quest.id, questUpdateId: inserted.id, updateTitle: uTitle.trim() });
        }
        notifyFollowersQuestCreated({ questId: quest.id, questTitle: quest.title });
      }
    }
    qc.invalidateQueries({ queryKey: ["quest-updates", id] });
    setUpdateOpen(false); setUTitle(""); setUContent(""); setUType("GENERAL"); setUImageUrl(undefined); setUDraft(false); setUVisibility("PUBLIC"); setEditingUpdateId(null); setUPostAs(null);
    toast({ title: uDraft ? "Draft saved!" : editingUpdateId ? "Update edited!" : "Update posted!" });
  };

  const openEditUpdate = (update: any) => {
    setUTitle(update.title); setUContent(update.content || ""); setUType(update.type); setUImageUrl(update.image_url || undefined); setUDraft(update.is_draft); setUVisibility(update.visibility || "PUBLIC"); setEditingUpdateId(update.id); setUpdateOpen(true);
  };

  const deleteUpdate = async (updateId: string) => {
    await supabase.from("quest_updates").update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq("id", updateId);
    qc.invalidateQueries({ queryKey: ["quest-updates", id] });
    toast({ title: "Update deleted" });
  };

  const togglePin = async (updateId: string, currentPinned: boolean) => {
    await supabase.from("quest_updates").update({ pinned: !currentPinned } as any).eq("id", updateId);
    qc.invalidateQueries({ queryKey: ["quest-updates", id] });
    toast({ title: currentPinned ? "Unpinned" : "Pinned!" });
  };

  const createPod = async () => {
    if (!podName.trim()) return;
    const { data: pod, error } = await supabase.from("pods").insert({ name: podName.trim(), description: podDesc.trim() || null, image_url: podImageUrl || null, type: "QUEST_POD" as any, quest_id: quest.id, creator_id: currentUser.id, start_date: podStart || null, end_date: podEnd || null }).select().single();
    if (error) { toast({ title: "Failed to create pod", variant: "destructive" }); return; }
    await supabase.from("pod_members").insert({ pod_id: pod.id, user_id: currentUser.id, role: "HOST" as any });
    autoFollowEntity(currentUser.id, "POD", pod.id);
    qc.invalidateQueries({ queryKey: ["pods-for-quest", id] });
    setPodOpen(false); setPodName(""); setPodDesc(""); setPodStart(""); setPodEnd(""); setPodImageUrl(undefined);
    toast({ title: "Pod created!" });
  };

  const openEditQuest = () => {
    setEditTitle(quest.title);
    setEditDesc(quest.description || "");
    setEditWebsiteUrl((quest as any).website_url || "");
    setEditStatus(quest.status as QuestStatus);
    setEditCoverImageUrl(quest.cover_image_url ?? undefined);
    setEditCoverFocalY((quest as any).cover_focal_y ?? 50);
    setEditCreditReward(String(quest.credit_reward ?? 0));
    setEditPriceFiat(String(quest.price_fiat ?? 0));
    setEditCreditBudget(String((quest as any).credit_budget ?? 0));
    setEditAllowFundraising((quest as any).allow_fundraising ?? false);
    setEditFundingGoal(String((quest as any).funding_goal_credits ?? ""));
    setEditTopics(topics.map((t: any) => t.id));
    setEditTerritories(territories.map((t: any) => t.id));
    setEditQuestNature((quest as any).quest_nature || "PROJECT");
    setEditGuildId(quest.guild_id || null);
    setEditFundingType((quest as any).funding_type || "CREDITS");
    setEditOpen(true);
  };

  const saveEditQuest = async () => {
    const fiat = Number(editPriceFiat) || 0;
    const credits = Number(editCreditReward) || 0;
    const monType = fiat > 0 ? "PAID" : credits > 0 ? "MIXED" : "FREE";
    const isDraft = editStatus === QuestStatus.DRAFT;
    const previousStatus = quest.status;
    const isBecomingCompleted = editStatus === QuestStatus.COMPLETED && previousStatus !== QuestStatus.COMPLETED;
    const isBecomingCancelled = editStatus === QuestStatus.CANCELLED && previousStatus !== QuestStatus.CANCELLED;

    await supabase.from("quests").update({
      title: editTitle.trim() || quest.title,
      description: editDesc.trim() || null,
      website_url: editWebsiteUrl.trim() || null,
      status: editStatus as any,
      is_draft: isDraft,
      cover_image_url: editCoverImageUrl || null,
      cover_focal_y: editCoverFocalY,
      credit_reward: credits,
      price_fiat: fiat,
      monetization_type: monType as any,
      credit_budget: Number(editCreditBudget) || 0,
      allow_fundraising: editAllowFundraising,
      funding_goal_credits: editFundingGoal ? Number(editFundingGoal) : null,
      quest_nature: editQuestNature,
      funding_type: editFundingType,
    } as any).eq("id", quest.id);

    // Update topics: delete old, insert new
    await supabase.from("quest_topics").delete().eq("quest_id", quest.id);
    if (editTopics.length > 0) {
      await supabase.from("quest_topics").insert(editTopics.map((topic_id) => ({ quest_id: quest.id, topic_id })));
    }
    // Update territories: delete old, insert new
    await supabase.from("quest_territories").delete().eq("quest_id", quest.id);
    if (editTerritories.length > 0) {
      await supabase.from("quest_territories" as any).insert(editTerritories.map((territory_id) => ({ quest_id: quest.id, territory_id })));
    }

    // ─── Quest Completion: award XP & credits ───────────────
    if (isBecomingCompleted) {
      // Award XP to creator
      await grantXp(quest.created_by_user_id, {
        type: XP_EVENT_TYPES.QUEST_COMPLETED_CREATOR,
        relatedEntityType: "quest",
        relatedEntityId: quest.id,
      });

      // Award XP and credit rewards to all participants
      const activeParticipants = (participants || []).filter(
        (p: any) => p.status === "ACCEPTED" && p.user_id !== quest.created_by_user_id
      );

      for (const p of activeParticipants) {
        // XP for each participant
        await grantXp(p.user_id, {
          type: XP_EVENT_TYPES.QUEST_COMPLETED_USER,
          relatedEntityType: "quest",
          relatedEntityId: quest.id,
        }, true);
      }

      // Distribute credit rewards to all participants (including creator)
      const creditRewardPerUser = quest.credit_reward;
      if (creditRewardPerUser > 0) {
        const allEligible = (participants || []).filter((p: any) => p.status === "ACCEPTED");
        for (const p of allEligible) {
          await grantCredits(p.user_id, {
            type: CREDIT_TX_TYPES.QUEST_REWARD_EARNED,
            amount: creditRewardPerUser,
            source: `Quest completed: ${quest.title}`,
            relatedEntityType: "quest",
            relatedEntityId: quest.id,
          }, true);
        }
        toast({ title: `${creditRewardPerUser} credits awarded to ${allEligible.length} participant(s)` });
      }

      // Deduct credit budget from creator if set
      const creditBudget = Number((quest as any).credit_budget) || 0;
      if (creditBudget > 0 && currentUser.id) {
        await spendCredits(currentUser.id, {
          type: CREDIT_TX_TYPES.QUEST_BUDGET_SPENT,
          amount: creditBudget,
          source: `Quest budget: ${quest.title}`,
          relatedEntityType: "quest",
          relatedEntityId: quest.id,
        });
      }

      toast({ title: "🎉 Quest completed!", description: "XP and rewards have been distributed to all participants." });
    }

    // ─── Quest Cancellation: refund all credit funding ──────
    if (isBecomingCancelled && (quest as any).funding_type === "CREDITS" && (quest as any).escrow_credits > 0) {
      const { data: refundResult, error: refundError } = await supabase.rpc("refund_quest_funding" as any, {
        _quest_id: quest.id,
      });
      if (refundError) {
        console.error("Refund error:", refundError.message);
        toast({ title: "Refund failed", description: refundError.message, variant: "destructive" });
      } else {
        const result = refundResult?.[0] || refundResult;
        toast({ title: "Credits refunded", description: `${result?.refunded_total ?? 0} Credits returned to ${result?.refunded_count ?? 0} contributor(s).` });
      }
    }

    qc.invalidateQueries({ queryKey: ["quest", id] });
    setEditOpen(false); toast({ title: "Quest updated" });
  };

  return (
    <PageShell>
      <SectionBanner {...HINTS.banners.questFirst} />
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      {quest.is_draft && <DraftBanner />}

      {/* Cancelled Quest Banner + Timeline */}
      {isCancelled && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <Ban className="h-6 w-6 text-destructive shrink-0" />
            <div>
              <h3 className="font-display font-bold text-destructive">Quest Cancelled</h3>
              <p className="text-sm text-muted-foreground">
                This quest has been cancelled. All interactions are locked.
                {(quest as any).funding_type === "CREDITS" && " Credit contributions have been refunded."}
              </p>
            </div>
          </div>
          {questTimeline.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Activity Timeline</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {questTimeline.map((ev: any) => (
                  <div key={ev.id} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-28 shrink-0">{new Date(ev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-medium">{ev.action_type.replace(/_/g, ' ')}</span>
                    {ev.target_name && <span className="text-muted-foreground truncate">— {ev.target_name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {quest.cover_image_url && (
        <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6">
          <img src={quest.cover_image_url} alt="" className="w-full h-full object-cover" style={{ objectPosition: `center ${(quest as any).cover_focal_y ?? 50}%` }} />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h1 className="font-display text-3xl font-bold">{questTr.title?.text || quest.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {(quest as any).quest_nature && (quest as any).quest_nature !== "PROJECT" && (
              <span className="inline-flex items-center gap-1">
                <Badge variant="outline" className={QUEST_NATURE_COLORS[(quest as any).quest_nature as QuestNature] || ''}>
                  {QUEST_NATURE_ICONS[(quest as any).quest_nature as QuestNature]}{" "}
                  {QUEST_NATURE_LABELS[(quest as any).quest_nature as QuestNature]}
                </Badge>
                <HintTooltip {...HINTS.tooltips.questType} />
              </span>
            )}
            {isMission(quest as any) && (quest as any).quest_nature !== "MISSION" && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                💰 Mission
              </Badge>
            )}
            {(() => {
              const coinsAvail = Number((quest as any).coins_escrow ?? (quest as any).coins_budget ?? 0);
              const ctgAvail = Number((quest as any).ctg_escrow ?? (quest as any).ctg_budget ?? (quest as any).credit_budget ?? quest.credit_reward ?? 0);
              const fiatPrice = quest.price_fiat > 0 ? quest.price_fiat / 100 : 0;
              if (coinsAvail > 0) {
                return (
                  <span className="flex items-center gap-1.5 text-lg font-bold text-amber-600">
                    🟩 {coinsAvail.toLocaleString()} Coins
                    <span className="text-xs text-muted-foreground font-normal">≈ €{(coinsAvail * coinsRate).toFixed(2)}</span>
                  </span>
                );
              }
              if (ctgAvail > 0) {
                return (
                  <span className="flex items-center gap-1.5 text-lg font-bold text-emerald-600">
                    🌱 {ctgAvail.toLocaleString()} $CTG
                  </span>
                );
              }
              if (fiatPrice > 0) {
                return (
                  <span className="flex items-center gap-1.5 text-lg font-bold text-amber-600">
                    <CreditCard className="h-5 w-5" /> €{fiatPrice.toFixed(2)}
                  </span>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Mission Budget & Economy Bar */}
        {((quest as any).mission_budget_min || (quest as any).mission_budget_max || quest.credit_reward > 0 || (quest as any).credit_budget > 0) && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {((quest as any).mission_budget_min || (quest as any).mission_budget_max) && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">💰 Mission Budget</p>
                <p className="text-lg font-bold">
                  🟩 {toCoins((quest as any).mission_budget_min ?? 0).toLocaleString()} – {toCoins((quest as any).mission_budget_max ?? 0).toLocaleString()} Coins
                </p>
                <p className="text-[10px] text-muted-foreground">≈ €{(quest as any).mission_budget_min ?? 0} – €{(quest as any).mission_budget_max ?? 0} • {(quest as any).payment_type || "INVOICE"}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground font-medium">🏆 XP Reward</p>
              <p className="text-lg font-bold text-primary">+{quest.reward_xp} XP</p>
              <p className="text-[10px] text-muted-foreground">
                Creator: +{XP_REWARDS[XP_EVENT_TYPES.QUEST_COMPLETED_CREATOR]} XP • Participant: +{XP_REWARDS[XP_EVENT_TYPES.QUEST_COMPLETED_USER]} XP
              </p>
              <p className="text-[10px] text-muted-foreground mt-2">
                ⭐ XP is permanent reputation. 🌱 $CTG is contribution to the commons (fades 1%/month).
              </p>
            </div>
            {quest.credit_reward > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">🌱 $CTG Reward</p>
                <p className="text-lg font-bold text-primary">{quest.credit_reward} $CTG</p>
                <p className="text-[10px] text-muted-foreground">Per participant on completion</p>
              </div>
            )}
            <CTGEstimateBlock subtaskCount={subtaskCounts?.total ?? 0} />
            {Number((quest as any).coins_budget ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">🟩 Coins Pool</p>
                <p className="text-lg font-bold">{Number((quest as any).coins_escrow ?? 0).toLocaleString()} Coins</p>
                <p className="text-[10px] text-muted-foreground">≈ €{(Number((quest as any).coins_escrow ?? 0) * coinsRate).toFixed(2)} in escrow</p>
              </div>
            )}
            {Number((quest as any).ctg_budget ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">🌱 $CTG Pool</p>
                <p className="text-lg font-bold">{Number((quest as any).ctg_escrow ?? 0).toLocaleString()} $CTG</p>
                <p className="text-[10px] text-muted-foreground">❄️ Frozen in escrow</p>
              </div>
            )}
            {(quest as any).credit_budget > 0 && Number((quest as any).coins_budget ?? 0) === 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">🏦 $CTG Budget</p>
                <p className="text-lg font-bold">{(quest as any).credit_budget} $CTG</p>
                <p className="text-[10px] text-muted-foreground">Funded by quest creator</p>
              </div>
            )}
            {quest.status === "COMPLETED" && (
              <div className="md:col-span-full">
                <Badge variant="default" className="bg-green-600 text-white">✅ Completed — Rewards distributed</Badge>
              </div>
            )}
          </div>
        )}

        {/* Commission Preview for quest with budget */}
        {((quest as any).mission_budget_min || (quest as any).mission_budget_max) && (
          <div className="mb-4">
            <CommissionEstimator
              budgetMin={String((quest as any).mission_budget_min ?? 0)}
              budgetMax={String((quest as any).mission_budget_max ?? (quest as any).mission_budget_min ?? 0)}
              compact
            />
          </div>
        )}


        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
          {/* Hosts display */}
          {resolvedHosts && resolvedHosts.length > 0 ? (
            <QuestHostsDisplay hosts={resolvedHosts} />
          ) : (
            guild && <Link to={`/guilds/${guild.id}`} className="hover:text-primary transition-colors">{guild.name}</Link>
          )}
          <span>·</span><span>by <Link to={`/users/${creator?.user_id}`} className="text-primary hover:underline">{creator?.name}</Link></span>
          {creator?.xp != null && <XpLevelBadge level={computeLevelFromXp(creator.xp)} compact />}
          <span>·</span>
          <Badge variant="outline" className="capitalize">{quest.status.toLowerCase().replace(/_/g, " ")}</Badge>
          {quest.price_fiat > 0 && (
            <Badge className="bg-amber-500/10 text-amber-600 border-0"><CreditCard className="h-3 w-3 mr-1" /> Paid — 🟩 {toCoins(quest.price_fiat / 100).toLocaleString()} Coins (≈ €{(quest.price_fiat / 100).toFixed(2)})</Badge>
          )}
          {quest.monetization_type === "FREE" && quest.price_fiat === 0 && (
            <Badge variant="secondary" className="capitalize">Free</Badge>
          )}
          {quest.is_featured && <Badge className="bg-warning/10 text-warning border-0">Featured</Badge>}
          {(quest as any).is_boosted && <Badge className="bg-orange-500/10 text-orange-600 border-0">🔥 Boosted</Badge>}
        </div>
        {(questTr.description?.text || quest.description) && (
          <div className="rounded-xl border border-border bg-card/50 p-4 max-w-2xl">
            <GuestContentGate
              blur
              previewText={questTr.description?.text || quest.description || ""}
              previewSentences={3}
            >
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{questTr.description?.text || quest.description}</p>
            </GuestContentGate>
            {questTr.description?.isTranslated && (
              <p className="text-[10px] text-muted-foreground mt-1 italic">🌐 Auto-translated</p>
            )}
          </div>
        )}
        {(quest as any).website_url && (
          <a
            href={(quest as any).website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className="truncate max-w-xs">{(quest as any).website_url.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topics.map((t: any) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)}
          {territories.map((t: any) => <Badge key={t.id} variant="outline">{t.name}</Badge>)}
        </div>

        <GuestOnboardingAssistant open={authPromptOpen} onOpenChange={setAuthPromptOpen} actionLabel={authPromptAction} />

        <div className="flex items-center gap-3 mt-4 flex-wrap">
            {!isCancelled && (
              <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={() => {
                if (!isLoggedIn) { setAuthPromptAction("follow this quest"); setAuthPromptOpen(true); return; }
                toggleFollow();
              }}><Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />{isFollowing ? "Unfollow" : "Follow"}</Button>
            )}
            {!isParticipant && !isCancelled && (
              <Button size="sm" variant={isPaidQuest ? "default" : "outline"} onClick={() => {
                if (!isLoggedIn) { setAuthPromptAction("join this quest"); setAuthPromptOpen(true); return; }
                joinQuest();
              }}>
                {isPaidQuest ? <><Lock className="h-4 w-4 mr-1" /> Pay & Join — 🟩 {toCoins(quest.price_fiat / 100).toLocaleString()} Coins</> : <><UserPlus className="h-4 w-4 mr-1" /> Join Quest</>}
              </Button>
            )}
            <ShareLinkButton entityType="quest" entityId={quest.id} entityName={quest.title} />
            {isLoggedIn && quest.status === "COMPLETED" && <GiveTrustButton targetNodeType={TrustNodeType.QUEST} targetNodeId={quest.id} targetName={quest.title} contextQuestId={quest.id} />}
            {isLoggedIn && <ReportButton targetType={ReportTargetType.QUEST} targetId={quest.id} />}
            {canPostUpdate && <InviteLinkButton entityType="quest" entityId={quest.id} entityName={quest.title} />}
            {isOwner && <Button size="sm" variant="outline" asChild><Link to={`/quests/${quest.id}/settings`}><Pencil className="h-4 w-4 mr-1" /> Edit / Settings</Link></Button>}
            
            {isOwner && !isCancelled && (
              <Button size="sm" variant="outline" onClick={toggleHighlight} title={isHighlighted ? "Remove from featured" : "Feature on your profile"}>
                <Star className={`h-4 w-4 mr-1 ${isHighlighted ? "text-amber-500 fill-amber-500" : ""}`} />
                {isHighlighted ? "Featured" : "Feature"}
              </Button>
            )}
            {canPostUpdate && !isCancelled && (
              <Dialog open={updateOpen} onOpenChange={(open) => { setUpdateOpen(open); if (!open) { setEditingUpdateId(null); setUTitle(""); setUContent(""); setUType("GENERAL"); setUImageUrl(undefined); setUDraft(false); setUVisibility("PUBLIC"); setUPostAs(null); } }}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Send className="h-4 w-4 mr-1" /> Post Update</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingUpdateId ? "Edit Quest Update" : "Post Quest Update"}</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <PostAsSelector value={uPostAs} onChange={setUPostAs} questId={quest.id} />
                    <div><label className="text-sm font-medium mb-1 block">Type</label><Select value={uType} onValueChange={setUType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GENERAL">General</SelectItem><SelectItem value="MILESTONE">Milestone</SelectItem><SelectItem value="CALL_FOR_HELP">Call for Help</SelectItem><SelectItem value="REFLECTION">Reflection</SelectItem></SelectContent></Select></div>
                    <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={uTitle} onChange={e => setUTitle(e.target.value)} maxLength={120} /></div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium">Content</label>
                        <AIWriterButton
                          type="quest_update"
                          context={{ title: quest.title, updateType: uType, updateTitle: uTitle }}
                          currentText={uContent}
                          onAccept={(text, extra) => { setUContent(text); if (extra?.suggestedTitle && !uTitle.trim()) setUTitle(extra.suggestedTitle); }}
                        />
                      </div>
                      <Textarea value={uContent} onChange={e => setUContent(e.target.value)} maxLength={1000} className="resize-none min-h-[100px]" />
                    </div>
                    <ImageUpload label="Image (optional)" currentImageUrl={uImageUrl} onChange={setUImageUrl} aspectRatio="16/9" />
                    <div><label className="text-sm font-medium mb-1 block">Visibility</label>
                      <Select value={uVisibility} onValueChange={setUVisibility}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PUBLIC">Public — anyone can see</SelectItem>
                          <SelectItem value="FOLLOWERS">Followers only</SelectItem>
                          <SelectItem value="INTERNAL">Internal — hosts & members only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between"><label className="text-sm font-medium">Save as draft</label><Switch checked={uDraft} onCheckedChange={setUDraft} /></div>
                    <Button onClick={postUpdate} disabled={!uTitle.trim() || !uContent.trim()} className="w-full"><Send className="h-4 w-4 mr-1" /> {uDraft ? "Save Draft" : editingUpdateId ? "Save Changes" : "Post Update"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={podOpen} onOpenChange={setPodOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><CircleDot className="h-4 w-4 mr-1" /> Create Pod</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Pod</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div><label className="text-sm font-medium mb-1 block">Pod name</label><Input value={podName} onChange={e => setPodName(e.target.value)} maxLength={100} /></div>
                  <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={podDesc} onChange={e => setPodDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
                  <ImageUpload label="Pod Image (optional)" currentImageUrl={podImageUrl} onChange={setPodImageUrl} aspectRatio="16/9" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium mb-1 block">Start date</label><Input type="date" value={podStart} onChange={e => setPodStart(e.target.value)} /></div>
                    <div><label className="text-sm font-medium mb-1 block">End date</label><Input type="date" value={podEnd} onChange={e => setPodEnd(e.target.value)} /></div>
                  </div>
                  <Button onClick={createPod} disabled={!podName.trim()} className="w-full">Create Pod</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => { if (!isLoggedIn && v !== "explore") { setAuthPromptAction("explore this quest"); setAuthPromptOpen(true); return; } setActiveTab(v); }}>
        <div className="flex items-center gap-1">
          <TabsList>
            <TabsTrigger value="explore">Explore</TabsTrigger>
            {isLoggedIn && <TabsTrigger value="work"><ListChecks className="h-3.5 w-3.5 mr-1" /> Work</TabsTrigger>}
            <TabsTrigger value="activity"><MessageCircle className="h-3.5 w-3.5 mr-1" /> Activity</TabsTrigger>
          </TabsList>

          {/* ─── Contextual More Menu ─── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2.5">
                <MoreHorizontal className="h-4 w-4" />
                <span className="ml-1 text-sm">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Living — show if quest has territory links or always for owners */}
              <DropdownMenuItem onClick={() => setActiveTab("living")}>
                <Leaf className="h-4 w-4 mr-2" /> Living
              </DropdownMenuItem>

              {/* Agents — show for participants */}
              {isLoggedIn && isParticipant && (
                <DropdownMenuItem onClick={() => setActiveTab("agents")}>
                  <Bot className="h-4 w-4 mr-2" /> Agents
                </DropdownMenuItem>
              )}

              {/* Chat & AI */}
              {isLoggedIn && (
                <DropdownMenuItem onClick={() => setActiveTab("ai-chat")}>
                  <Bot className="h-4 w-4 mr-2" /> Chat & AI
                </DropdownMenuItem>
              )}

              {/* Trust — only when completed */}
              {quest.status === "COMPLETED" && (
                <DropdownMenuItem onClick={() => setActiveTab("trust")}>
                  <Shield className="h-4 w-4 mr-2" /> Trust
                </DropdownMenuItem>
              )}

              {/* Pods — show if any exist or for owners */}
              {((questPods || []).length > 0 || isOwner) && (
                <DropdownMenuItem onClick={() => setActiveTab("pods")}>
                  <CircleDot className="h-4 w-4 mr-2" /> Pods ({(questPods || []).length})
                </DropdownMenuItem>
              )}

              {/* Documents */}
              <DropdownMenuItem onClick={() => setActiveTab("documents")}>
                <FileText className="h-4 w-4 mr-2" /> Documents
              </DropdownMenuItem>

              {/* Owner-only tools */}
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => setActiveTab("matchmaker")}>
                    <Sparkles className="h-4 w-4 mr-2" /> Matchmaker
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("memory")}>
                    <Brain className="h-4 w-4 mr-2" /> Memory
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("fundraising-ai")}>
                    <CurrencyIcon currency="coins" className="h-4 w-4 mr-2" /> Fundraising AI
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/quests/${quest.id}/settings`}><Puzzle className="h-4 w-4 mr-2" /> Settings</Link>
                  </DropdownMenuItem>
                  {!isCancelled && (
                    <DropdownMenuItem
                      className="text-orange-600 focus:text-orange-600"
                      onClick={async () => {
                        if (!confirm("Cancel this quest? Credit contributions will be refunded.")) return;
                        if ((quest as any).funding_type === "CREDITS" && (quest as any).escrow_credits > 0) {
                          await supabase.rpc("refund_quest_funding" as any, { _quest_id: quest.id });
                        }
                        await supabase.from("quests").update({ status: "CANCELLED" } as any).eq("id", quest.id);
                        qc.invalidateQueries({ queryKey: ["quest", id] });
                        toast({ title: "Quest cancelled" });
                      }}
                    >
                      <Ban className="h-4 w-4 mr-2" /> Cancel Quest
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to delete this quest?")) return;
                      await supabase.from("quests").update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq("id", quest.id);
                      toast({ title: "Quest deleted" });
                      navigate("/explore?tab=quests");
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Quest
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ═══════════ EXPLORE TAB ═══════════ */}
        <TabsContent value="explore">
          <QuestExploreTab
            quest={quest}
            participants={participants || []}
            resolvedHosts={resolvedHosts}
            topics={topics}
            territories={territories}
            currentUser={currentUser}
            isOwner={isOwner}
            isParticipant={isParticipant}
            isCollaborator={isCollaborator}
            isLoggedIn={isLoggedIn}
            canPostUpdate={canPostUpdate}
            translatedSummary={questTr.ai_summary?.text ?? null}
            isSummaryTranslated={questTr.ai_summary?.isTranslated ?? false}
          />
        </TabsContent>

        {/* ═══════════ WORK TAB ═══════════ */}
        <TabsContent value="work">
          <QuestWorkTab
            quest={quest}
            participants={participants || []}
            territories={territories}
            currentUser={currentUser}
            isOwner={isOwner}
            isParticipant={isParticipant}
            isCollaborator={isCollaborator}
            isGuildAdmin={isGuildAdmin}
          />
        </TabsContent>

        {/* ═══════════ ACTIVITY TAB ═══════════ */}
        <TabsContent value="activity">
          <QuestActivityTab
            quest={quest}
            updates={updates || []}
            participants={participants || []}
            topics={topics}
            territories={territories}
            currentUser={currentUser}
            isOwner={isOwner}
            isParticipant={isParticipant}
            canPostUpdate={canPostUpdate}
            qfc={qfc}
            onOpenUpdateDialog={() => {
              setEditingUpdateId(null); setUTitle(""); setUContent(""); setUType("GENERAL");
              setUImageUrl(undefined); setUDraft(false); setUVisibility("PUBLIC"); setUpdateOpen(true);
            }}
            onEditUpdate={openEditUpdate}
            onDeleteUpdate={deleteUpdate}
            onTogglePin={togglePin}
          />
        </TabsContent>

        {/* ═══════════ MORE MENU PAGES ═══════════ */}
        <TabsContent value="living" className="mt-6">
          <QuestLivingTab
            linkedType="quest"
            linkedId={quest.id}
            defaultTerritoryId={territories?.[0]?.id}
            isOwner={isOwner}
          />
        </TabsContent>

        {isParticipant && (
          <TabsContent value="agents" className="mt-6">
            <UnitAgentsTab unitType="quest" unitId={quest.id} unitName={quest.title} isAdmin={isOwner} />
          </TabsContent>
        )}

        <TabsContent value="ai-chat" className="mt-6">
          <UnitChat entityType="QUEST" entityId={quest.id} entityName={quest.title} />
        </TabsContent>

        {quest.status === "COMPLETED" && (
          <TabsContent value="trust" className="mt-6">
            <TrustTab nodeType={TrustNodeType.QUEST} nodeId={quest.id} />
          </TabsContent>
        )}

        <TabsContent value="pods" className="mt-6 space-y-3">
          {(questPods || []).length === 0 && <p className="text-muted-foreground">No pods yet. Create one above!</p>}
          {(questPods || []).map((pod: any) => {
            const memberCount = (pod.pod_members || []).length;
            return (
              <Link key={pod.id} to={`/pods/${pod.id}`} className="block rounded-lg border border-border bg-card hover:border-primary/30 transition-all overflow-hidden">
                {pod.image_url && <div className="h-28 w-full"><img src={pod.image_url} alt="" className="w-full h-full object-cover" /></div>}
                <div className="p-4">
                  <div className="flex items-center justify-between"><h4 className="font-display font-semibold">{pod.name}</h4><span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {memberCount}</span></div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{pod.description}</p>
                </div>
              </Link>
            );
          })}
        </TabsContent>

        <TabsContent value="documents" className="mt-6 space-y-6">
          <QuestExternalLinks questId={quest.id} isOwner={isOwner} />
          <AttachmentList targetType={AttachmentTargetType.QUEST} targetId={quest.id} />
          {isOwner && <div className="mt-4"><AttachmentUpload targetType={AttachmentTargetType.QUEST} targetId={quest.id} /></div>}
        </TabsContent>

        {isOwner && (
          <TabsContent value="matchmaker" className="mt-6">
            <MatchmakerPanel matchType="quest" questId={quest.id} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="memory" className="mt-6">
            <MemoryEnginePanel entityType="QUEST" entityId={quest.id} entityName={quest.title} guildId={quest.guild_id || undefined} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="fundraising-ai" className="mt-6">
            <FundraisingAIPanel quest={{
              title: quest.title,
              description: quest.description,
              credit_budget: (quest as any).credit_budget ?? 0,
              credit_reward: quest.credit_reward,
              escrow_credits: (quest as any).escrow_credits ?? 0,
              funding_goal_credits: (quest as any).funding_goal_credits,
              price_fiat: quest.price_fiat,
              price_currency: quest.price_currency || "EUR",
              status: quest.status,
              allow_fundraising: (quest as any).allow_fundraising ?? false,
            }} />
          </TabsContent>
        )}
      </Tabs>
      <PiContextSetter contextType="quest" contextId={id} />
    </PageShell>
  );
}
