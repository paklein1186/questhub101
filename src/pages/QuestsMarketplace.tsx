import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Zap, Building2, Plus, Users, ChevronRight, Loader2, Coins, CreditCard, MapPin, Lock, Tag, EyeOff, ListChecks, Target, HandCoins } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { useAuth } from "@/hooks/useAuth";
import { useQuests, useMyGuildMemberships, useMyCompanies } from "@/hooks/useSupabaseData";
import { ExploreFilters, ExploreFilterValues, defaultFilters, applySortBy } from "@/components/ExploreFilters";
import { useHouseFilter } from "@/hooks/useHouseFilter";
import { PublicExploreCTA } from "@/components/PublicExploreCTA";
import { QUEST_NATURE_LABELS, QUEST_NATURE_COLORS, QUEST_NATURE_ICONS, isMission } from "@/lib/questTypes";
import { QuestNature } from "@/types/enums";

function CreateQuestButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: memberships } = useMyGuildMemberships();
  const { data: companyMemberships } = useMyCompanies();

  const myAdminGuilds = (memberships ?? []).filter((m) => m.role === "ADMIN").map((m) => m.guilds).filter(Boolean);
  const myCompanies = (companyMemberships ?? []).map((m) => m.companies).filter(Boolean);

  const go = (path: string) => { setOpen(false); navigate(path); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Quest</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create a new Quest</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {myAdminGuilds.length > 0 || myCompanies.length > 0
            ? "You can create this quest as yourself, or attach it to a Guild or Company you manage."
            : "You can create this quest as yourself."}
        </p>
        <Button variant="outline" className="w-full justify-between" onClick={() => go("/quests/new")}>
          <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Continue as myself</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {myAdminGuilds.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Create under a Guild</h3>
            <div className="space-y-1.5">
              {myAdminGuilds.map((g: any) => (
                <Button key={g.id} variant="ghost" className="w-full justify-between" onClick={() => go(`/guilds/${g.id}/quests/new`)}>
                  <span className="truncate">{g.name}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </Button>
              ))}
            </div>
          </div>
        )}
        {myCompanies.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Create under a Company</h3>
            <div className="space-y-1.5">
              {myCompanies.map((c: any) => (
                <Button key={c.id} variant="ghost" className="w-full justify-between" onClick={() => go(`/companies/${c.id}/quests/new`)}>
                  <span className="truncate">{c.name}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function QuestsMarketplace({ bare, statusFilter: externalStatusFilter, natureFilter }: { bare?: boolean; statusFilter?: string; natureFilter?: string }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ExploreFilterValues>(defaultFilters);
  const [hideCompleted, setHideCompleted] = useState(true);

  const currentUser = useCurrentUser();
  const { session } = useAuth();
  const isLoggedIn = !!session;
  const isAdm = checkIsGlobalAdmin(currentUser.email);

  const { data: questsData, isLoading } = useQuests();
  const hf = useHouseFilter();
  const allQuests = questsData ?? [];

  const preFiltered = hf.applyHouseFilter(allQuests, (q) =>
    (q.quest_topics ?? []).map((qt: any) => qt.topic_id)
  );

  const effectiveStatusFilter = externalStatusFilter || filters.status;

  const filtered = applySortBy(preFiltered.filter((q) => {
    if (q.is_draft && !isAdm && q.created_by_user_id !== currentUser.id) return false;
    if (hideCompleted && (q.status === "COMPLETED" || q.status === "CANCELLED")) return false;
    const qStatus = q.status as string;
    // When filtering by nature (e.g. IDEAS)
    if (natureFilter && (q as any).quest_nature !== natureFilter) return false;
    // When showing open quests for Jobs subtab
    if (externalStatusFilter === "OPEN_OR_PROPOSALS" && qStatus !== "OPEN" && qStatus !== "OPEN_FOR_PROPOSALS") return false;
    // When NOT showing ideas and no nature filter, hide IDEA quests
    if (!natureFilter && !externalStatusFilter && (q as any).quest_nature === "IDEA") return false;
    if (filters.topicIds.length > 0 && !q.quest_topics?.some((qt: any) => filters.topicIds.includes(qt.topic_id))) return false;
    if (filters.territoryIds.length > 0 && !q.quest_territories?.some((qt: any) => filters.territoryIds.includes(qt.territory_id))) return false;
    if (effectiveStatusFilter !== "all" && !externalStatusFilter && qStatus !== effectiveStatusFilter) return false;
    if (filters.monetization !== "all" && q.monetization_type !== filters.monetization) return false;
    if (filters.questType !== "all" && (q as any).quest_nature !== filters.questType) return false;
    if (filters.missionOnly && !isMission(q as any)) return false;
    return true;
  }), filters.sortBy);

  // In public mode, show only aggregated stats instead of full quest cards
  const publicQuestCount = filtered.length;

  return (
    <PageShell bare={bare}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
         <h1 className="font-display text-3xl font-bold flex items-center gap-2">
           <Compass className="h-7 w-7 text-primary" /> Quests Marketplace
         </h1>
         {isLoggedIn && !bare && <CreateQuestButton />}
       </div>

      {!isLoggedIn && (
        <PublicExploreCTA
          message="To see quest details, descriptions, and participate, please log in or create an account."
          className="mb-6"
        />
      )}

      <div className="mb-6">
        <ExploreFilters
          filters={filters}
          onChange={setFilters}
          config={{ showTopics: true, showTerritories: true, showStatus: true, showMonetization: true, showQuestType: true, showMission: true }}
          houseFilter={{
            active: hf.houseFilterActive,
            onToggle: hf.setHouseFilterActive,
            hasHouses: hf.hasHouses,
            topicNames: hf.topicNames,
            myTopicIds: hf.myTopicIds,
          }}
          universeMode={hf.universeMode}
          onUniverseModeChange={hf.setUniverseMode}
        />
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${hideCompleted ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:border-primary/20"}`}
          >
            <EyeOff className="h-3 w-3" />
            Completed hidden
          </button>
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {/* Public mode: show aggregated count instead of individual quest cards */}
      {!isLoggedIn && !isLoading && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Compass className="h-10 w-10 text-primary mx-auto mb-3 opacity-60" />
          <p className="text-2xl font-bold text-primary mb-1">{publicQuestCount}</p>
          <p className="text-sm text-muted-foreground">quests currently active in the ecosystem</p>
          <p className="text-xs text-muted-foreground mt-2">Log in to browse individual quests, see details, and participate.</p>
        </div>
      )}

      {/* Logged-in mode: full quest cards */}
      {isLoggedIn && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((quest, i) => (
            <motion.div key={quest.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/quests/${quest.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                <UnitCoverImage type="QUEST" imageUrl={quest.cover_image_url} name={quest.title} height="h-32" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold">{quest.title}</h3>
                      {(quest as any).quest_nature && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${QUEST_NATURE_COLORS[(quest as any).quest_nature as QuestNature] || ''}`}>
                          {QUEST_NATURE_ICONS[(quest as any).quest_nature as QuestNature]} {QUEST_NATURE_LABELS[(quest as any).quest_nature as QuestNature]}
                        </Badge>
                      )}
                    </div>
                    {(() => {
                      const gb = Number((quest as any).gameb_token_budget) || 0;
                      const fi = Number((quest as any).budget_min) || 0;
                      if (gb > 0) return <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">🟩 {gb}</span>;
                      if (fi > 0) return <span className="flex items-center gap-1 text-sm font-semibold text-primary"><CreditCard className="h-4 w-4" /> {fi}€</span>;
                      return null;
                    })()}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{quest.description}</p>
                  {(() => {
                    const terrs = (quest.quest_territories || []).map((qt: any) => qt.territories).filter(Boolean);
                    return terrs.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {terrs.slice(0, 2).map((t: any) => (
                          <Badge key={t.id} variant="outline" className="text-[10px] px-1.5 py-0">
                            <MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}
                          </Badge>
                        ))}
                        {terrs.length > 2 && <span className="text-[10px] text-muted-foreground">+{terrs.length - 2}</span>}
                      </div>
                    ) : null;
                  })()}
                  {/* Funding progress bar */}
                  {(quest as any).allow_fundraising && (quest as any).funding_goal_credits > 0 && (
                    <div className="mb-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <HandCoins className="h-3 w-3" /> Fundraising
                        </span>
                        <span className="font-medium text-primary">
                          {(quest as any).escrow_credits ?? 0} / {(quest as any).funding_goal_credits} Cr
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, (((quest as any).escrow_credits ?? 0) / (quest as any).funding_goal_credits) * 100)}
                        className="h-1.5"
                      />
                    </div>
                  )}
                  {/* Reward badges — prioritise $CTG / Fiat over XP */}
                  {(() => {
                    const gameb = Number((quest as any).gameb_token_budget) || 0;
                    const fiat = Number((quest as any).budget_min) || 0;
                    const xp = quest.reward_xp || 0;
                    const credits = Number((quest as any).credit_reward) || 0;
                    const showGameb = gameb > 0;
                    const showFiat = fiat > 0;
                    if (!showGameb && !showFiat && credits <= 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {showGameb && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5 border-emerald-500/30 text-emerald-600">
                            🟩 {gameb} $CTG
                          </Badge>
                        )}
                        {showFiat && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5">
                            <CreditCard className="h-3 w-3 text-primary" /> {fiat}€
                          </Badge>
                        )}
                        {credits > 0 && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5">
                            <Coins className="h-3 w-3 text-primary" /> {credits} Credits
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{(quest as any).guilds?.name}</span>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      {(quest as any)._subtasks && (quest as any)._subtasks.total > 0 && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          <ListChecks className="h-3 w-3" />
                          {(quest as any)._subtasks.done}/{(quest as any)._subtasks.total}
                        </Badge>
                      )}
                      {quest.company_id && <Badge className="bg-accent text-accent-foreground border-0"><Building2 className="h-3 w-3 mr-0.5" />Client</Badge>}
                      <Badge variant="outline" className="capitalize">{quest.status.toLowerCase().replace(/_/g, " ")}</Badge>
                      {(quest as any).price_fiat > 0 && (
                        <Badge variant="secondary"><CreditCard className="h-3 w-3 mr-0.5" />Paid</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No quests match your filters.</p>
              {hf.houseFilterActive && (
                <Button variant="link" size="sm" className="mt-2" onClick={() => hf.setHouseFilterActive(false)}>
                  Try showing all Houses
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
