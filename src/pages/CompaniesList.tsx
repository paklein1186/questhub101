import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, MapPin, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/PageShell";
import {
  companies, getTopicsForCompany, getTerritoriesForCompany,
} from "@/data/mock";
import { filterActive } from "@/lib/softDelete";
import { ExploreFilters, ExploreFilterValues, defaultFilters } from "@/components/ExploreFilters";

export default function CompaniesList({ bare }: { bare?: boolean }) {
  const [filters, setFilters] = useState<ExploreFilterValues>(defaultFilters);

  const filtered = filterActive(companies).filter((c) => {
    if (filters.topicIds.length > 0) {
      const cTopicIds = getTopicsForCompany(c.id).map(t => t.id);
      if (!filters.topicIds.some(id => cTopicIds.includes(id))) return false;
    }
    if (filters.territoryIds.length > 0) {
      const cTerrIds = getTerritoriesForCompany(c.id).map(t => t.id);
      if (!filters.territoryIds.some(id => cTerrIds.includes(id))) return false;
    }
    return true;
  });

  return (
    <PageShell bare={bare}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" /> Companies
        </h1>
      </div>

      <div className="mb-6">
        <ExploreFilters
          filters={filters}
          onChange={setFilters}
          config={{ showTopics: true, showTerritories: true }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((company, i) => {
          const cTopics = getTopicsForCompany(company.id);
          const cTerrs = getTerritoriesForCompany(company.id);
          return (
            <motion.div key={company.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/companies/${company.id}`} className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  {company.logoUrl && <img src={company.logoUrl} alt="" className="h-10 w-10 rounded-lg" />}
                  <div>
                    <h3 className="font-display font-semibold">{company.name}</h3>
                    {company.sector && <span className="text-xs text-muted-foreground">{company.sector}</span>}
                  </div>
                  {company.size && <Badge variant="outline" className="ml-auto text-xs">{company.size}</Badge>}
                </div>
                {company.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{company.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {cTopics.map(t => <Badge key={t.id} variant="secondary" className="text-[10px]"><Hash className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                  {cTerrs.map(t => <Badge key={t.id} variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                </div>
              </Link>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No companies match your filters.</p>}
      </div>
    </PageShell>
  );
}
