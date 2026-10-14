import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuildDecisions } from "@/components/guild/GuildDecisions";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, MessageCircle, Sparkles, Megaphone, BookOpen, MoreHorizontal, Pencil, Calendar, Lightbulb, LayoutDashboard, Vote, FileText } from "lucide-react";
import { QuestNeedsManager } from "@/components/quest/QuestNeedsManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommentThread } from "@/components/CommentThread";
import { AttachmentList } from "@/components/AttachmentUpload";
import { GuildDiscussionTab } from "@/components/guild/GuildDiscussionTab";
import { GuildRitualsTab } from "@/components/guild/GuildRitualsTab";
import { CommentTargetType, AttachmentTargetType } from "@/types/enums";
import { formatDistanceToNow } from "date-fns";

const updateIcons: Record<string, typeof Sparkles> = {
  MILESTONE: Sparkles,
  CALL_FOR_HELP: Megaphone,
  REFLECTION: BookOpen,
  GENERAL: MessageCircle,
  OPPORTUNITY: Lightbulb,
};

interface QuestActivityTabProps {
  quest: any;
  updates: any[];
  participants: any[];
  topics: any[];
  territories: any[];
  currentUser: any;
  isOwner: boolean;
  isParticipant: boolean;
  canPostUpdate: boolean;
  qfc: { rituals: boolean; subtasks: boolean; discussion: boolean };
  onOpenUpdateDialog: () => void;
  onEditUpdate: (update: any) => void;
  onDeleteUpdate: (updateId: string) => void;
  onTogglePin: (updateId: string, currentPinned: boolean) => void;
  /** Documents and links of the quest, rendered as a sub-tab. */
  documentsSlot?: React.ReactNode;
}

