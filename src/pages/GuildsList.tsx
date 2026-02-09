import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import {
  guilds, topics, territories,
  getTopicsForGuild, getTerritoriesForGuild,
  getMembersForGuild,
  guildTopics, guildTerritories,
} from "@/data/mock";

export default function GuildsList() {
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [territoryFilter, setTerritoryFilter] = useState<string>("all");

  const filtered = guilds.filter((g) => {
    if (topicFilter !== "all" && !guildTopics.some((gt) => gt.guildId === g.id && gt.topicId === topicFilter)) return false;
    if (territoryFilter !== "all" && !guildTerritories.some((gt) => gt.guildId === g.id && gt.territoryId === territoryFilter)) return false;
    return true;
  });

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" /> Guilds
        </h1>
        <div className="flex gap-3">
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Territory" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Territories</SelectItem>
              {territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((guild, i) => {
          const gTopics = getTopicsForGuild(guild.id);
          const gTerrs = getTerritoriesForGuild(guild.id);
          const members = getMembersForGuild(guild.id);
          return (
            <motion.div
              key={guild.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/guilds/${guild.id}`}
                className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <img src={guild.logoUrl} className="h-12 w-12 rounded-lg" alt="" />
                  <div>
                    <h3 className="font-display font-semibold group-hover:text-primary transition-colors">{guild.name}</h3>
                    <span className="text-xs text-muted-foreground capitalize">{guild.type.toLowerCase()}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{guild.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {gTopics.map((t) => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
                  {gTerrs.map((t) => <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>)}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {members.length} members
                </div>
              </Link>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No guilds match your filters.</p>}
      </div>
    </PageShell>
  );
}
