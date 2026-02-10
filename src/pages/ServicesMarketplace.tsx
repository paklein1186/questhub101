import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Filter, Clock, MapPin, Hash, Euro, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { useServices, useTopics, useTerritories } from "@/hooks/useSupabaseData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06 } }),
};

export default function ServicesMarketplace({ bare }: { bare?: boolean }) {
  const [topicFilter, setTopicFilter] = useState("ALL");
  const [territoryFilter, setTerritoryFilter] = useState("ALL");
  const [priceFilter, setPriceFilter] = useState("ALL");

  const currentUser = useCurrentUser();
  const isAdm = checkIsGlobalAdmin(currentUser.email);

  const { data: servicesData, isLoading } = useServices();
  const { data: topics } = useTopics();
  const { data: territories } = useTerritories();

  let filtered = (servicesData ?? []).filter((s) => {
    if (s.is_draft && !isAdm && s.provider_user_id !== currentUser.id) return false;
    if (!s.is_active) return false;
    return true;
  });

  if (topicFilter !== "ALL") {
    filtered = filtered.filter((s) => (s as any).service_topics?.some((st: any) => st.topic_id === topicFilter));
  }
  if (territoryFilter !== "ALL") {
    filtered = filtered.filter((s) => (s as any).service_territories?.some((st: any) => st.territory_id === territoryFilter));
  }
  if (priceFilter === "FREE") {
    filtered = filtered.filter((s) => !s.price_amount || s.price_amount === 0);
  } else if (priceFilter === "PAID") {
    filtered = filtered.filter((s) => s.price_amount && s.price_amount > 0);
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
            {(topics ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Territory" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All territories</SelectItem>
            {(territories ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-[130px]"><Euro className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All prices</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((svc, i) => {
          const provider = (svc as any).profiles_public;
          const guild = (svc as any).guilds;
          const svcTopics = ((svc as any).service_topics ?? []).map((st: any) => st.topics).filter(Boolean);
          const svcTerrs = ((svc as any).service_territories ?? []).map((st: any) => st.territories).filter(Boolean);
          return (
            <motion.div key={svc.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <Link to={`/services/${svc.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                {svc.image_url ? (
                  <div className="w-full h-36 bg-muted"><img src={svc.image_url} alt="" className="w-full h-full object-cover" /></div>
                ) : (
                  <div className="w-full h-24 bg-muted/50 flex items-center justify-center"><Clock className="h-8 w-8 text-muted-foreground/30" /></div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-display font-semibold text-lg">{svc.title}</h3>
                    {svc.price_amount != null && (
                      <Badge className="bg-primary/10 text-primary border-0 shrink-0">
                        <Euro className="h-3 w-3 mr-0.5" />
                        {svc.price_amount === 0 ? "Free" : `${svc.price_amount}`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{svc.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {provider && (
                      <span className="flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={provider.avatar_url} />
                          <AvatarFallback className="text-[10px]">{provider.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{provider.name}</span>
                      </span>
                    )}
                    {guild && (
                      <span className="flex items-center gap-1">
                        <Avatar className="h-5 w-5 rounded">
                          <AvatarImage src={guild.logo_url} />
                          <AvatarFallback className="text-[10px] rounded">{guild.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{guild.name}</span>
                      </span>
                    )}
                    {svc.duration_minutes && (
                      <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {svc.duration_minutes} min</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {svcTopics.map((t: any) => <Badge key={t.id} variant="secondary" className="text-[10px]"><Hash className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                    {svcTerrs.map((t: any) => <Badge key={t.id} variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
        {!isLoading && filtered.length === 0 && <p className="text-muted-foreground col-span-full">No services match your filters.</p>}
      </div>
    </PageShell>
  );
}
