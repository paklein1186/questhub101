import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, Building2, FileText, ExternalLink, Search, User, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAllJobPositions, useDeleteJobPosition } from "@/hooks/useJobPositions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { AuthPromptDialog } from "@/components/AuthPromptDialog";
import { AddJobDialog, type JobToEdit } from "@/components/AddJobDialog";
import { ExploreFilters, defaultFilters, applySortBy, type ExploreFilterValues } from "@/components/ExploreFilters";
import { useHouseFilter } from "@/hooks/useHouseFilter";
import { usePersona } from "@/hooks/usePersona";
import { defaultUniverseForPersona, type UniverseMode } from "@/lib/universeMapping";
import { logger } from "@/lib/logger";

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
  const currentUser = useCurrentUser();
  const isGuest = !currentUser?.id;
  const deleteJob = useDeleteJobPosition();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [contractFilter, setContractFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState("all");
  const [authOpen, setAuthOpen] = useState(false);
  const [editJob, setEditJob] = useState<JobToEdit | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [exploreFilters, setExploreFilters] = useState<ExploreFilterValues>(defaultFilters);

  const { persona } = usePersona();
  const [universeMode, setUniverseMode] = useState<UniverseMode>(defaultUniverseForPersona(persona));
  const houseFilter = useHouseFilter();

  const filtered = useMemo(() => {
    const result = jobs.filter((job: any) => {
      if (search && !job.title.toLowerCase().includes(search.toLowerCase()) &&
          !(job.description ?? "").toLowerCase().includes(search.toLowerCase()) &&
          !(job.companies?.name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (contractFilter !== "all" && job.contract_type !== contractFilter) return false;
      if (remoteFilter !== "all" && job.remote_policy !== remoteFilter) return false;

      // Topic filter
      if (exploreFilters.topicIds.length > 0) {
        const jobTopicIds = (job.job_position_topics ?? []).map((jt: any) => jt.topic_id);
        if (!exploreFilters.topicIds.some((id: string) => jobTopicIds.includes(id))) return false;
      }

      // Territory filter
      if (exploreFilters.territoryIds.length > 0) {
        const jobTerritoryIds = (job.job_position_territories ?? []).map((jt: any) => jt.territory_id);
        if (!exploreFilters.territoryIds.some((id: string) => jobTerritoryIds.includes(id))) return false;
      }

      return true;
    });
    return applySortBy(result, exploreFilters.sortBy);
  }, [jobs, search, contractFilter, remoteFilter, exploreFilters.topicIds, exploreFilters.territoryIds, exploreFilters.sortBy]);

  const handleDelete = async (jobId: string, companyId: string | null) => {
    if (!window.confirm("Delete this job position?")) return;
    try {
      await deleteJob.mutateAsync({ id: jobId, companyId: companyId || "" });
      toast({ title: "Job deleted" });
    } catch (err: any) {
      logger.error("Delete job error:", err);
      toast({ title: "Error deleting job", description: err?.message, variant: "destructive" });
    }
  };

  const handleDocClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      setAuthOpen(true);
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Topic & Territory filters */}
      <ExploreFilters
        filters={exploreFilters}
        onChange={setExploreFilters}
        config={{ showTopics: true, showTerritories: true }}
        houseFilter={{
          active: houseFilter.houseFilterActive,
          onToggle: houseFilter.setHouseFilterActive,
          hasHouses: houseFilter.myTopicIds.length > 0,
          topicNames: houseFilter.topicNames,
          myTopicIds: houseFilter.myTopicIds,
        }}
        universeMode={universeMode}
        onUniverseModeChange={setUniverseMode}
      />
      {/* Search & quick filters */}
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
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">{filtered.length} position{filtered.length !== 1 ? "s" : ""} found</p>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {/* Job cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((job: any) => {
          const company = job.companies;
          const creator = job.creator;
          const topics = (job.job_position_topics ?? []).map((jt: any) => jt.topics).filter(Boolean);
          const territories = (job.job_position_territories ?? []).map((jt: any) => jt.territories).filter(Boolean);
          const isOwner = !isGuest && job.created_by_user_id === currentUser.id;
          const contributorName = company?.name || job.organization_name || creator?.name || "Individual posting";

          return (
            <div key={job.id} className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-primary/30 transition-all relative">
              {/* Title + org name + delete */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-semibold text-sm truncate">{job.title}</h4>
                    {company ? (
                      <Link to={`/companies/${company.id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0">
                        — {company.name}
                      </Link>
                    ) : job.organization_name ? (
                      <span className="text-xs text-muted-foreground shrink-0">— {job.organization_name}</span>
                    ) : creator ? (
                      <Link to={`/profile/${creator.id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0">
                        — {creator.name}
                      </Link>
                    ) : null}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => { setEditJob(job); setEditDialogOpen(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(job.id, job.company_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
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

              {/* Footer: avatar + name on left, doc link + date on right */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  {company ? (
                    <Link to={`/companies/${company.id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Avatar className="h-5 w-5 rounded">
                        <AvatarImage src={company.logo_url ?? undefined} />
                        <AvatarFallback className="rounded text-[8px]"><Building2 className="h-2.5 w-2.5" /></AvatarFallback>
                      </Avatar>
                      <span>{company.name}</span>
                    </Link>
                  ) : job.organization_name ? (
                    <span className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5 rounded">
                        <AvatarFallback className="rounded text-[8px]"><Building2 className="h-2.5 w-2.5" /></AvatarFallback>
                      </Avatar>
                      <span>{job.organization_name}</span>
                    </span>
                  ) : creator ? (
                    <Link to={`/profile/${creator.id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Avatar className="h-5 w-5 rounded">
                        <AvatarImage src={creator.avatar_url ?? undefined} />
                        <AvatarFallback className="rounded text-[8px]">{(creator.name ?? "U").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{creator.name}</span>
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5 rounded">
                        <AvatarFallback className="rounded text-[8px]"><User className="h-2.5 w-2.5" /></AvatarFallback>
                      </Avatar>
                      Individual
                    </span>
                  )}
                  <span className="text-muted-foreground/60">·</span>
                  <span>Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                </div>
                <div>
              {job.document_url && !isGuest && (
                    <a
                      href={job.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                      onClick={(e) => { e.stopPropagation(); window.open(job.document_url, "_blank", "noopener,noreferrer"); e.preventDefault(); }}
                    >
                      <FileText className="h-3 w-3" /> View doc <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {job.document_url && isGuest && (
                    <button onClick={handleDocClick} className="flex items-center gap-1 text-primary hover:underline cursor-pointer">
                      <FileText className="h-3 w-3" /> View doc <ExternalLink className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
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

      <AuthPromptDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        actionLabel="view this document"
      />
      <AddJobDialog
        open={editDialogOpen}
        onOpenChange={(v) => { setEditDialogOpen(v); if (!v) setEditJob(null); }}
        editJob={editJob}
      />
    </div>
  );

  if (bare) return content;

  return content;
}
