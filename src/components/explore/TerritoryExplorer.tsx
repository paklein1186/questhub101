import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Search, X, Brain, Loader2, BarChart3, Layers,
  Compass, Shield, CircleDot, Building2, Briefcase, GraduationCap,
  Calendar, Clock, Hash, Play, AlertCircle, Sparkles, RefreshCw,
  TrendingUp, AlertTriangle, Users, Coins, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePersona } from "@/hooks/usePersona";
import { useTerritories, useTopics } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────
type AnalysisMode = "compare" | "aggregate";
type TimeFilter = "any" | "active" | "3months" | "12months";

interface UnitItem {
  id: string;
  type: "quest" | "guild" | "pod" | "company" | "service" | "course";
  name: string;
  description?: string;
  territoryId: string;
  territoryName: string;
  createdAt: string;
}

interface TerritoryStats {
  territoryId: string;
  territoryName: string;
  quests: number;
  guilds: number;
  pods: number;
  companies: number;
  services: number;
  courses: number;
}

const UNIT_TYPES = [
  { key: "quest", icon: Compass },
  { key: "guild", icon: Shield },
  { key: "pod", icon: CircleDot },
  { key: "company", icon: Building2 },
  { key: "service", icon: Briefcase },
  { key: "course", icon: GraduationCap },
] as const;

const MAX_COMPARE = 5;

