import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Filter, Clock, MapPin, Hash, Euro } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import {
  services, serviceTopics, serviceTerritories, topics, territories,
  getUserById, getGuildById, getTopicById, getTerritoryById,
} from "@/data/mock";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06 } }),
};

export default function ServicesMarketplace({ bare }: { bare?: boolean }) {
  const [topicFilter, setTopicFilter] = useState("ALL");
  const [territoryFilter, setTerritoryFilter] = useState("ALL");

  let filtered = services.filter((s) => s.isActive);
  if (topicFilter !== "ALL") {
    const svcIds = new Set(serviceTopics.filter((st) => st.topicId === topicFilter).map((st) => st.serviceId));
    filtered = filtered.filter((s) => svcIds.has(s.id));
  }
  if (territoryFilter !== "ALL") {
    const svcIds = new Set(serviceTerritories.filter((st) => st.territoryId === territoryFilter).map((st) => st.serviceId));
    filtered = filtered.filter((s) => svcIds.has(s.id));
  }

  return (
    <PageShell bare={bare}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Services</h1>
        <p className="text-muted-foreground mt-1">Browse consultancy services offered by users and guilds.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All topics</SelectItem>
            {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Territory" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All territories</SelectItem>
            {territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((svc, i) => {
          const provider = svc.providerUserId ? getUserById(svc.providerUserId) : null;
          const guild = svc.providerGuildId ? getGuildById(svc.providerGuildId) : null;
          const svcTopics = serviceTopics.filter((st) => st.serviceId === svc.id).map((st) => getTopicById(st.topicId)!).filter(Boolean);
          const svcTerrs = serviceTerritories.filter((st) => st.serviceId === svc.id).map((st) => getTerritoryById(st.territoryId)!).filter(Boolean);
          return (
            <motion.div key={svc.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <Link
                to={`/services/${svc.id}`}
                className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display font-semibold text-lg">{svc.title}</h3>
                  {svc.priceAmount != null && (
                    <Badge className="bg-primary/10 text-primary border-0 shrink-0">
                      <Euro className="h-3 w-3 mr-0.5" />
                      {svc.priceAmount === 0 ? "Free" : `${svc.priceAmount}`}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{svc.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{provider?.name ?? guild?.name}</span>
                  {svc.durationMinutes && (
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {svc.durationMinutes} min</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {svcTopics.map((t) => <Badge key={t.id} variant="secondary" className="text-[10px]"><Hash className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                  {svcTerrs.map((t) => <Badge key={t.id} variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                </div>
              </Link>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="text-muted-foreground col-span-full">No services match your filters.</p>}
      </div>
    </PageShell>
  );
}
