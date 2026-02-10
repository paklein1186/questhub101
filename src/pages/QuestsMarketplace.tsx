import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Zap, Building2, Plus, Users, ChevronRight, Loader2, Coins, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { useAuth } from "@/hooks/useAuth";
import { useQuests, useMyGuildMemberships, useMyCompanies } from "@/hooks/useSupabaseData";
import { ExploreFilters, ExploreFilterValues, defaultFilters } from "@/components/ExploreFilters";

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

export default function QuestsMarketplace({ bare }: { bare?: boolean }) {
  const [filters, setFilters] = useState<ExploreFilterValues>(defaultFilters);

  const currentUser = useCurrentUser();
  const { session } = useAuth();
  const isLoggedIn = !!session;
  const isAdm = checkIsGlobalAdmin(currentUser.email);

  const { data: questsData, isLoading } = useQuests();
  const allQuests = questsData ?? [];

  const filtered = allQuests.filter((q) => {
    if (q.is_draft && !isAdm && q.created_by_user_id !== currentUser.id) return false;
    if (filters.topicIds.length > 0 && !q.quest_topics?.some((qt: any) => filters.topicIds.includes(qt.topic_id))) return false;
    if (filters.territoryIds.length > 0 && !q.quest_territories?.some((qt: any) => filters.territoryIds.includes(qt.territory_id))) return false;
    if (filters.status !== "all" && q.status !== filters.status) return false;
    if (filters.monetization !== "all" && q.monetization_type !== filters.monetization) return false;
    return true;
  });

  return (
    <PageShell bare={bare}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Compass className="h-7 w-7 text-primary" /> Quests Marketplace
        </h1>
        {isLoggedIn && <CreateQuestButton />}
      </div>

      <div className="mb-6">
        <ExploreFilters
          filters={filters}
          onChange={setFilters}
          config={{ showTopics: true, showTerritories: true, showStatus: true, showMonetization: true }}
        />
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((quest, i) => (
          <motion.div key={quest.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/quests/${quest.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
              {quest.cover_image_url ? (
                <div className="w-full h-36 bg-muted"><img src={quest.cover_image_url} alt="" className="w-full h-full object-cover" /></div>
              ) : (
                <div className="w-full h-24 bg-muted/50 flex items-center justify-center"><Compass className="h-8 w-8 text-muted-foreground/30" /></div>
              )}
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold">{quest.title}</h3>
                  <span className="flex items-center gap-1 text-sm font-semibold text-primary"><Zap className="h-4 w-4" /> {quest.reward_xp}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{quest.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{(quest as any).guilds?.name}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {quest.company_id && <Badge className="bg-accent text-accent-foreground border-0"><Building2 className="h-3 w-3 mr-0.5" />Client</Badge>}
                    <Badge variant="outline" className="capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
                    {(quest as any).price_fiat > 0 && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-0"><CreditCard className="h-3 w-3 mr-0.5" />Paid</Badge>
                    )}
                    {(quest as any).credit_reward > 0 && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0"><Coins className="h-3 w-3 mr-0.5" />{(quest as any).credit_reward} Cr</Badge>
                    )}
                    {(quest as any).price_fiat === 0 && (quest as any).credit_reward === 0 && (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
        {!isLoading && filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No quests match your filters.</p>}
      </div>
    </PageShell>
  );
}
