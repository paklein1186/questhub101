import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, Building2, FileText, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAllJobPositions } from "@/hooks/useJobPositions";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { formatDistanceToNow } from "date-fns";

const CONTRACT_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
  { value: "volunteer", label: "Volunteer" },
];

const REMOTE_OPTIONS = [
  { value: "all", label: "All policies" },
  { value: "on-site", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];

interface Props {
  bare?: boolean;
}

export default function JobsExplore({ bare }: Props) {
  const { data: jobs = [], isLoading } = useAllJobPositions();
  const { data: allTopics = [] } = useTopics();
  const { data: allTerritories = [] } = useTerritories();

  const [search, setSearch] = useState("");
  const [contractFilter, setContractFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");

  const filtered = useMemo(() => {
    return jobs.filter((job: any) => {
      if (search && !job.title.toLowerCase().includes(search.toLowerCase()) &&
          !(job.description ?? "").toLowerCase().includes(search.toLowerCase()) &&
          !(job.companies?.name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (contractFilter !== "all" && job.contract_type !== contractFilter) return false;
      if (remoteFilter !== "all" && job.remote_policy !== remoteFilter) return false;
      if (topicFilter !== "all") {
        const topicIds = (job.job_position_topics ?? []).map((jt: any) => jt.topic_id);
        if (!topicIds.includes(topicFilter)) return false;
      }
      if (territoryFilter !== "all") {
        const terrIds = (job.job_position_territories ?? []).map((jt: any) => jt.territory_id);
        if (!terrIds.includes(territoryFilter)) return false;
      }
      return true;
    });
  }, [jobs, search, contractFilter, remoteFilter, topicFilter, territoryFilter]);

  const content = (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={contractFilter} onValueChange={setContractFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={remoteFilter} onValueChange={setRemoteFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REMOTE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {allTopics.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Territory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All territories</SelectItem>
            {allTerritories.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">{filtered.length} position{filtered.length !== 1 ? "s" : ""} found</p>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {/* Job cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((job: any) => {
          const company = job.companies;
          const topics = (job.job_position_topics ?? []).map((jt: any) => jt.topics).filter(Boolean);
          const territories = (job.job_position_territories ?? []).map((jt: any) => jt.territories).filter(Boolean);

          return (
            <div key={job.id} className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-primary/30 transition-all">
              <div className="flex items-start gap-3">
                {company && (
                  <Link to={`/companies/${company.id}`}>
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarImage src={company.logo_url ?? undefined} />
                      <AvatarFallback className="rounded-lg text-xs"><Building2 className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  </Link>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-semibold text-sm truncate">{job.title}</h4>
                  {company && (
                    <Link to={`/companies/${company.id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      {company.name}
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] capitalize">{job.contract_type}</Badge>
                <Badge variant="outline" className="text-[10px] capitalize">{job.remote_policy}</Badge>
                {job.location_text && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" />{job.location_text}
                  </span>
                )}
              </div>

              {job.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 whitespace-pre-line">{job.description}</p>
              )}

              <div className="flex flex-wrap gap-1">
                {topics.map((t: any) => <Badge key={t.id} variant="outline" className="text-[10px]">{t.name}</Badge>)}
                {territories.map((t: any) => <Badge key={t.id} variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                <span>Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                {job.document_url && (
                  <a href={job.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <FileText className="h-3 w-3" /> View doc <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No job positions match your filters.</p>
        </div>
      )}
    </div>
  );

  if (bare) return content;

  return content;
}
