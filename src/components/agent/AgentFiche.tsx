import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// No typography plugin in the project: style the markdown elements directly.
const MARKDOWN_CLASSES = [
  "text-sm leading-relaxed space-y-2 break-words",
  "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-1",
  "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:pt-3 [&_h2]:border-t [&_h2]:border-border/60",
  "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
  "[&_a]:text-primary [&_a]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs",
  "[&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
].join(" ");

/** Public "fiche" of an agent: purpose, detailed description, variables, scope and where it is used. */
export function AgentFiche({ agent }: { agent: any }) {
  const { t } = useTranslation();
  const allVariables: { name: string; description?: string; kind?: string; columns?: string[] }[] = Array.isArray(agent.variables) ? agent.variables : [];
  const variables = allVariables.filter((v) => v.kind !== "data");
  const datasets = allVariables.filter((v) => v.kind === "data");

  const { data: scope } = useQuery({
    queryKey: ["agent-scope", agent.id],
    queryFn: async () => {
      const [tp, tr] = await Promise.all([
        supabase.from("agent_topics" as any).select("topics(id, name)").eq("agent_id", agent.id),
        supabase.from("agent_territories" as any).select("territories(id, name)").eq("agent_id", agent.id),
      ]);
      return {
        topics: ((tp.data ?? []) as any[]).map((r) => r.topics).filter(Boolean),
        territories: ((tr.data ?? []) as any[]).map((r) => r.territories).filter(Boolean),
      };
    },
  });

  const { data: usage } = useQuery({
    queryKey: ["agent-usage-units", agent.id],
    queryFn: async () => {
      const { data } = await supabase.from("unit_agents" as any).select("unit_type, unit_id").eq("agent_id", agent.id).eq("is_active", true);
      const rows = (data ?? []) as any[];
      const guildIds = rows.filter((r) => r.unit_type === "guild").map((r) => r.unit_id);
      const { data: guilds } = guildIds.length
        ? await supabase.from("guilds").select("id, name").in("id", guildIds)
        : { data: [] as any[] };
      return {
        guilds: guilds ?? [],
        pods: rows.filter((r) => r.unit_type === "pod").length,
        quests: rows.filter((r) => r.unit_type === "quest").length,
      };
    },
  });

  const hasScope = (scope?.topics.length ?? 0) + (scope?.territories.length ?? 0) > 0;
  const hasUsage = (usage?.guilds.length ?? 0) + (usage?.pods ?? 0) + (usage?.quests ?? 0) > 0;
  if (!agent.purpose && !agent.long_description && allVariables.length === 0 && !hasScope && !hasUsage) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{t("agentFiche.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-5 text-sm">
        {agent.purpose && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t("agentFiche.purpose")}</p>
            <p>{agent.purpose}</p>
          </div>
        )}

        {agent.long_description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t("agentFiche.about")}</p>
            <div className={MARKDOWN_CLASSES}>
              <ReactMarkdown>{agent.long_description}</ReactMarkdown>
            </div>
          </div>
        )}

        {variables.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t("agentFiche.variables")}</p>
            <div className="rounded-lg border border-border overflow-hidden">
              {variables.map((v) => (
                <div key={v.name} className="flex gap-3 px-3 py-2 border-b border-border/50 last:border-0">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded h-fit shrink-0">{v.name}</code>
                  <span className="text-xs text-muted-foreground">{v.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {datasets.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t("agentFiche.datasets")}</p>
            <div className="space-y-2">
              {datasets.map((d) => (
                <div key={d.name} className="rounded-lg border border-border p-3 space-y-1.5">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{d.name}</code>
                  {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                  {(d.columns?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {d.columns!.map((c) => <Badge key={c} variant="outline" className="text-[10px] font-mono font-normal">{c}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasScope && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t("agentFiche.scope")}</p>
            <div className="flex flex-wrap gap-1.5">
              {scope!.topics.map((tp: any) => <Badge key={tp.id} variant="secondary" className="text-xs">{tp.name}</Badge>)}
              {scope!.territories.map((tr: any) => <Badge key={tr.id} variant="outline" className="text-xs">{tr.name}</Badge>)}
            </div>
          </div>
        )}

        {hasUsage && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t("agentFiche.usedIn")}</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              {usage!.guilds.map((g: any) => (
                <Link key={g.id} to={`/guilds/${g.id}`}><Badge variant="outline" className="text-xs hover:border-primary/40">{g.name}</Badge></Link>
              ))}
              {(usage!.pods > 0 || usage!.quests > 0) && (
                <span className="text-xs text-muted-foreground">
                  {t("agentFiche.podsQuests", { pods: usage!.pods, quests: usage!.quests })}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
