import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, Plus, Sparkles, Search, Zap, Star, Globe, Key, AlertTriangle, Eye, EyeOff, CircleDollarSign, Gift, CheckCircle, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionBanner, HINTS } from "@/components/onboarding/ContextualHint";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentSourceBadge } from "@/components/agent/AgentSourceBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AttachAgentDialog } from "@/components/agent/AttachAgentDialog";
import { CreateAgentDialog } from "@/components/agent/CreateAgentDialog";

const CATEGORY_COLORS: Record<string, string> = {
  intelligence: "bg-blue-500/10 text-blue-600 border-blue-200",
  writing: "bg-purple-500/10 text-purple-600 border-purple-200",
  strategy: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  coaching: "bg-amber-500/10 text-amber-600 border-amber-200",
  general: "bg-muted text-muted-foreground border-border",
};

export default function AgentsMarketplace({ bare }: { bare?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [attachAgentId, setAttachAgentId] = useState<string | null>(null);

  const CATEGORIES = [
    { value: "all", label: t("common.all") },
    { value: "intelligence", label: t("agents.intelligence") },
    { value: "writing", label: t("agents.writing") },
    { value: "strategy", label: t("agents.strategy") },
    { value: "coaching", label: t("agents.coaching") },
    { value: "general", label: t("agents.general") },
  ];

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents", category, search, sourceFilter, billingFilter],
    queryFn: async () => {
      let q = supabase.from("agents").select("*").eq("is_published", true).order("is_featured", { ascending: false }).order("usage_count", { ascending: false });
      if (category !== "all") q = q.eq("category", category);
      if (sourceFilter !== "all") q = q.eq("agent_source", sourceFilter);
      if (billingFilter !== "all") q = q.eq("billing_currency", billingFilter);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const activeFilterCount = (category !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) + (billingFilter !== "all" ? 1 : 0);

  const { data: myHires } = useQuery({
    queryKey: ["my-agent-hires", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_hires").select("agent_id").eq("user_id", user!.id).eq("status", "active");
      if (error) throw error;
      return new Set(data.map((h: any) => h.agent_id));
    },
  });

  const hireMut = useMutation({
    mutationFn: async (agentId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Find agent to check hire_price
      const agent = agents?.find((a: any) => a.id === agentId);
      const hirePrice = Number(agent?.hire_price ?? 0);
      if (hirePrice > 0) {
        const { processAgentPayment } = await import("@/lib/agentPayment");
        const result = await processAgentPayment(user.id, hirePrice, agentId, "hire");
        if (!result.success) throw new Error(result.error || "Payment failed");
      }
      const { error } = await supabase.from("agent_hires").insert({ user_id: user.id, agent_id: agentId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agent hired!");
      qc.invalidateQueries({ queryKey: ["my-agent-hires"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to hire agent"),
  });

  const Wrapper = bare ? "div" : PageShell;

  return (
    <Wrapper>
      {!bare && <SectionBanner {...HINTS.banners.agents} />}
      {!bare && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" /> {t("agents.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("agents.subtitle")}</p>
          </div>
          {user && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/my-agents">
                <Bot className="h-4 w-4 mr-1" /> My Agents
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("agents.searchAgents")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <Button key={c.value} variant={category === c.value ? "default" : "outline"} size="sm" onClick={() => setCategory(c.value)}>{c.label}</Button>
          ))}
        </div>
        {user && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("agents.createAgent")}
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs text-muted-foreground mr-1">Source:</span>
        {[
          { value: "all", label: "All" },
          { value: "platform", label: "🤖 Platform" },
          { value: "custom_llm", label: "🔑 Custom" },
          { value: "webhook", label: "🔗 External" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setSourceFilter(f.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              sourceFilter === f.value
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:border-muted-foreground/40"
            }`}
          >{f.label}</button>
        ))}

        <span className="text-xs text-muted-foreground ml-3 mr-1">Billing:</span>
        {[
          { value: "all", label: "All" },
          { value: "free", label: "Free" },
          { value: "credits", label: "Credits" },
          { value: "coins", label: "Coins" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setBillingFilter(f.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              billingFilter === f.value
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:border-muted-foreground/40"
            }`}
          >{f.label}</button>
        ))}

        {activeFilterCount > 0 && (
          <button
            onClick={() => { setCategory("all"); setSourceFilter("all"); setBillingFilter("all"); }}
            className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : !agents?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>{t("agents.noAgentsFound")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent: any) => {
            const isHired = myHires?.has(agent.id);
            return (
              <Card
                key={agent.id}
                className="p-5 hover:shadow-lg transition-shadow cursor-pointer group relative overflow-hidden"
                onClick={() => navigate(`/agents/${agent.id}`)}
              >
                {agent.is_featured && (
                  <div className="absolute top-3 right-3">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  </div>
                )}
                <div className="flex items-start gap-3 mb-3 mt-1">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{agent.name}</h3>
                      {isHired && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30 px-1.5 py-0 shrink-0">
                          <CheckCircle className="h-3 w-3 mr-0.5" /> Hired
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[agent.category] || ""}`}>{agent.category}</Badge>
                      <AgentSourceBadge agentSource={agent.agent_source} healthStatus={agent.health_status} />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{agent.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {agent.skills?.slice(0, 2).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                    {agent.skills?.length > 2 && <Badge variant="secondary" className="text-[10px]">+{agent.skills.length - 2}</Badge>}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
                    {Number(agent.hire_price ?? 0) > 0 && (
                      <span><Sparkles className="h-3 w-3 inline mr-0.5" />{agent.hire_price} to hire</span>
                    )}
                    <span>
                      <Zap className="h-3 w-3 inline mr-0.5" />
                      {Number(agent.usage_price ?? agent.cost_per_use) > 0 ? `${agent.usage_price ?? agent.cost_per_use}/msg` : "Free usage"}
                    </span>
                  </div>
                </div>
                {/* Action buttons */}
                <div className="mt-3 pt-3 border-t border-border flex gap-2" onClick={e => e.stopPropagation()}>
                  {!user ? (
                    <Button size="sm" variant="outline" className="w-full" asChild>
                      <Link to="/login">Log in to hire</Link>
                    </Button>
                  ) : !isHired ? (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={hireMut.isPending}
                      onClick={() => hireMut.mutate(agent.id)}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      {hireMut.isPending ? "Hiring..." : Number(agent.hire_price ?? 0) > 0 ? `Hire (${agent.hire_price} cr)` : "Hire Agent (Free)"}
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <Link to={`/agents/${agent.id}`}>Open</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setAttachAgentId(agent.id)}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1" /> Attach to...
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {user && <CreateAgentDialog open={createOpen} onOpenChange={setCreateOpen} userId={user.id} />}

      {attachAgentId && user && (
        <AttachAgentDialog
          open={!!attachAgentId}
          onOpenChange={(v) => { if (!v) setAttachAgentId(null); }}
          agentId={attachAgentId}
          userId={user.id}
        />
      )}
    </Wrapper>
  );
}
