import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Info, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Evaluation {
  proposalId: string;
  summary: string;
  strengths: string[];
  risks: string[];
  neededConditions: string[];
  score: number;
}

interface Comparison {
  topRecommendation: string | null;
  reasoning: string;
  recommendedMatches: string[];
}

interface ProposalEvaluatorProps {
  questId: string;
  proposalTitles: Record<string, string>;
}

export function ProposalEvaluator({ questId, proposalTitles }: ProposalEvaluatorProps) {
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const runEvaluation = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-proposals", {
        body: { questId },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Evaluation unavailable", description: data.error, variant: "destructive" });
        return;
      }
      if (data?.message) {
        setMessage(data.message);
        setEvaluations([]);
        setComparison(null);
        return;
      }
      setEvaluations(data.evaluations || []);
      setComparison(data.comparison || null);
      toast({ title: "AI evaluation complete" });
    } catch (e: any) {
      toast({ title: "Evaluation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scoreColor = (score: number) => {
    if (score >= 7) return "text-emerald-600";
    if (score >= 4) return "text-amber-600";
    return "text-destructive";
  };

  if (evaluations.length === 0 && !message) {
    return (
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h4 className="text-sm font-semibold">AI Proposal Evaluation</h4>
              <p className="text-xs text-muted-foreground">Get a neutral analysis of all pending proposals</p>
            </div>
          </div>
          <Button size="sm" onClick={runEvaluation} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {loading ? "Analyzing…" : "Evaluate"}
          </Button>
        </div>
      </Card>
    );
  }

  if (message) {
    return (
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-semibold">AI Evaluation Results</h4>
        </div>
        <Button size="sm" variant="outline" onClick={runEvaluation} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
          Re-evaluate
        </Button>
      </div>

      {/* Per-proposal evaluations */}
      {evaluations.map((ev) => {
        const isExpanded = expanded[ev.proposalId];
        const title = proposalTitles[ev.proposalId] || "Proposal";
        return (
          <Card key={ev.proposalId} className="overflow-hidden">
            <button
              className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
              onClick={() => toggleExpand(ev.proposalId)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`text-lg font-bold ${scoreColor(ev.score)}`}>{ev.score}/10</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  <p className="text-xs text-muted-foreground truncate">{ev.summary.slice(0, 80)}…</p>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm">{ev.summary}</p>
                </div>

                <div className="flex items-center gap-1 mb-1">
                  <Progress value={ev.score * 10} className="h-1.5 flex-1" />
                  <span className={`text-xs font-bold ${scoreColor(ev.score)}`}>{ev.score}/10</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs font-semibold flex items-center gap-1 mb-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Strengths
                    </p>
                    <ul className="space-y-0.5">
                      {ev.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-3 w-3 text-amber-600" /> Risks
                    </p>
                    <ul className="space-y-0.5">
                      {ev.risks.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {r}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold flex items-center gap-1 mb-1">
                      <Info className="h-3 w-3 text-primary" /> Needed Conditions
                    </p>
                    <ul className="space-y-0.5">
                      {ev.neededConditions.map((c, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Comparison matrix */}
      {comparison && (
        <Card className="p-4 border-primary/20 bg-primary/5 space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Overall Comparison
          </h4>
          <p className="text-sm">{comparison.reasoning}</p>
          {comparison.topRecommendation && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Top match:</span>
              <Badge variant="default" className="text-xs">
                {proposalTitles[comparison.topRecommendation] || "Proposal"}
              </Badge>
            </div>
          )}
          {comparison.recommendedMatches.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-xs text-muted-foreground mr-1">Suggested collaborators:</span>
              {comparison.recommendedMatches.map(m => (
                <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground italic mt-2">
            This is an AI-generated analysis to assist your decision. Final choices are always yours.
          </p>
        </Card>
      )}
    </div>
  );
}
