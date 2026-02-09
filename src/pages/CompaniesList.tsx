import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, MapPin, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import {
  companies, territories, companyTerritories,
  getTopicsForCompany, getTerritoriesForCompany,
} from "@/data/mock";

const sectors = [...new Set(companies.map(c => c.sector).filter(Boolean))] as string[];

export default function CompaniesList() {
  const [sectorFilter, setSectorFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");

  const filtered = companies.filter((c) => {
    if (sectorFilter !== "all" && c.sector !== sectorFilter) return false;
    if (territoryFilter !== "all" && !companyTerritories.some(ct => ct.companyId === c.id && ct.territoryId === territoryFilter)) return false;
    return true;
  });

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" /> Companies
        </h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sector" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Territory" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {territories.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
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
