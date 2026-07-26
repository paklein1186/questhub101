import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2, AlertTriangle, Check, ArrowRight } from "lucide-react";

export interface ContractAiContext {
  questTitle?: string;
  questDescription?: string;
  hostName?: string;
  members?: string;
  fmvRate?: number;
  budget?: string | number;
  governance?: string;
}

interface AiQuestion {
  id: string;
  topic?: string;
  question: string;
  why?: string;
  suggestions?: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  draftHtml: string;
  context: ContractAiContext;
  /** Applies the AI-generated contract back into the editor. */
  onApply: (result: { title?: string; html: string }) => void;
}

const TOPIC_LABELS: Record<string, string> = {
  objectives: "Objectives",
  roles: "Roles & responsibilities",
  financials: "Financial terms",
  milestones: "Milestones & deadlines",
  termination: "Termination / renewal",
  deliverables: "Deliverables",
  legal: "Legal obligations",
  other: "Other",
};

export function ContractAiAssistant({ open, onOpenChange, mode, draftHtml, context, onApply }: Props) {
  const { i18n } = useTranslation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<AiQuestion[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [completeness, setCompleteness] = useState(0);
  const [gaps, setGaps] = useState<string[]>([]);
  const [inconsistencies, setInconsistencies] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  const call = async (action: "next_questions" | "generate", collected: { question: string; answer: string }[]) => {
    const { data, error } = await supabase.functions.invoke("contract-ai", {
      body: {
        action,
        language: i18n.language,
        mode,
        draftHtml,
        context,
        answers: collected,
      },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const loadQuestions = async (collected: { question: string; answer: string }[]) => {
    setLoading(true);
    try {
      const data = await call("next_questions", collected);
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setCompleteness(Number(data.completeness) || 0);
      setGaps(Array.isArray(data.gaps) ? data.gaps : []);
      setInconsistencies(Array.isArray(data.inconsistencies) ? data.inconsistencies : []);
      setDone(!!data.done || !(data.questions?.length));
      setDrafts({});
      setStarted(true);
    } catch (e: any) {
      toast({ title: "AI unavailable", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRound = async () => {
    const collected = [
      ...answers,
      ...questions.map((q) => ({ question: q.question, answer: drafts[q.id]?.trim() || "" })),
    ];
    setAnswers(collected);
    await loadQuestions(collected);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const collected = [
        ...answers,
        ...questions
          .filter((q) => drafts[q.id]?.trim())
          .map((q) => ({ question: q.question, answer: drafts[q.id].trim() })),
      ];
      const data = await call("generate", collected);
      setNotes(Array.isArray(data.notes) ? data.notes : []);
      onApply({ title: data.title, html: data.html });
      toast({ title: "Contract updated by AI", description: "Review the text before saving." });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "AI unavailable", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setStarted(false);
    setQuestions([]);
    setAnswers([]);
    setDrafts({});
    setGaps([]);
    setInconsistencies([]);
    setNotes([]);
    setCompleteness(0);
    setDone(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI contract interview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!started && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                The assistant reads the current draft and the quest context, then asks targeted questions
                (objectives, roles, financial terms, milestones, deliverables, termination, legal obligations)
                to complete the contract. Questions adapt to your answers — you can skip any of them.
              </p>
              <Button size="sm" className="gap-1" onClick={() => loadQuestions([])} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Start the interview
              </Button>
            </div>
          )}

          {started && (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Contract completeness</span>
                  <span>{completeness}%</span>
                </div>
                <Progress value={completeness} className="h-1.5" />
              </div>

              {inconsistencies.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 space-y-1">
                  <p className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Possible inconsistencies
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-amber-700/90">
                    {inconsistencies.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              )}

              {gaps.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {gaps.map((g, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{g}</Badge>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing the contract…
                </div>
              )}

              {!loading && questions.length > 0 && (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {q.topic && (
                          <Badge variant="secondary" className="text-[10px]">
                            {TOPIC_LABELS[q.topic] ?? q.topic}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium">{q.question}</p>
                      {q.why && <p className="text-[10px] text-muted-foreground">{q.why}</p>}
                      {!!q.suggestions?.length && (
                        <div className="flex flex-wrap gap-1">
                          {q.suggestions.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              className="text-[10px] rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                              onClick={() => setDrafts((p) => ({ ...p, [q.id]: s }))}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      <Textarea
                        value={drafts[q.id] ?? ""}
                        onChange={(e) => setDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                        placeholder="Your answer (leave empty to skip)"
                        className="text-xs min-h-[60px]"
                      />
                    </div>
                  ))}
                </div>
              )}

              {!loading && done && questions.length === 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  The assistant has everything it needs — generate the contract.
                </p>
              )}

              {notes.length > 0 && (
                <ul className="list-disc pl-4 text-[11px] text-muted-foreground">
                  {notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 justify-end pt-1">
                {questions.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleSubmitRound} disabled={loading || generating}>
                    <ArrowRight className="h-3.5 w-3.5" /> Answer & continue
                  </Button>
                )}
                <Button size="sm" className="gap-1" onClick={handleGenerate} disabled={generating || loading}>
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {mode === "edit" ? "Update contract with AI" : "Generate contract"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-right">
                The generated text replaces the editor content — you can still edit it before saving.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