export function QuestActivityTab({
  quest,
  updates,
  participants,
  topics,
  territories,
  currentUser,
  isOwner,
  isParticipant,
  canPostUpdate,
  qfc,
  onOpenUpdateDialog,
  onEditUpdate,
  onDeleteUpdate,
  onTogglePin,
  documentsSlot,
}: QuestActivityTabProps) {
  const { t } = useTranslation();
  const [sub, setSub] = useState("overview");
  const guild = quest.guilds;
  const canPost = isOwner || isParticipant || false;

  return (
    <div className="mt-6 space-y-4">
      <Tabs value={sub} onValueChange={setSub}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="h-3.5 w-3.5 mr-1" /> {t("questActivity.overview")}</TabsTrigger>
          <TabsTrigger value="updates"><Send className="h-3.5 w-3.5 mr-1" /> {t("questActivity.updates")}</TabsTrigger>
          <TabsTrigger value="discussion"><MessageCircle className="h-3.5 w-3.5 mr-1" /> {t("questActivity.discussion")}</TabsTrigger>
          {qfc.rituals && <TabsTrigger value="rituals"><Calendar className="h-3.5 w-3.5 mr-1" /> {t("questActivity.rituals")}</TabsTrigger>}
          <TabsTrigger value="decisions"><Vote className="h-3.5 w-3.5 mr-1" /> {t("questActivity.decisions")}</TabsTrigger>
          <TabsTrigger value="opportunities"><Lightbulb className="h-3.5 w-3.5 mr-1" /> {t("questActivity.opportunities")}</TabsTrigger>
          {documentsSlot && <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1" /> {t("questActivity.documents")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <QuestAlivePanel quest={quest} updates={updates} participants={participants} qfc={qfc} canPostUpdate={canPostUpdate}
            onOpenUpdateDialog={onOpenUpdateDialog} goTo={setSub} />
        </TabsContent>

        <TabsContent value="updates" className="mt-4 space-y-4">
          {canPostUpdate && (
            <Button size="sm" onClick={onOpenUpdateDialog}>
              <Send className="h-4 w-4 mr-1" /> Post Update
            </Button>
          )}
      {(updates || []).length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No updates yet.</p>
          {canPostUpdate && <p className="text-sm text-muted-foreground mt-1">Share your first progress update.</p>}
        </div>
      )}

      {(updates || []).map((update: any, i: number) => {
        const Icon = updateIcons[update.type] || MessageCircle;
        const isUpdateAuthor = currentUser.id === update.author_id;
        const canEdit = isUpdateAuthor || isOwner;

        return (
          <motion.div
            key={update.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl border bg-card p-5 space-y-3 ${update.pinned ? "border-primary/40 bg-primary/5" : "border-border"}`}
          >
            <div className="flex items-start gap-3">
              {update.posted_as_entity_type && update.posted_as_label ? (
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{update.posted_as_label?.[0]}</AvatarFallback>
                </Avatar>
              ) : update.author ? (
                <Link to={`/users/${update.author.user_id}`}>
                  <Avatar className="h-9 w-9"><AvatarImage src={update.author.avatar_url} /><AvatarFallback>{update.author.name?.[0]}</AvatarFallback></Avatar>
                </Link>
              ) : null}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  {update.posted_as_entity_type && update.posted_as_label ? (
                    <span className="font-medium">{update.posted_as_label}</span>
                  ) : update.author ? (
                    <Link to={`/users/${update.author.user_id}`} className="font-medium hover:text-primary">{update.author.name}</Link>
                  ) : null}
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge variant="secondary" className="text-[10px] capitalize">{update.type.toLowerCase().replace(/_/g, " ")}</Badge>
                  {update.pinned && <Badge className="text-[10px] bg-primary/10 text-primary border-0">Pinned</Badge>}
                  {update.visibility && update.visibility !== "PUBLIC" && (
                    <Badge variant="outline" className="text-[10px] capitalize">{update.visibility === "FOLLOWERS" ? "Followers" : "Internal"}</Badge>
                  )}
                  <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}</span>
                </div>
                <h4 className="font-display font-semibold mt-1">{update.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {(update.content || "").split(/(\[.*?\]\(.*?\))/).map((part: string, idx: number) => {
                    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
                    if (linkMatch) {
                      return <Link key={idx} to={linkMatch[2]} className="text-primary hover:underline font-medium">{linkMatch[1]}</Link>;
                    }
                    // Render **bold** text
                    return part.split(/(\*\*.*?\*\*)/).map((seg: string, sIdx: number) => {
                      const boldMatch = seg.match(/^\*\*(.*?)\*\*$/);
                      if (boldMatch) return <strong key={`${idx}-${sIdx}`}>{boldMatch[1]}</strong>;
                      return <span key={`${idx}-${sIdx}`}>{seg}</span>;
                    });
                  })}
                </p>
                {update.image_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border max-w-lg">
                    <img src={update.image_url} alt="" className="w-full h-auto" />
                  </div>
                )}
                <div className="mt-2"><AttachmentList targetType={AttachmentTargetType.QUEST_UPDATE} targetId={update.id} /></div>
              </div>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditUpdate(update)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                    {isOwner && <DropdownMenuItem onClick={() => onTogglePin(update.id, update.pinned)}>{update.pinned ? "Unpin" : "Pin"}</DropdownMenuItem>}
                    <DropdownMenuItem className="text-destructive" onClick={() => onDeleteUpdate(update.id)}>Delete</DropdownMenuItem>
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

        <TabsContent value="discussion" className="mt-4">
          <GuildDiscussionTab
            guildId={quest.guild_id || quest.id}
            guildName={guild?.name || quest.title}
            isAdmin={isOwner}
            isMember={isParticipant || false}
            canPost={canPost}
            initialTerritoryIds={territories.map((t: any) => t.id)}
            initialTopicIds={topics.map((t: any) => t.id)}
            scopeType="QUEST"
            scopeId={quest.id}
            membership={isOwner ? { role: "ADMIN" } : isParticipant ? { role: "MEMBER" } : undefined}
            currentUserId={currentUser.id}
          />
          <div className="mt-4">
            <CommentThread targetType={CommentTargetType.QUEST} targetId={quest.id} />
          </div>
        </TabsContent>

        {qfc.rituals && (
          <TabsContent value="rituals" className="mt-4">
            <GuildRitualsTab questId={quest.id} isAdmin={isOwner} isMember={isParticipant || false} />
          </TabsContent>
        )}

        <TabsContent value="decisions" className="mt-4">
          {isParticipant || isOwner ? (
            <GuildDecisions
              guildId={quest.guild_id || quest.id}
              entityType="QUEST"
              entityId={quest.id}
              isAdmin={isOwner}
              isMember={isParticipant || isOwner}
              currentUserId={currentUser.id}
              memberCount={Math.max(1, participants.length)}
              currentUserRole={isOwner ? "ADMIN" : "MEMBER"}
            />
          ) : (
            <p className="text-muted-foreground text-sm">{t("questActivity.decisionsMembersOnly")}</p>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <QuestNeedsManager questId={quest.id} questOwnerId={quest.created_by_user_id} />
        </TabsContent>

        {documentsSlot && <TabsContent value="documents" className="mt-4">{documentsSlot}</TabsContent>}
      </Tabs>
    </div>
  );
}

/** What is alive in the quest right now, each card leading to its sub-tab. */
function QuestAlivePanel({ quest, updates, participants, qfc, canPostUpdate, onOpenUpdateDialog, goTo }: {
  quest: any; updates: any[]; participants: any[]; qfc: { rituals: boolean };
  canPostUpdate: boolean; onOpenUpdateDialog: () => void; goTo: (tab: string) => void;
}) {
  const { t } = useTranslation();
  const nowIso = new Date().toISOString();

  const { data: live, isLoading } = useQuery({
    queryKey: ["quest-alive", quest.id],
    staleTime: 60_000,
    queryFn: async () => {
      const [ritual, occurrence, decision, discussion, needs] = await Promise.all([
        qfc.rituals
          ? supabase.from("rituals").select("id, title, next_occurrence").eq("quest_id", quest.id).eq("is_active", true).gte("next_occurrence", nowIso).order("next_occurrence", { ascending: true }).limit(1)
          : Promise.resolve({ data: [] as any[] }),
        qfc.rituals
          ? supabase.from("ritual_occurrences").select("id, scheduled_at, rituals!inner(title, quest_id)").eq("rituals.quest_id", quest.id).gte("scheduled_at", nowIso).order("scheduled_at", { ascending: true }).limit(1)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("decision_polls").select("id, question, closes_at, status").eq("entity_type", "QUEST").eq("entity_id", quest.id).eq("status", "OPEN").order("closes_at", { ascending: true, nullsFirst: false }).limit(3),
        supabase.from("feed_posts").select("id, content, created_at").eq("context_type", "QUEST_DISCUSSION").eq("context_id", quest.id).eq("is_deleted", false).order("created_at", { ascending: false }).limit(1),
        supabase.from("quest_needs").select("id, title, status").eq("quest_id", quest.id).in("status", ["open", "OPEN", "in_progress", "IN_PROGRESS"]).limit(5),
      ]);
      const r = (ritual.data ?? [])[0] as any;
      const o = (occurrence.data ?? [])[0] as any;
      const nextMeeting = [
        r?.next_occurrence ? { title: r.title as string, at: r.next_occurrence as string } : null,
        o?.scheduled_at ? { title: (o.rituals?.title ?? "") as string, at: o.scheduled_at as string } : null,
      ].filter(Boolean).sort((a: any, b: any) => a.at.localeCompare(b.at))[0] as { title: string; at: string } | undefined;
      return {
        nextMeeting,
        decisions: (decision.data ?? []) as any[],
        discussion: ((discussion.data ?? [])[0] ?? null) as any,
        needs: (needs.data ?? []) as any[],
      };
    },
  });

  const latestUpdate = (updates || []).find((u: any) => !u.is_draft) ?? (updates || [])[0];
  const when = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });
  const snippet = (text: string, n = 110) => (text.length > n ? text.slice(0, n).trimEnd() + "…" : text);

  const Card = ({ icon: Icon, title, tab, children, empty }: { icon: any; title: string; tab: string; children?: React.ReactNode; empty?: string }) => (
    <button type="button" onClick={() => goTo(tab)}
      className="text-left rounded-xl border border-border bg-card p-4 space-y-1.5 hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children ?? <p className="text-sm text-muted-foreground">{empty}</p>}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {qfc.rituals && (
          <Card icon={Calendar} title={t("questActivity.alive.nextMeeting")} tab="rituals" empty={isLoading ? "…" : t("questActivity.alive.noMeeting")}>
            {live?.nextMeeting && (
              <>
                <p className="text-sm font-medium">{live.nextMeeting.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(live.nextMeeting.at).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · {when(live.nextMeeting.at)}
                </p>
              </>
            )}
          </Card>
        )}

        <Card icon={Vote} title={t("questActivity.alive.decision")} tab="decisions" empty={isLoading ? "…" : t("questActivity.alive.noDecision")}>
          {live && live.decisions.length > 0 && (
            <>
              <p className="text-sm font-medium">{snippet(live.decisions[0].question, 90)}</p>
              <p className="text-xs text-muted-foreground">
                {live.decisions[0].closes_at ? t("questActivity.alive.closes", { when: when(live.decisions[0].closes_at) }) : t("questActivity.alive.openVote")}
                {live.decisions.length > 1 ? ` · ${t("questActivity.alive.moreCount", { count: live.decisions.length - 1 })}` : ""}
              </p>
            </>
          )}
        </Card>

        <Card icon={Send} title={t("questActivity.alive.lastUpdate")} tab="updates" empty={t("questActivity.alive.noUpdate")}>
          {latestUpdate && (
            <>
              <p className="text-sm font-medium">{latestUpdate.title}</p>
              <p className="text-xs text-muted-foreground">
                {latestUpdate.author?.name ? `${latestUpdate.author.name} · ` : ""}{when(latestUpdate.created_at)}
              </p>
            </>
          )}
        </Card>

        <Card icon={MessageCircle} title={t("questActivity.alive.lastDiscussion")} tab="discussion" empty={isLoading ? "…" : t("questActivity.alive.noDiscussion")}>
          {live?.discussion && (
            <>
              <p className="text-sm">{snippet(String(live.discussion.content ?? ""))}</p>
              <p className="text-xs text-muted-foreground">{when(live.discussion.created_at)}</p>
            </>
          )}
        </Card>

        <Card icon={Lightbulb} title={t("questActivity.alive.opportunities")} tab="opportunities" empty={isLoading ? "…" : t("questActivity.alive.noOpportunity")}>
          {live && live.needs.length > 0 && (
            <>
              <p className="text-sm font-medium">{t("questActivity.alive.openNeeds", { count: live.needs.length })}</p>
              <p className="text-xs text-muted-foreground">{live.needs.slice(0, 3).map((n: any) => n.title).join(" · ")}</p>
            </>
          )}
        </Card>

        <Card icon={Sparkles} title={t("questActivity.alive.team")} tab="updates">
          <p className="text-sm font-medium">{t("questActivity.alive.participants", { count: participants.length })}</p>
        </Card>
      </div>

      {canPostUpdate && (
        <Button size="sm" onClick={onOpenUpdateDialog}>
          <Send className="h-4 w-4 mr-1" /> Post Update
        </Button>
      )}
    </div>
  );
}
