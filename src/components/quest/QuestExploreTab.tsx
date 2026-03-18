import { Link } from "react-router-dom";
import { Users, Heart, Building2, UserPlus, Lightbulb, Loader2, Mail, HandHeart, Sparkles, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { QuestProposals } from "@/components/quest/QuestProposals";

import { QuestHostsDisplay, QuestCoHostsManager } from "@/components/quest/QuestCoHosts";
import { TopTrustedMembers } from "@/components/trust/TopTrustedMembers";
import { UserSearchInput } from "@/components/UserSearchInput";
import { sendInviteNotification } from "@/lib/inviteNotification";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ExternalLinksPanel, type ExternalLinkItem } from "@/components/guild/ExternalLinksPanel";

interface QuestExploreTabProps {
  quest: any;
  participants: any[];
  resolvedHosts: any[] | undefined;
  topics: any[];
  territories: any[];
  currentUser: any;
  isOwner: boolean;
  isParticipant: boolean;
  isCollaborator: boolean;
  isLoggedIn: boolean;
  canPostUpdate: boolean;
}

export function QuestExploreTab({
  quest,
  participants,
  resolvedHosts,
  topics,
  territories,
  currentUser,
  isOwner,
  isParticipant,
  isCollaborator,
  isLoggedIn,
  canPostUpdate,
}: QuestExploreTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailSending, setInviteEmailSending] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Quest followers
  const { data: followers = [] } = useQuery({
    queryKey: ["quest-followers-overview", quest.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("target_id", quest.id)
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
    enabled: !!quest.id,
  });

  const participantUserIds = (participants || []).map((p: any) => p.user_id);
  const nonParticipantFollowers = followers.filter((f) => !participantUserIds.includes(f.user_id));

  // External links
  const { data: links = [] } = useQuery<ExternalLinkItem[]>({
    queryKey: ["quest-external-links", quest.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("features_config")
        .eq("id", quest.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return [];
      const cfg = (data.features_config as Record<string, unknown> | null) ?? {};
      const externalLinks = cfg.external_links;
      return Array.isArray(externalLinks) ? (externalLinks as ExternalLinkItem[]) : [];
    },
    enabled: !!quest.id,
  });

  const generateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quest-summary", {
        body: { questId: quest.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries({ queryKey: ["quest-detail"] });
      toast({ title: "Summary generated!" });
    } catch (e: any) {
      toast({ title: "Failed to generate summary", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const aiSummary = (quest as any).ai_summary;

  return (
    <div className="mt-6 space-y-8">

      {/* ═══ 1. AI Summary ═══ */}
      <section>
        {aiSummary ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">{aiSummary}</p>
            </div>
            {isOwner && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-xs text-muted-foreground"
                onClick={generateSummary}
                disabled={generatingSummary}
              >
                {generatingSummary ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Regenerate
              </Button>
            )}
          </div>
        ) : isOwner ? (
          <Button
            variant="outline"
            size="sm"
            onClick={generateSummary}
            disabled={generatingSummary}
            className="gap-2"
          >
            {generatingSummary ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate AI Summary
          </Button>
        ) : null}
      </section>

      {/* ═══ 2. Hosted by + Co-hosts ═══ */}
      {resolvedHosts && resolvedHosts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" /> Hosted by
            </h3>
            {/* Co-host manager inline next to Hosted by */}
            {(quest.guild_id || quest.company_id) && isOwner && (
              <QuestCoHostsManager
                questId={quest.id}
                primaryEntityType={quest.guild_id ? "GUILD" : quest.company_id ? "COMPANY" : undefined}
                primaryEntityId={quest.guild_id || quest.company_id || undefined}
                hosts={resolvedHosts}
                canManage={isOwner}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {resolvedHosts.map((host) => (
              <Link
                key={host.id}
                to={host.entity_type === "GUILD" ? `/guilds/${host.entity_id}` : `/companies/${host.entity_id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all"
              >
                <Avatar className="h-9 w-9"><AvatarImage src={host.logo_url ?? undefined} /><AvatarFallback>{host.name?.[0]}</AvatarFallback></Avatar>
                <div>
                  <p className="text-sm font-medium">{host.name}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{host.role === "PRIMARY" ? "Host" : "Co-host"}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ 3. Opportunities & I want to help ═══ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" /> Opportunities
          </h2>
          <div className="flex items-center gap-2">
            <Link to={`/opportunities?quest=${quest.id}`}>
              <Button size="sm" variant="ghost" className="text-xs gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" /> View opportunities
              </Button>
            </Link>
            {canPostUpdate && (
              <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setInviteEmail(""); }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Invite</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Invite a participant</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
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
                          qc.invalidateQueries({ queryKey: ["quest-participants", quest.id] });
                          toast({ title: `${user.display_name || "User"} invited!` });
                        }}
                        placeholder="Search by name…"
                        excludeUserIds={participantUserIds}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or invite by email</span></div>
                    </div>
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
                              qc.invalidateQueries({ queryKey: ["quest-participants", quest.id] });
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
                        <Input type="email" placeholder="colleague@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-1" />
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

        {/* Needs + Campaigns + Proposals */}
        {isLoggedIn && (
          <QuestProposals
            questId={quest.id}
            questOwnerId={quest.created_by_user_id}
            questStatus={quest.status}
            missionBudgetMin={(quest as any).mission_budget_min}
            missionBudgetMax={(quest as any).mission_budget_max}
            paymentType={(quest as any).payment_type}
          />
        )}

        {/* Participants compact */}
        <div className="mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2 text-sm mb-2">
            <Users className="h-4 w-4" /> Participants ({(participants || []).length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {(participants || []).slice(0, 8).map((p: any) => (
              <Link key={p.id} to={`/users/${p.user_id}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:border-primary/30 transition-all">
                <Avatar className="h-7 w-7"><AvatarImage src={p.user?.avatar_url} /><AvatarFallback>{p.user?.name?.[0]}</AvatarFallback></Avatar>
                <div>
                  <span className="text-xs font-medium">{p.user?.name}</span>
                  <Badge variant="secondary" className="text-[10px] capitalize ml-1.5">{p.role.toLowerCase()}</Badge>
                </div>
              </Link>
            ))}
            {(participants || []).length > 8 && (
              <span className="flex items-center text-xs text-muted-foreground px-2">+{(participants || []).length - 8} more</span>
            )}
          </div>
        </div>

        {/* Followers */}
        {nonParticipantFollowers.length > 0 && (
          <div>
            <h3 className="font-display font-semibold flex items-center gap-2 mb-2 text-sm">
              <Heart className="h-4 w-4 text-muted-foreground" />
              Following ({nonParticipantFollowers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {nonParticipantFollowers.slice(0, 6).map((f) => (
                <Link key={f.user_id} to={`/users/${f.user_id}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:border-primary/30 transition-all">
                  <Avatar className="h-6 w-6"><AvatarImage src={f.avatar_url ?? undefined} /><AvatarFallback className="text-[10px]">{f.name?.[0]}</AvatarFallback></Avatar>
                  <span className="text-xs font-medium">{f.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top trusted */}
        <TopTrustedMembers
          memberIds={participantUserIds}
          relevantTags={(quest.quest_topics || []).map((qt: any) => qt.topics?.name).filter(Boolean)}
        />
      </section>

      {/* ═══ 5. Resources ═══ */}
      <section className="space-y-4">
        {/* Available Rewards */}
        {(quest.credit_reward > 0 || Number((quest as any).coins_budget ?? 0) > 0 || Number((quest as any).ctg_budget ?? 0) > 0) && (
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-3">
              <CurrencyIcon currency="ctg" className="h-5 w-5" /> Available Rewards
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {quest.credit_reward > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground font-medium">$CTG Reward</p>
                  <p className="text-lg font-bold text-primary">{quest.credit_reward} $CTG</p>
                  <p className="text-[10px] text-muted-foreground">Per participant on completion</p>
                </div>
              )}
              {Number((quest as any).coins_budget ?? 0) > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground font-medium">Coins Pool</p>
                  <p className="text-lg font-bold">{Number((quest as any).coins_escrow ?? 0).toLocaleString()} Coins</p>
                  <p className="text-[10px] text-muted-foreground">In escrow</p>
                </div>
              )}
              {Number((quest as any).ctg_budget ?? 0) > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground font-medium">$CTG Pool</p>
                  <p className="text-lg font-bold">{Number((quest as any).ctg_escrow ?? 0).toLocaleString()} $CTG</p>
                  <p className="text-[10px] text-muted-foreground">Frozen in escrow</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* External links */}
        {links.length > 0 && (
          <ExternalLinksPanel links={links} onLinksChange={() => {}} canEdit={false} />
        )}
      </section>
    </div>
  );
}
