import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, MapPin, Users, Loader2 } from "lucide-react";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/PageShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExploreFilters, ExploreFilterValues, defaultFilters } from "@/components/ExploreFilters";
import { useAuth } from "@/hooks/useAuth";
import { PublicExploreCTA } from "@/components/PublicExploreCTA";
import { approxCount } from "@/lib/publicMode";

function useCompaniesExplore() {
  return useQuery({
    queryKey: ["companies-explore"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*, company_territories(territory_id, territories(id, name)), company_members(id)")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export default function CompaniesList({ bare, hideFilters, externalFilters }: { bare?: boolean; hideFilters?: boolean; externalFilters?: ExploreFilterValues }) {
  const [filters, setFilters] = useState<ExploreFilterValues>(defaultFilters);
  const activeFilters = externalFilters ?? filters;
  const { data: companiesData, isLoading } = useCompaniesExplore();
  const { session } = useAuth();
  const isLoggedIn = !!session;

  let filtered = companiesData ?? [];

  if (filters.territoryIds.length > 0) {
    filtered = filtered.filter((c: any) =>
      c.company_territories?.some((ct: any) => filters.territoryIds.includes(ct.territory_id))
    );
  }

  return (
    <PageShell bare={bare}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" /> Traditional Organizations
        </h1>
      </div>

      {!isLoggedIn && (
        <PublicExploreCTA
          message="This is a preview of organizations in the ecosystem. Log in to see full details."
          className="mb-6"
        />
      )}

      <div className="mb-6">
        <ExploreFilters
          filters={filters}
          onChange={setFilters}
          config={{ showTerritories: true }}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((company: any, i: number) => {
          const cTerrs = (company.company_territories ?? []).map((ct: any) => ct.territories).filter(Boolean);
          const memberCount = company.company_members?.length ?? 0;
          return (
            <motion.div key={company.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={isLoggedIn ? `/companies/${company.id}` : "/login"} className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                <UnitCoverImage type="COMPANY" imageUrl={company.banner_url} logoUrl={company.logo_url} name={company.name} height="h-32" />
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    {company.logo_url && <img src={company.logo_url} alt="" className="h-10 w-10 rounded-lg" />}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{company.name}</h3>
                      {company.sector && <span className="text-xs text-muted-foreground">{company.sector}</span>}
                    </div>
                    {company.size && <Badge variant="outline" className="ml-auto text-xs shrink-0">{company.size}</Badge>}
                  </div>
                  {isLoggedIn ? (
                    company.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{company.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3 italic">Log in to see details</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {cTerrs.map((t: any) => <Badge key={t.id} variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {isLoggedIn ? memberCount : `~${approxCount(memberCount)}`} members
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
        {!isLoading && filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No traditional organizations match your filters.</p>}
      </div>
    </PageShell>
  );
}
