import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, MapPin, Hash, Euro, Loader2, Shield, Building2, Briefcase } from "lucide-react";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { useServices } from "@/hooks/useSupabaseData";
import { ExploreFilters, ExploreFilterValues, defaultFilters, applySortBy } from "@/components/ExploreFilters";
import { useHouseFilter } from "@/hooks/useHouseFilter";
import { PublicExploreCTA } from "@/components/PublicExploreCTA";
import { approxCount } from "@/lib/publicMode";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06 } }),
};

export default function ServicesMarketplace({ bare }: { bare?: boolean }) {
  const [filters, setFilters] = useState<ExploreFilterValues>(defaultFilters);
  const [hostFilter, setHostFilter] = useState<string>("all"); // "all" | "user" | "unit"

  const currentUser = useCurrentUser();
  const { session } = useAuth();
  const isLoggedIn = !!session;
  const isAdm = checkIsGlobalAdmin(currentUser.email);

  const { data: servicesData, isLoading } = useServices();
  const hf = useHouseFilter();

  const preFiltered = hf.applyHouseFilter(servicesData ?? [], (s) =>
    ((s as any).service_topics ?? []).map((st: any) => st.topic_id)
  );

  let filtered = preFiltered.filter((s) => {
    if (s.is_draft && !isAdm && s.provider_user_id !== currentUser.id) return false;
    if (!s.is_active) return false;
    return true;
  });

  // Host type filter
  if (hostFilter === "user") {
    filtered = filtered.filter(s => !(s as any).owner_type || (s as any).owner_type === "USER");
  } else if (hostFilter === "unit") {
    filtered = filtered.filter(s => (s as any).owner_type === "GUILD" || (s as any).owner_type === "COMPANY");
  }

  if (filters.topicIds.length > 0) {
    filtered = filtered.filter((s) => (s as any).service_topics?.some((st: any) => filters.topicIds.includes(st.topic_id)));
  }
  if (filters.territoryIds.length > 0) {
    filtered = filtered.filter((s) => (s as any).service_territories?.some((st: any) => filters.territoryIds.includes(st.territory_id)));
  }
  if (filters.price === "free") {
    filtered = filtered.filter((s) => !s.price_amount || s.price_amount === 0);
  } else if (filters.price === "paid") {
    filtered = filtered.filter((s) => s.price_amount && s.price_amount > 0);
  }
  filtered = applySortBy(filtered, filters.sortBy);

  return (
    <PageShell bare={bare}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Services</h1>
        <p className="text-muted-foreground mt-1">Browse consultancy services offered by users and guilds.</p>
      </div>

      {!isLoggedIn && (
        <PublicExploreCTA
          message="Service details and booking are available to logged-in users. Here's a preview of what's available."
          className="mb-6"
        />
      )}

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={hostFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setHostFilter("all")}>All</Button>
          <Button variant={hostFilter === "user" ? "default" : "outline"} size="sm" onClick={() => setHostFilter("user")}>User services</Button>
          <Button variant={hostFilter === "unit" ? "default" : "outline"} size="sm" onClick={() => setHostFilter("unit")}>Unit services</Button>
        </div>
        <ExploreFilters
          filters={filters}
          onChange={setFilters}
          config={{ showTopics: true, showTerritories: true, showPrice: true }}
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
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {/* Public mode: aggregated count */}
      {!isLoggedIn && !isLoading && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Briefcase className="h-10 w-10 text-primary mx-auto mb-3 opacity-60" />
          <p className="text-2xl font-bold text-primary mb-1">{filtered.length}</p>
          <p className="text-sm text-muted-foreground">services available in the ecosystem</p>
          <p className="text-xs text-muted-foreground mt-2">Log in to browse services, view details, and book sessions.</p>
        </div>
      )}

      {isLoggedIn && (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((svc, i) => {
            const ownerType = (svc as any).owner_type || "USER";
            const provider = (svc as any).provider_profile;
            const guild = (svc as any).guilds;
            const svcTopics = ((svc as any).service_topics ?? []).map((st: any) => st.topics).filter(Boolean);
            const svcTerrs = ((svc as any).service_territories ?? []).map((st: any) => st.territories).filter(Boolean);
            return (
              <motion.div key={svc.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                <Link to={`/services/${svc.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                  <UnitCoverImage type="SERVICE" imageUrl={svc.image_url} name={svc.title} height="h-32" />
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
                      {ownerType === "GUILD" && guild ? (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-primary" />
                          <Avatar className="h-5 w-5 rounded"><AvatarImage src={guild.logo_url} /><AvatarFallback className="text-[10px] rounded">{guild.name?.[0]}</AvatarFallback></Avatar>
                          <span className="font-medium text-foreground">{guild.name}</span>
                        </span>
                      ) : provider ? (
                        <span className="flex items-center gap-1">
                          <Avatar className="h-5 w-5"><AvatarImage src={provider.avatar_url} /><AvatarFallback className="text-[10px]">{provider.name?.[0]}</AvatarFallback></Avatar>
                          <span className="font-medium text-foreground">{provider.name}</span>
                        </span>
                      ) : null}
                      {svc.duration_minutes && (
                        <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {svc.duration_minutes} min</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {svcTopics.slice(0, 5).map((t: any) => <Badge key={t.id} variant="secondary" className="text-[10px]"><Hash className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                      {svcTopics.length > 5 && <Badge variant="secondary" className="text-[10px] text-muted-foreground">+{svcTopics.length - 5}</Badge>}
                      {svcTerrs.map((t: any) => <Badge key={t.id} variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No services match your filters.</p>
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
