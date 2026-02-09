import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Zap, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import {
  quests, topics, territories, guilds,
  questTopics, questTerritories,
} from "@/data/mock";
import { QuestStatus, MonetizationType } from "@/types/enums";

export default function QuestsMarketplace() {
  const [topicFilter, setTopicFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monetizationFilter, setMonetizationFilter] = useState("all");

  const filtered = quests.filter((q) => {
    if (topicFilter !== "all" && !questTopics.some((qt) => qt.questId === q.id && qt.topicId === topicFilter)) return false;
    if (territoryFilter !== "all" && !questTerritories.some((qt) => qt.questId === q.id && qt.territoryId === territoryFilter)) return false;
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (monetizationFilter !== "all" && q.monetizationType !== monetizationFilter) return false;
    return true;
  });

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Compass className="h-7 w-7 text-primary" /> Quests Marketplace
        </h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Topic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Territory" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(QuestStatus).map((s) => <SelectItem key={s} value={s}>{s.toLowerCase().replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={monetizationFilter} onValueChange={setMonetizationFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.values(MonetizationType).map((m) => <SelectItem key={m} value={m}>{m.toLowerCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((quest, i) => {
          const guild = guilds.find((g) => g.id === quest.guildId);
          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/quests/${quest.id}`}
                className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold">{quest.title}</h3>
                  <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                    <Zap className="h-4 w-4" /> {quest.rewardXp}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{quest.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{guild?.name}</span>
                  <div className="flex gap-1.5">
                    {quest.companyId && <Badge className="bg-accent text-accent-foreground border-0"><Building2 className="h-3 w-3 mr-0.5" />Client</Badge>}
                    <Badge variant="outline" className="capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
                    <Badge variant="secondary" className="capitalize">{quest.monetizationType.toLowerCase()}</Badge>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No quests match your filters.</p>}
      </div>
    </PageShell>
  );
}
