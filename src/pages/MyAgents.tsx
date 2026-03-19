import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Bot, Archive, RotateCcw, Link2, Zap, Star, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentSourceBadge } from "@/components/agent/AgentSourceBadge";
import { AttachAgentDialog } from "@/components/agent/AttachAgentDialog";
import { toast } from "sonner";

export default function MyAgents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [attachAgentId, setAttachAgentId] = useState<string | null>(null);

  const { data: hires, isLoading } = useQuery({
    queryKey: ["my-hired-agents-full", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_hires")
        .select("*, agents(*)")
        .eq("user_id", user!.id)
        .order("hired_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const archiveMut = useMutation({
    mutationFn: async ({ hireId, newStatus }: { hireId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("agent_hires")
        .update({ status: newStatus } as any)
        .eq("id", hireId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-hired-agents-full"] });
      qc.invalidateQueries({ queryKey: ["my-agent-hires"] });
    },
  });

  const activeHires = hires?.filter((h: any) => h.status === "active") || [];
  const archivedHires = hires?.filter((h: any) => h.status === "archived") || [];

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" /> My Agents
          </h1>
          <p className="text-muted-foreground mt-1">Agents you've hired and can deploy into your spaces.</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/agents">Browse Agents</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : !activeHires.length && !archivedHires.length ? (
        <Card className="p-12 text-center">
          <Bot className="h-14 w-14 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-2">No agents hired yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Browse the agent marketplace to discover and hire AI agents.
          </p>
          <Button asChild>
            <Link to="/agents">Browse Agents</Link>
          </Button>
        </Card>
      ) : (
        <>
          {activeHires.length > 0 && (
            <div className="space-y-4 mb-8">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Active ({activeHires.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeHires.map((hire: any) => {
                  const agent = hire.agents;
                  if (!agent) return null;
                  return (
                    <Card key={hire.id} className="p-5 hover:shadow-lg transition-shadow group relative overflow-hidden">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link to={`/agents/${agent.id}`} className="font-semibold text-foreground hover:text-primary transition-colors truncate block">
                            {agent.name}
                          </Link>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px]">{agent.category}</Badge>
                            <AgentSourceBadge agentSource={agent.agent_source} healthStatus={agent.health_status} />
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{agent.description}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <Zap className="h-3 w-3" /> {agent.cost_per_use} credits/msg
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <Link to={`/agents/${agent.id}`}>Open</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setAttachAgentId(agent.id)}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1" /> Attach
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            archiveMut.mutate({ hireId: hire.id, newStatus: "archived" });
                            toast.success("Agent archived");
                          }}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {archivedHires.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Archived ({archivedHires.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedHires.map((hire: any) => {
                  const agent = hire.agents;
                  if (!agent) return null;
                  return (
                    <Card key={hire.id} className="p-5 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Bot className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{agent.name}</p>
                          <Badge variant="outline" className="text-[10px]">{agent.category}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            archiveMut.mutate({ hireId: hire.id, newStatus: "active" });
                            toast.success("Agent re-activated");
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {attachAgentId && user && (
        <AttachAgentDialog
          open={!!attachAgentId}
          onOpenChange={(v) => { if (!v) setAttachAgentId(null); }}
          agentId={attachAgentId}
          userId={user.id}
        />
      )}
    </PageShell>
  );
}
