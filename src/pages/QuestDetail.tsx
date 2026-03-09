import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { autoFollowEntity } from "@/hooks/useFollow";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Users, Sparkles, Megaphone, BookOpen, MessageCircle, Trophy, Plus, Heart, CircleDot, Building2, UserPlus, Pencil, Send, Coins, CreditCard, Lock, ListChecks, FileText, Bot, Brain, MoreHorizontal, TrendingDown, Handshake, Trash2, Hash, MapPin, Star, Mail, Loader2, Ban, Clock, AlertTriangle, Calendar, Puzzle, Save, Settings, Globe, Lightbulb, Shield } from "lucide-react";
import { CommissionEstimator } from "@/components/quest/CommissionEstimator";
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
import { UnitChat } from "@/components/UnitChat";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { UnitAgentsTab } from "@/components/UnitAgentsTab";
import { MemoryEnginePanel } from "@/components/MemoryEnginePanel";
import { FundraisingAIPanel } from "@/components/FundraisingAIPanel";
import { AIWriterButton } from "@/components/AIWriterButton";
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
  const navigate = useNavigate();

  const { data: creator } = usePublicProfile(quest?.created_by_user_id);
  const { data: resolvedHosts } = useResolvedQuestHosts(id);
  const { data: allTopicsList } = useTopics();
  const { data: allTerritoriesList } = useTerritories();

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
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (v: string) => setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    if (v === "overview") next.delete("tab"); else next.set("tab", v);
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
    setUpdateOpen(false); setUTitle(""); setUContent(""); setUType("GENERAL"); setUImageUrl(undefined); setUDraft(false); setUVisibility("PUBLIC"); setEditingUpdateId(null);
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
          <h1 className="font-display text-3xl font-bold">{quest.title}</h1>
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
            <span className="flex items-center gap-1.5 text-lg font-bold text-primary"><Zap className="h-5 w-5" /> {quest.reward_xp} XP <HintTooltip {...HINTS.tooltips.questXP} /></span>
          </div>
        </div>

        {/* Mission Budget & Economy Bar */}
        {((quest as any).mission_budget_min || (quest as any).mission_budget_max || quest.credit_reward > 0 || (quest as any).credit_budget > 0) && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {((quest as any).mission_budget_min || (quest as any).mission_budget_max) && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">💰 Mission Budget</p>
                <p className="text-lg font-bold">
                  €{(quest as any).mission_budget_min ?? "—"} – €{(quest as any).mission_budget_max ?? "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Payment in euros • {(quest as any).payment_type || "INVOICE"}</p>
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
                <p className="text-xs text-muted-foreground font-medium">⚡ Credit Reward</p>
                <p className="text-lg font-bold text-primary">{quest.credit_reward} Credits</p>
                <p className="text-[10px] text-muted-foreground">Per participant on completion</p>
              </div>
            )}
            <CTGEstimateBlock subtaskCount={subtaskCounts?.total ?? 0} />
            {(quest as any).credit_budget > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">🏦 Credit Budget</p>
                <p className="text-lg font-bold">{(quest as any).credit_budget} Credits</p>
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
            <Badge className="bg-amber-500/10 text-amber-600 border-0"><CreditCard className="h-3 w-3 mr-1" /> Paid — €{(quest.price_fiat / 100).toFixed(2)}</Badge>
          )}
          {quest.monetization_type === "FREE" && quest.price_fiat === 0 && (
            <Badge variant="secondary" className="capitalize">Free</Badge>
          )}
          {quest.is_featured && <Badge className="bg-warning/10 text-warning border-0">Featured</Badge>}
          {(quest as any).is_boosted && <Badge className="bg-orange-500/10 text-orange-600 border-0">🔥 Boosted</Badge>}
        </div>
        {quest.description && (
          <GuestContentGate blur>
            <div className="rounded-xl border border-border bg-card/50 p-4 max-w-2xl">
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{quest.description}</p>
            </div>
          </GuestContentGate>
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
                {isPaidQuest ? <><Lock className="h-4 w-4 mr-1" /> Pay & Join — €{(quest.price_fiat / 100).toFixed(2)}</> : <><UserPlus className="h-4 w-4 mr-1" /> Join Quest</>}
              </Button>
            )}
            <ShareLinkButton entityType="quest" entityId={quest.id} entityName={quest.title} />
            {isLoggedIn && quest.status === "COMPLETED" && <GiveTrustButton targetNodeType={TrustNodeType.QUEST} targetNodeId={quest.id} targetName={quest.title} contextQuestId={quest.id} />}
            {isLoggedIn && <ReportButton targetType={ReportTargetType.QUEST} targetId={quest.id} />}
            {canPostUpdate && <InviteLinkButton entityType="quest" entityId={quest.id} entityName={quest.title} />}
            {isOwner && !isCancelled && <Button size="sm" variant="outline" onClick={openEditQuest}><Pencil className="h-4 w-4 mr-1" /> Edit Quest</Button>}
            {isOwner && <Button size="sm" variant="outline" asChild><Link to={`/quests/${quest.id}/settings`}><Settings className="h-4 w-4 mr-1" /> Settings</Link></Button>}
            {isOwner && !isCancelled && (
              <Button size="sm" variant="outline" onClick={toggleHighlight} title={isHighlighted ? "Remove from featured" : "Feature on your profile"}>
                <Star className={`h-4 w-4 mr-1 ${isHighlighted ? "text-amber-500 fill-amber-500" : ""}`} />
                {isHighlighted ? "Featured" : "Feature"}
              </Button>
            )}
            {canPostUpdate && !isCancelled && (
              <Dialog open={updateOpen} onOpenChange={(open) => { setUpdateOpen(open); if (!open) { setEditingUpdateId(null); setUTitle(""); setUContent(""); setUType("GENERAL"); setUImageUrl(undefined); setUDraft(false); setUVisibility("PUBLIC"); } }}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Send className="h-4 w-4 mr-1" /> Post Update</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingUpdateId ? "Edit Quest Update" : "Post Quest Update"}</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
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

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Quest</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={120} /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Description</label>
                  <AIWriterButton
                    type="quest_story"
                    context={{ title: editTitle, status: editStatus, creditReward: editCreditReward, creditBudget: editCreditBudget }}
                    currentText={editDesc}
                    onAccept={(text) => setEditDesc(text)}
                  />
                </div>
                <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={500} className="resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Link / Website URL</label>
                <Input
                  value={editWebsiteUrl}
                  onChange={e => setEditWebsiteUrl(e.target.value)}
                  placeholder="https://…"
                  type="url"
                />
                <p className="text-xs text-muted-foreground mt-1">Optional link displayed on the quest page</p>
              </div>
              {/* Needs section in edit dialog */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-primary" /> Quest Needs
                </label>
                <p className="text-xs text-muted-foreground -mt-1">Add/edit needs in the <strong>Settings → Needs</strong> tab for a full editor.</p>
                <QuestNeedsManager questId={quest.id} questOwnerId={quest.created_by_user_id} />
              </div>
              <ImageUpload label="Cover Image" currentImageUrl={editCoverImageUrl} onChange={setEditCoverImageUrl} onFocalPointChange={setEditCoverFocalY} focalPoint={editCoverFocalY} aspectRatio="16/9" />
              <div><label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={editStatus} onValueChange={v => setEditStatus(v as QuestStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuestStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={QuestStatus.OPEN}>Open</SelectItem>
                    <SelectItem value={QuestStatus.OPEN_FOR_PROPOSALS}>Open for Proposals</SelectItem>
                    <SelectItem value={QuestStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={QuestStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={QuestStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Quest Nature</label>
                <Select value={editQuestNature} onValueChange={setEditQuestNature}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.values(QuestNature) as QuestNature[]).map(n => (
                      <SelectItem key={n} value={n}>{QUEST_NATURE_ICONS[n]} {QUEST_NATURE_LABELS[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  <Building2 className="h-3.5 w-3.5 inline mr-1" /> Entity Affiliations
                </label>
                <p className="text-xs text-muted-foreground">Manage affiliations in the <strong>Settings → Affiliations</strong> tab for multi-entity support.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">Credit Reward</label><Input type="number" value={editCreditReward} onChange={e => setEditCreditReward(e.target.value)} min={0} /></div>
                <div><label className="text-sm font-medium mb-1 block">Fiat Price (€ cents)</label><Input type="number" value={editPriceFiat} onChange={e => setEditPriceFiat(e.target.value)} min={0} /></div>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-3">
                <h4 className="text-sm font-semibold">Budget & Fundraising</h4>
                <div>
                  <label className="text-sm font-medium mb-1 block">Funding Type</label>
                  <Select value={editFundingType} onValueChange={(v) => setEditFundingType(v as "CREDITS" | "FIAT")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDITS">Credits (internal currency)</SelectItem>
                      <SelectItem value="FIAT">Fiat (€ via Stripe)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium mb-1 block">{editFundingType === "CREDITS" ? "Credit Budget" : "Fiat Budget (€)"}</label><Input type="number" value={editCreditBudget} onChange={e => setEditCreditBudget(e.target.value)} min={0} /><p className="text-xs text-muted-foreground mt-1">{editFundingType === "CREDITS" ? "Credits committed to pot" : "Euros committed to pot"}</p></div>
                  <div><label className="text-sm font-medium mb-1 block">Funding Goal</label><Input type="number" value={editFundingGoal} onChange={e => setEditFundingGoal(e.target.value)} min={0} placeholder="Optional" /><p className="text-xs text-muted-foreground mt-1">Target {editFundingType === "CREDITS" ? "Credits" : "€"} amount</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="editFundraising" checked={editAllowFundraising} onCheckedChange={setEditAllowFundraising} />
                  <label htmlFor="editFundraising" className="text-sm font-medium">Allow community fundraising</label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-1">
                  <Hash className="h-3.5 w-3.5" /> Topics
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="outline" size="sm" type="button" className="h-6 text-xs" onClick={() => setEditTopics((allTopicsList ?? []).map((t: any) => t.id))}>Select all</Button>
                  <Button variant="ghost" size="sm" type="button" className="h-6 text-xs" onClick={() => setEditTopics([])} disabled={editTopics.length === 0}>Clear all</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {(allTopicsList ?? []).map((t: any) => (
                    <Badge
                      key={t.id}
                      variant={editTopics.includes(t.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setEditTopics(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3.5 w-3.5" /> Territories
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="outline" size="sm" type="button" className="h-6 text-xs" onClick={() => setEditTerritories((allTerritoriesList ?? []).map((t: any) => t.id))}>Select all</Button>
                  <Button variant="ghost" size="sm" type="button" className="h-6 text-xs" onClick={() => setEditTerritories([])} disabled={editTerritories.length === 0}>Clear all</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {(allTerritoriesList ?? []).map((t: any) => (
                    <Badge
                      key={t.id}
                      variant={editTerritories.includes(t.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setEditTerritories(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={saveEditQuest} className="w-full">Save Changes</Button>
              {/* Danger Zone */}
              {!isCancelled && (
                <div className="rounded-lg border border-destructive/30 p-3 mt-2">
                  <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Danger Zone</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={async () => {
                      if (!confirm("Cancel this quest? Credit contributions will be refunded.")) return;
                      if ((quest as any).funding_type === "CREDITS" && (quest as any).escrow_credits > 0) {
                        await supabase.rpc("refund_quest_funding" as any, { _quest_id: quest.id });
                      }
                      await supabase.from("quests").update({ status: "CANCELLED" } as any).eq("id", quest.id);
                      qc.invalidateQueries({ queryKey: ["quest", id] });
                      setEditOpen(false);
                      toast({ title: "Quest cancelled" });
                    }}
                  >
                    <Ban className="h-4 w-4 mr-1" /> Cancel Quest & Refund
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => { if (!isLoggedIn && v !== "overview") { setAuthPromptAction("explore this quest"); setAuthPromptOpen(true); return; } setActiveTab(v); }}>
        <div className="flex items-center gap-1">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isLoggedIn && <TabsTrigger value="proposals">Contributions</TabsTrigger>}
            {isLoggedIn && <TabsTrigger value="subtasks">Subtasks{subtaskCounts && subtaskCounts.total > 0 ? ` (${subtaskCounts.open}/${subtaskCounts.total})` : ""}</TabsTrigger>}
            <TabsTrigger value="updates">Updates ({(updates || []).length})</TabsTrigger>
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
            {isLoggedIn && <TabsTrigger value="ai-chat"><Bot className="h-3.5 w-3.5 mr-1" /> Chat & AI</TabsTrigger>}
            {isLoggedIn && isParticipant && <TabsTrigger value="agents"><Bot className="h-3.5 w-3.5 mr-1" /> Agents</TabsTrigger>}
            {isLoggedIn && qfc.rituals && <TabsTrigger value="rituals"><Calendar className="h-3.5 w-3.5 mr-1" /> Rituals</TabsTrigger>}
            {quest.status === "COMPLETED" && <TabsTrigger value="trust"><Shield className="h-3.5 w-3.5 mr-1" /> Trust</TabsTrigger>}
            <TabsTrigger value="living"><Leaf className="h-3.5 w-3.5 mr-1" /> Living</TabsTrigger>
          </TabsList>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2.5">
                <MoreHorizontal className="h-4 w-4" />
                <span className="ml-1 text-sm">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveTab("pods")}>
                <CircleDot className="h-4 w-4 mr-2" /> Pods ({(questPods || []).length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("documents")}>
                <FileText className="h-4 w-4 mr-2" /> Documents
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => setActiveTab("matchmaker")}>
                    <Sparkles className="h-4 w-4 mr-2" /> Matchmaker
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("memory")}>
                    <Brain className="h-4 w-4 mr-2" /> Memory
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("fundraising-ai")}>
                    <Coins className="h-4 w-4 mr-2" /> Fundraising AI
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/quests/${quest.id}/settings`}><Puzzle className="h-4 w-4 mr-2" /> Settings</Link>
                  </DropdownMenuItem>
                  {!isCancelled && (
                    <DropdownMenuItem
                      className="text-orange-600 focus:text-orange-600"
                      onClick={async () => {
                        if (!confirm("Cancel this quest? Credit contributions will be refunded.")) return;
                        // Trigger refund if credit-funded
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

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Top trusted participants */}
          <TopTrustedMembers
            memberIds={(participants || []).map((p: any) => p.user_id)}
            relevantTags={(quest.quest_topics || []).map((qt: any) => qt.topics?.name).filter(Boolean)}
          />

          {/* Co-hosts management */}
          {(quest.guild_id || quest.company_id) && resolvedHosts && (
            <QuestCoHostsManager
              questId={quest.id}
              primaryEntityType={quest.guild_id ? "GUILD" : quest.company_id ? "COMPANY" : undefined}
              primaryEntityId={quest.guild_id || quest.company_id || undefined}
              hosts={resolvedHosts}
              canManage={isOwner}
            />
          )}

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Participants ({(participants || []).length})</h3>
            {canPostUpdate && (
              <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setInviteEmail(""); }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Invite</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Invite a participant</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    {/* Existing user search */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Search existing members</label>
                      <UserSearchInput
                        onSelect={async (user) => {
                          const already = (participants || []).some((p: any) => p.user_id === user.user_id);
                          if (already) { toast({ title: "Already a participant" }); return; }
                          const { error } = await supabase.from("quest_participants").insert({
                            quest_id: quest.id, user_id: user.user_id, role: "COLLABORATOR", status: "ACCEPTED",
                          });
                          if (error) { toast({ title: "Failed to invite", variant: "destructive" }); return; }
                          sendInviteNotification({ invitedUserId: user.user_id, inviterName: currentUser.name, entityType: "quest", entityId: quest.id, entityName: quest.title });
                          setInviteOpen(false);
                          qc.invalidateQueries({ queryKey: ["quest-participants", id] });
                          toast({ title: `${user.display_name || "User"} invited!` });
                        }}
                        placeholder="Search by name…"
                        excludeUserIds={(participants || []).map((p: any) => p.user_id)}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or invite by email</span></div>
                    </div>

                    {/* Email invite */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Invite someone new via email</label>
                      <form
                        className="flex gap-2"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const email = inviteEmail.trim().toLowerCase();
                          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                            toast({ title: "Please enter a valid email", variant: "destructive" });
                            return;
                          }
                          setInviteEmailSending(true);
                          try {
                            const { data, error } = await supabase.functions.invoke("invite-quest-email", {
                              body: { email, questId: quest.id, questTitle: quest.title, inviterName: currentUser.name },
                            });
                            if (error) throw error;
                            if (data?.error) {
                              toast({ title: data.error, variant: "destructive" });
                            } else if (data?.type === "existing_user") {
                              qc.invalidateQueries({ queryKey: ["quest-participants", id] });
                              toast({ title: "User found and added as participant!" });
                              setInviteOpen(false);
                            } else {
                              toast({ title: data?.emailSent ? "Invitation email sent!" : "Invite recorded (email delivery pending)" });
                              setInviteOpen(false);
                            }
                          } catch (err: any) {
                            toast({ title: err.message || "Failed to send invite", variant: "destructive" });
                          } finally {
                            setInviteEmailSending(false);
                            setInviteEmail("");
                          }
                        }}
                      >
                        <Input
                          type="email"
                          placeholder="colleague@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="submit" size="sm" disabled={inviteEmailSending}>
                          {inviteEmailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-1" /> Send</>}
                        </Button>
                      </form>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {(participants || []).map((p: any) => (
              <Link key={p.id} to={`/users/${p.user_id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                <Avatar className="h-9 w-9"><AvatarImage src={p.user?.avatar_url} /><AvatarFallback>{p.user?.name?.[0]}</AvatarFallback></Avatar>
                <div><p className="text-sm font-medium">{p.user?.name}</p><div className="flex gap-1.5"><Badge variant="secondary" className="text-[10px] capitalize">{p.role.toLowerCase()}</Badge><Badge variant="outline" className="text-[10px] capitalize">{p.status.toLowerCase()}</Badge></div></div>
              </Link>
            ))}
          </div>

          {/* Quest Followers (excluding participants) */}
          <QuestFollowersSection questId={quest.id} participantUserIds={(participants || []).map((p: any) => p.user_id)} />

          {/* Attached Entities (hosts) */}
          {resolvedHosts && resolvedHosts.length > 0 && (
            <div className="mt-6">
              <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Building2 className="h-4 w-4" /> Hosted by</h3>
              <div className="flex flex-wrap gap-3">
                {resolvedHosts.map((host) => (
                  <Link
                    key={host.id}
                    to={host.entity_type === "GUILD" ? `/guilds/${host.entity_id}` : `/companies/${host.entity_id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={host.logo_url ?? undefined} />
                      <AvatarFallback>{host.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{host.name}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{host.role === "PRIMARY" ? "Host" : "Co-host"}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="proposals" className="mt-6">
          <QuestProposals
            questId={quest.id}
            questOwnerId={quest.created_by_user_id}
            questStatus={quest.status}
            missionBudgetMin={(quest as any).mission_budget_min}
            missionBudgetMax={(quest as any).mission_budget_max}
            paymentType={(quest as any).payment_type}
          />
        </TabsContent>

        <TabsContent value="subtasks" className="mt-6 space-y-6">
          <QuestSubtasks
            questId={quest.id}
            questOwnerId={quest.created_by_user_id}
            guildId={quest.guild_id}
            canManage={isOwner || isCollaborator}
          />
          <ContributionLogPanel
            questId={quest.id}
            questOwnerId={quest.created_by_user_id}
            guildId={quest.guild_id}
            territoryId={territories.length > 0 ? territories[0].id : null}
            isCoHost={isCollaborator}
            isGuildAdmin={isGuildAdmin}
          />
        </TabsContent>

        <TabsContent value="updates" className="mt-6 space-y-4">
          {canPostUpdate && (
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Share progress, milestones, and calls-to-action with your community.</p>
              <Button size="sm" onClick={() => { setEditingUpdateId(null); setUTitle(""); setUContent(""); setUType("GENERAL"); setUImageUrl(undefined); setUDraft(false); setUVisibility("PUBLIC"); setUpdateOpen(true); }}>
                <Send className="h-4 w-4 mr-1" /> Create Update
              </Button>
            </div>
          )}
          {(updates || []).length === 0 && <div className="text-center py-10"><p className="text-muted-foreground">No updates yet.</p>{canPostUpdate && <p className="text-sm text-muted-foreground mt-1">Share your first progress update.</p>}</div>}
          {(updates || []).map((update: any, i: number) => {
            const Icon = updateIcons[update.type] || MessageCircle;
            const isUpdateAuthor = currentUser.id === update.author_id;
            const canEdit = isUpdateAuthor || isOwner;
            return (
              <motion.div key={update.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-xl border bg-card p-5 space-y-3 ${update.pinned ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                <div className="flex items-start gap-3">
                  {update.author && (
                    <Link to={`/users/${update.author.user_id}`}>
                      <Avatar className="h-9 w-9"><AvatarImage src={update.author.avatar_url} /><AvatarFallback>{update.author.name?.[0]}</AvatarFallback></Avatar>
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      {update.author && <Link to={`/users/${update.author.user_id}`} className="font-medium hover:text-primary">{update.author.name}</Link>}
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary" className="text-[10px] capitalize">{update.type.toLowerCase().replace(/_/g, " ")}</Badge>
                      {update.pinned && <Badge className="text-[10px] bg-primary/10 text-primary border-0">📌 Pinned</Badge>}
                      {update.visibility && update.visibility !== "PUBLIC" && (
                        <Badge variant="outline" className="text-[10px] capitalize">{update.visibility === "FOLLOWERS" ? "Followers" : "Internal"}</Badge>
                      )}
                      <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}</span>
                    </div>
                    <h4 className="font-display font-semibold mt-1">{update.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{update.content}</p>
                    {update.image_url && <div className="mt-3 rounded-lg overflow-hidden border border-border max-w-lg"><img src={update.image_url} alt="" className="w-full h-auto" /></div>}
                    <div className="mt-2"><AttachmentList targetType={AttachmentTargetType.QUEST_UPDATE} targetId={update.id} /></div>
                  </div>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditUpdate(update)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        {isOwner && <DropdownMenuItem onClick={() => togglePin(update.id, update.pinned)}>{update.pinned ? "Unpin" : "📌 Pin"}</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteUpdate(update.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {update.comments_enabled !== false && (
                  <div className="ml-12 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Comments on this update</p>
                    <CommentThread targetType={CommentTargetType.QUEST_UPDATE} targetId={update.id} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </TabsContent>

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

        <TabsContent value="discussion" className="mt-6 space-y-6">
          <GuildDiscussionTab
            guildId={quest.guild_id || quest.id}
            guildName={guild?.name || quest.title}
            isAdmin={isOwner}
            isMember={isParticipant || false}
            canPost={isOwner || isParticipant || false}
            initialTerritoryIds={territories.map((t: any) => t.id)}
            initialTopicIds={topics.map((t: any) => t.id)}
            scopeType="QUEST"
            scopeId={quest.id}
            membership={isOwner ? { role: "ADMIN" } : isParticipant ? { role: "MEMBER" } : undefined}
            currentUserId={currentUser.id}
          />
          <CommentThread targetType={CommentTargetType.QUEST} targetId={quest.id} />
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

        <TabsContent value="ai-chat" className="mt-6">
          <UnitChat entityType="QUEST" entityId={quest.id} entityName={quest.title} />
        </TabsContent>

        {isParticipant && (
          <TabsContent value="agents" className="mt-6">
            <UnitAgentsTab unitType="quest" unitId={quest.id} unitName={quest.title} isAdmin={isOwner} />
          </TabsContent>
        )}

        {qfc.rituals && (
          <TabsContent value="rituals" className="mt-6">
            <GuildRitualsTab questId={quest.id} isAdmin={isOwner} isMember={isParticipant || false} />
          </TabsContent>
        )}

        {quest.status === "COMPLETED" && (
          <TabsContent value="trust" className="mt-6">
            <TrustTab nodeType={TrustNodeType.QUEST} nodeId={quest.id} />
          </TabsContent>
        )}

        <TabsContent value="living" className="mt-6">
          <QuestLivingTab
            linkedType="quest"
            linkedId={quest.id}
            defaultTerritoryId={territories?.[0]?.id}
            isOwner={isOwner}
          />
        </TabsContent>
        
      </Tabs>
      <PiContextSetter contextType="quest" contextId={id} />
    </PageShell>
  );
}