// ─── Component ───────────────────────────────────────────────
export function TerritoryExplorer() {
  const { label, persona } = usePersona();
  const { data: allTerritories = [] } = useTerritories();
  const { data: allTopics = [] } = useTopics();

  // Filter state
  const [selectedTerritoryIds, setSelectedTerritoryIds] = useState<string[]>([]);
  const [mode, setMode] = useState<AnalysisMode>("compare");
  const [activeUnitTypes, setActiveUnitTypes] = useState<Set<string>>(new Set(UNIT_TYPES.map(u => u.key)));
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("any");
  const [territorySearch, setTerritorySearch] = useState("");

  // Analysis state
  const [analysisResults, setAnalysisResults] = useState<{ stats: TerritoryStats[]; units: UnitItem[] } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [filtersDirty, setFiltersDirty] = useState(false);

  // AI Synthesis state
  const [synthesisData, setSynthesisData] = useState<any>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  // Derived
  const filteredTerritories = useMemo(() => {
    if (!territorySearch.trim()) return allTerritories;
    const q = territorySearch.toLowerCase();
    return allTerritories.filter((t: any) => t.name?.toLowerCase().includes(q));
  }, [allTerritories, territorySearch]);

  const selectedTerritoryNames = useMemo(() => {
    const map = new Map(allTerritories.map((t: any) => [t.id, t.name]));
    return selectedTerritoryIds.map(id => ({ id, name: map.get(id) || id }));
  }, [selectedTerritoryIds, allTerritories]);

  // Page title
  const pageTitle = useMemo(() => {
    if (persona === "CREATIVE") return "Explore Creative Territories";
    if (persona === "IMPACT") return "Explore Territories";
    return "Explore Territories & Worlds";
  }, [persona]);

  // Handlers
  const toggleTerritory = useCallback((id: string) => {
    setSelectedTerritoryIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (mode === "compare" && prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
    setFiltersDirty(true);
  }, [mode]);

  const removeTerritory = useCallback((id: string) => {
    setSelectedTerritoryIds(prev => prev.filter(x => x !== id));
    setFiltersDirty(true);
  }, []);

  const toggleUnitType = useCallback((key: string) => {
    setActiveUnitTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setFiltersDirty(true);
  }, []);

  const toggleTopic = useCallback((id: string) => {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setFiltersDirty(true);
  }, []);

  const unitLabel = useCallback((key: string) => {
    const map: Record<string, string> = {
      quest: label("quest.label"),
      guild: label("guild.label"),
      pod: label("pod.label"),
      company: label("company.label"),
      service: label("service.label_plural"),
      course: label("course.label"),
    };
    return map[key] || key;
  }, [label]);

  const unitRoute = useCallback((type: string, id: string, territoryId?: string) => {
    const base: Record<string, string> = {
      quest: `/quests/${id}`,
      guild: `/guilds/${id}`,
      pod: `/pods/${id}`,
      company: `/companies/${id}`,
      service: `/services/${id}`,
      course: `/courses/${id}`,
    };
    const route = base[type] || `/${type}s/${id}`;
    return territoryId ? `${route}?fromTerritory=${territoryId}` : route;
  }, []);

  // ─── Run Analysis ──────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (selectedTerritoryIds.length === 0) return;
    setAnalysisLoading(true);
    setFiltersDirty(false);

    try {
      const tIds = selectedTerritoryIds;
      const nameMap = new Map(allTerritories.map((t: any) => [t.id, t.name]));

      // Build time filter
      let dateFilter: string | null = null;
      const now = new Date();
      if (timeFilter === "3months") dateFilter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString();
      else if (timeFilter === "12months") dateFilter = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();

      // Parallel fetch all unit types
      const [questTerr, guildTerr, podTerr, compTerr, serviceTerr, courseTerr] = await Promise.all([
        supabase.from("quest_territories").select("territory_id, quest_id, quests(id, title, description, created_at, status)").in("territory_id", tIds),
        supabase.from("guild_territories").select("territory_id, guild_id, guilds(id, name, description, created_at, is_deleted)").in("territory_id", tIds),
        supabase.from("pod_territories").select("territory_id, pod_id, pods(id, name, description, created_at, is_deleted)").in("territory_id", tIds),
        supabase.from("company_territories").select("territory_id, company_id, companies(id, name, description, created_at, is_deleted)").in("territory_id", tIds),
        supabase.from("service_territories").select("territory_id, service_id, services(id, title, description, created_at, is_deleted)").in("territory_id", tIds),
        supabase.from("course_territories").select("territory_id, course_id, courses(id, title, description, created_at, is_deleted)").in("territory_id", tIds),
      ]);

      const units: UnitItem[] = [];
      const statsMap = new Map<string, TerritoryStats>();
      tIds.forEach(id => statsMap.set(id, { territoryId: id, territoryName: nameMap.get(id) || "", quests: 0, guilds: 0, pods: 0, companies: 0, services: 0, courses: 0 }));

      const addUnit = (type: UnitItem["type"], terrId: string, entity: any, nameField: string) => {
        if (!entity || entity.is_deleted) return;
        const createdAt = entity.created_at || "";
        if (dateFilter && createdAt < dateFilter) return;
        units.push({ id: entity.id, type, name: entity[nameField] || "Untitled", description: entity.description || "", territoryId: terrId, territoryName: nameMap.get(terrId) || "", createdAt });
        const s = statsMap.get(terrId);
        if (s) (s as any)[type === "quest" ? "quests" : type === "guild" ? "guilds" : type === "pod" ? "pods" : type === "company" ? "companies" : type === "service" ? "services" : "courses"]++;
      };

      (questTerr.data ?? []).forEach((r: any) => addUnit("quest", r.territory_id, r.quests, "title"));
      (guildTerr.data ?? []).forEach((r: any) => addUnit("guild", r.territory_id, r.guilds, "name"));
      (podTerr.data ?? []).forEach((r: any) => addUnit("pod", r.territory_id, r.pods, "name"));
      (compTerr.data ?? []).forEach((r: any) => addUnit("company", r.territory_id, r.companies, "name"));
      (serviceTerr.data ?? []).forEach((r: any) => addUnit("service", r.territory_id, r.services, "title"));
      (courseTerr.data ?? []).forEach((r: any) => addUnit("course", r.territory_id, r.courses, "title"));

      // Deduplicate units by id+type
      const seen = new Set<string>();
      const dedupedUnits = units.filter(u => {
        const key = `${u.type}-${u.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setAnalysisResults({ stats: Array.from(statsMap.values()), units: dedupedUnits });

      // Auto-trigger AI synthesis
      runSynthesis(tIds);
    } catch (e) {
      console.error("Territory analysis failed", e);
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedTerritoryIds, allTerritories, timeFilter]);

  // ─── AI Synthesis ──────────────────────────────────────────
  const runSynthesis = useCallback(async (territoryIds?: string[]) => {
    const ids = territoryIds || selectedTerritoryIds;
    if (ids.length === 0) return;
    setSynthesisLoading(true);
    setSynthesisError(null);
    setSynthesisData(null);
    try {
      // Use the first selected territory for intelligence (or could merge multiple)
      const primaryId = ids[0];
      const { data: res, error: fnErr } = await supabase.functions.invoke("territory-intelligence", {
        body: { territoryId: primaryId },
      });
      if (fnErr) throw fnErr;
      if (res?.error) {
        setSynthesisError(res.error);
      } else {
        setSynthesisData(res);
      }
    } catch (e: any) {
      setSynthesisError(e.message || "AI synthesis unavailable");
    } finally {
      setSynthesisLoading(false);
    }
  }, [selectedTerritoryIds]);

  // Filtered units
  const displayedUnits = useMemo(() => {
    if (!analysisResults) return [];
    return analysisResults.units.filter(u => activeUnitTypes.has(u.type));
  }, [analysisResults, activeUnitTypes]);

  // Group units by territory (compare) or flat (aggregate)
  const groupedUnits = useMemo(() => {
    if (mode === "aggregate") return { combined: displayedUnits };
    const groups: Record<string, UnitItem[]> = {};
    displayedUnits.forEach(u => {
      if (!groups[u.territoryId]) groups[u.territoryId] = [];
      groups[u.territoryId].push(u);
    });
    return groups;
  }, [displayedUnits, mode]);

  const unitIcon = (type: string) => {
    const found = UNIT_TYPES.find(u => u.key === type);
    return found ? found.icon : Compass;
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" /> {pageTitle}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Compare one or more territories, or see them as a combined ecosystem.</p>
      </div>

      {/* ─── Filters Panel ─── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        {/* Territory selector */}
        <div>
          <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <MapPin className="h-4 w-4 text-primary" /> Select territories
          </Label>
          <p className="text-xs text-muted-foreground mb-3">Compare one or more territories, or see them as a combined ecosystem.</p>

          {/* Selected chips */}
          {selectedTerritoryNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedTerritoryNames.map(t => (
                <Badge key={t.id} variant="secondary" className="pl-2 pr-1 py-1 gap-1 text-xs">
                  <MapPin className="h-3 w-3" /> {t.name}
                  <button onClick={() => removeTerritory(t.id)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedTerritoryIds.length > 1 && (
                <button onClick={() => { setSelectedTerritoryIds([]); setFiltersDirty(true); }} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Searchable territory list */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-muted-foreground font-normal">
                <Search className="h-4 w-4 mr-2" /> Search & select territories...
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-2 border-b border-border">
                <Input
                  placeholder="Search territories..."
                  value={territorySearch}
                  onChange={e => setTerritorySearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <ScrollArea className="max-h-60">
                <div className="p-1">
                  {filteredTerritories.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2 text-center">No territories found</p>
                  ) : (
                    filteredTerritories.map((t: any) => {
                      const checked = selectedTerritoryIds.includes(t.id);
                      const disabled = !checked && mode === "compare" && selectedTerritoryIds.length >= MAX_COMPARE;
                      return (
                        <label key={t.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                          <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => !disabled && toggleTerritory(t.id)} />
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{t.name}</span>
                          {t.level && <Badge variant="outline" className="text-[9px] ml-auto">{t.level}</Badge>}
                        </label>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          {mode === "compare" && selectedTerritoryIds.length >= MAX_COMPARE && (
            <p className="text-xs text-muted-foreground mt-1.5">For clarity, comparisons are limited to {MAX_COMPARE} territories at once.</p>
          )}
        </div>

        {/* Compare / Aggregate */}
        <div>
          <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Analysis mode
          </Label>
          <RadioGroup value={mode} onValueChange={(v) => { setMode(v as AnalysisMode); setFiltersDirty(true); }} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="compare" id="mode-compare" />
              <Label htmlFor="mode-compare" className="text-sm cursor-pointer">Compare side by side</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="aggregate" id="mode-aggregate" />
              <Label htmlFor="mode-aggregate" className="text-sm cursor-pointer">Aggregate into combined view</Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Unit type filters */}
        <div>
          <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <Layers className="h-4 w-4 text-primary" /> What do you want to see?
          </Label>
          <div className="flex flex-wrap gap-2">
            {UNIT_TYPES.map(({ key, icon: Icon }) => {
              const active = activeUnitTypes.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleUnitType(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {unitLabel(key)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Houses / Topics filter */}
        {(allTopics as any[]).length > 0 && (
          <div>
            <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
              <Hash className="h-4 w-4 text-primary" /> Filter by Houses
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {(allTopics as any[]).slice(0, 20).map((t: any) => {
                const active = selectedTopicIds.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${
                      active
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-card text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    <Hash className="h-3 w-3" />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Time filter */}
        <div>
          <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <Clock className="h-4 w-4 text-primary" /> Activity period
          </Label>
          <Select value={timeFilter} onValueChange={(v) => { setTimeFilter(v as TimeFilter); setFiltersDirty(true); }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="active">Active now</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Run Analysis CTA */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={runAnalysis}
            disabled={selectedTerritoryIds.length === 0 || analysisLoading}
            className="gap-2"
          >
            {analysisLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing territories…</>
            ) : (
              <><Play className="h-4 w-4" /> Run analysis</>
            )}
          </Button>
          {filtersDirty && analysisResults && (
            <p className="text-xs text-muted-foreground animate-pulse">Filters changed — re-run to update results.</p>
          )}
          {selectedTerritoryIds.length === 0 && (
            <p className="text-xs text-muted-foreground">Select at least one territory to begin.</p>
          )}
        </div>
      </div>

      {/* ─── Results ─── */}
      {analysisResults && !analysisLoading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Overview Stats */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {mode === "aggregate" && selectedTerritoryIds.length > 1
                ? `Combined view of ${selectedTerritoryNames.map(t => t.name).join(" + ")}`
                : "Territory Overview"
              }
            </h3>

            {mode === "compare" && analysisResults.stats.length > 1 ? (
              /* Comparison table */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Metric</th>
                      {analysisResults.stats.map(s => (
                        <th key={s.territoryId} className="text-center py-2 px-3 font-medium">{s.territoryName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(["quests", "guilds", "pods", "companies", "services", "courses"] as const).map(metric => {
                      const labelMap: Record<string, string> = {
                        quests: unitLabel("quest"),
                        guilds: unitLabel("guild"),
                        pods: unitLabel("pod"),
                        companies: unitLabel("company"),
                        services: unitLabel("service"),
                        courses: unitLabel("course"),
                      };
                      return (
                        <tr key={metric} className="border-b border-border/50">
                          <td className="py-2 pr-4 text-muted-foreground">{labelMap[metric]}</td>
                          {analysisResults.stats.map(s => (
                            <td key={s.territoryId} className="text-center py-2 px-3 font-semibold tabular-nums">{s[metric]}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Single territory or aggregate stats */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {(["quests", "guilds", "pods", "companies", "services", "courses"] as const).map(metric => {
                  const total = analysisResults.stats.reduce((sum, s) => sum + s[metric], 0);
                  const Icon = UNIT_TYPES.find(u => u.key === metric.replace(/s$/, ""))?.icon || Compass;
                  return (
                    <div key={metric} className="rounded-lg border border-border bg-background p-3 text-center">
                      <Icon className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-2xl font-bold tabular-nums">{total}</p>
                      <p className="text-xs text-muted-foreground">{unitLabel(metric.replace(/s$/, ""))}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── AI Synthesis Panel ─── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> AI Territorial Synthesis
              </h3>
              {synthesisData && !synthesisLoading && (
                <Button size="sm" variant="ghost" onClick={() => runSynthesis()} className="text-xs gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </Button>
              )}
            </div>

            {synthesisLoading && (
              <div className="flex items-center gap-3 py-6 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating AI synthesis of this territory…</p>
              </div>
            )}

            {synthesisError && !synthesisLoading && (
              <div className="text-center py-4">
                <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive mb-2">{synthesisError}</p>
                <Button size="sm" variant="outline" onClick={() => runSynthesis()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                </Button>
              </div>
            )}

            {synthesisData && !synthesisLoading && (
              <div className="space-y-4">
                {/* Summary */}
                {synthesisData.summary && (
                  <div className="flex items-start gap-2 bg-background/60 rounded-lg p-3">
                    <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm leading-relaxed">{synthesisData.summary}</p>
                  </div>
                )}

                {/* Gaps */}
                {synthesisData.gaps?.length > 0 && (
                  <SynthesisSection icon={AlertTriangle} title="Territory Gaps">
                    {synthesisData.gaps.map((gap: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{gap.area}</p>
                            <Badge className={`text-[10px] border-0 ${gap.severity === "high" ? "bg-destructive/10 text-destructive" : gap.severity === "medium" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>{gap.severity}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{gap.description}</p>
                        </div>
                      </div>
                    ))}
                  </SynthesisSection>
                )}

                {/* Collaborations */}
                {synthesisData.collaborations?.length > 0 && (
                  <SynthesisSection icon={Users} title="Suggested Collaborations">
                    {synthesisData.collaborations.map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
                        <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{c.description}</p>
                          <p className="text-xs text-muted-foreground">{c.reason}</p>
                        </div>
                      </div>
                    ))}
                  </SynthesisSection>
                )}

                {/* Funding Priorities */}
                {synthesisData.fundingPriorities?.length > 0 && (
                  <SynthesisSection icon={Coins} title="Funding Priorities">
                    {synthesisData.fundingPriorities.map((f: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
                        <Coins className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{f.area}</p>
                          <p className="text-xs text-muted-foreground">{f.reason}</p>
                          {f.estimatedImpact && <Badge variant="secondary" className="text-[10px] mt-1">Impact: {f.estimatedImpact}</Badge>}
                        </div>
                      </div>
                    ))}
                  </SynthesisSection>
                )}

                {/* Trends & Risks */}
                {(synthesisData.trends?.length > 0 || synthesisData.risks?.length > 0) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {synthesisData.trends?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                          <TrendingUp className="h-3.5 w-3.5" /> Emerging Trends
                        </p>
                        <ul className="space-y-1">
                          {synthesisData.trends.map((t: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-1.5">
                              <TrendingUp className="h-3 w-3 text-primary mt-1 shrink-0" />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {synthesisData.risks?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                          <AlertTriangle className="h-3.5 w-3.5" /> Risks
                        </p>
                        <ul className="space-y-1">
                          {synthesisData.risks.map((r: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-1.5">
                              <AlertTriangle className="h-3 w-3 text-warning mt-1 shrink-0" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Unit Cards */}
          {displayedUnits.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border bg-muted/20">
              <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-display font-semibold text-lg">No units match your filters in these territories yet.</p>
              <div className="flex justify-center gap-2 mt-4">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/quests/new">Start a {label("quest.label").toLowerCase()}</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/explore?tab=entities&create=guild">Create a {label("guild.label").toLowerCase()}</Link>
                </Button>
              </div>
            </div>
          ) : (
            Object.entries(groupedUnits).map(([groupKey, items]) => (
              <div key={groupKey}>
                {mode === "compare" && groupKey !== "combined" && (
                  <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
                    <MapPin className="h-4.5 w-4.5 text-primary" />
                    {analysisResults.stats.find(s => s.territoryId === groupKey)?.territoryName || groupKey}
                    <Badge variant="secondary" className="text-[10px]">{items.length} units</Badge>
                  </h3>
                )}
                {mode === "aggregate" && (
                  <h3 className="font-display font-semibold text-lg mb-3">
                    All units ({items.length})
                  </h3>
                )}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item, i) => {
                    const Icon = unitIcon(item.type);
                    return (
                      <motion.div key={`${item.type}-${item.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                        <Link
                          to={unitRoute(item.type, item.id, item.territoryId)}
                          className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-display font-semibold text-sm truncate">{item.name}</h4>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <Badge variant="secondary" className="text-[10px]">{unitLabel(item.type)}</Badge>
                                <Link
                                  to={`/territories/${item.territoryId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-block"
                                >
                                  <Badge variant="outline" className="text-[10px] hover:border-primary/40 transition-colors cursor-pointer">
                                    <MapPin className="h-2.5 w-2.5 mr-0.5" />{item.territoryName}
                                  </Badge>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Empty initial state */}
      {!analysisResults && !analysisLoading && (
        <div className="text-center py-16 rounded-xl border border-dashed border-border bg-muted/10">
          <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-display font-semibold text-lg">Select territories and run analysis</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Choose one or more territories above, configure your filters, then run analysis to explore the ecosystem.
          </p>
        </div>
      )}
    </div>
  );
}

function SynthesisSection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
