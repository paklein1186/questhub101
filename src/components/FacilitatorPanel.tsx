import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, ListChecks, CalendarDays, MessageCircleHeart,
  Loader2, Sparkles, Copy, Check, Plus, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

interface FacilitatorPanelProps {
  entityType: "GUILD" | "POD";
  entityId: string;
  entityName: string;
  isAdmin: boolean;
  guildId?: string; // for saving docs to guild
}

type ActionType = "summarize" | "next_steps" | "agenda" | "rewrite";

interface StepItem {
  title: string;
  description: string;
  suggested_assignee?: string;
}

export function FacilitatorPanel({ entityType, entityId, entityName, isAdmin, guildId }: FacilitatorPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState<ActionType | null>(null);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [stepsResult, setStepsResult] = useState<StepItem[] | null>(null);
  const [agendaResult, setAgendaResult] = useState<string | null>(null);
  const [rewriteInput, setRewriteInput] = useState("");
  const [rewriteResult, setRewriteResult] = useState<{ original: string; rewritten: string; tone_note: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const runAction = async (action: ActionType) => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("facilitate", {
        body: { entityType, entityId, action, inputText: action === "rewrite" ? rewriteInput : undefined },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: "AI Error", description: data.error, variant: "destructive" }); return; }

      const r = data.result;
      if (action === "summarize") setSummaryResult(r.content || r.raw || "");
      if (action === "next_steps") setStepsResult(r.steps || []);
      if (action === "agenda") setAgendaResult(r.content || r.raw || "");
      if (action === "rewrite") setRewriteResult(r);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const saveAsDoc = async (title: string, content: string) => {
    const targetGuildId = guildId || (entityType === "GUILD" ? entityId : undefined);
    if (!targetGuildId) { toast({ title: "No guild context to save doc" }); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("guild_docs").insert({
      guild_id: targetGuildId,
      title,
      content,
      created_by_user_id: user.id,
    } as any);
    if (error) { toast({ title: "Failed to save", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["guild-docs", targetGuildId] });
    toast({ title: "Saved to Guild Docs" });
  };

  const actions = [
    { key: "summarize" as ActionType, label: "Summarize Discussions", icon: FileText, desc: "AI summary of recent chat & activity" },
    { key: "next_steps" as ActionType, label: "Extract Next Steps", icon: ListChecks, desc: "Actionable tasks from discussions" },
    { key: "agenda" as ActionType, label: "Generate Agenda", icon: CalendarDays, desc: "Meeting agenda from activity & roles" },
    { key: "rewrite" as ActionType, label: "Conflict-Friendly Rewrite", icon: MessageCircleHeart, desc: "Rephrase messages constructively" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-semibold">AI Facilitator</h3>
        <Badge variant="secondary" className="text-[10px]">Beta</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        AI tools to help facilitate {entityName}. Results are generated from recent activity and member context.
      </p>

      {/* Action buttons */}
      <div className="grid gap-3 md:grid-cols-2">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => a.key !== "rewrite" && runAction(a.key)}
            disabled={loading !== null}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/30 transition-all disabled:opacity-50"
          >
            <a.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{a.label}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
            {loading === a.key && <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" />}
          </button>
        ))}
      </div>

      {/* Rewrite input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircleHeart className="h-4 w-4 text-primary" /> Conflict-Friendly Rewrite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={rewriteInput}
            onChange={(e) => setRewriteInput(e.target.value)}
            placeholder="Paste a message that could use a kinder tone..."
            className="resize-none text-sm"
            rows={3}
          />
          <Button
            size="sm"
            onClick={() => runAction("rewrite")}
            disabled={!rewriteInput.trim() || loading !== null}
          >
            {loading === "rewrite" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageCircleHeart className="h-4 w-4 mr-1" />}
            Rewrite
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence mode="popLayout">
        {summaryResult && (
          <ResultCard
            key="summary"
            title="Discussion Summary"
            icon={FileText}
            onCopy={() => copyToClipboard(summaryResult, "summary")}
            copied={copied === "summary"}
            onRegenerate={() => runAction("summarize")}
            onSaveDoc={isAdmin ? () => saveAsDoc(`Summary – ${new Date().toLocaleDateString()}`, summaryResult) : undefined}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{summaryResult}</ReactMarkdown>
            </div>
          </ResultCard>
        )}

        {stepsResult && (
          <ResultCard
            key="steps"
            title="Next Steps"
            icon={ListChecks}
            onCopy={() => copyToClipboard(stepsResult.map(s => `- ${s.title}: ${s.description}`).join("\n"), "steps")}
            copied={copied === "steps"}
            onRegenerate={() => runAction("next_steps")}
            onSaveDoc={isAdmin ? () => saveAsDoc(
              `Next Steps – ${new Date().toLocaleDateString()}`,
              stepsResult.map(s => `### ${s.title}\n${s.description}${s.suggested_assignee ? `\n> Suggested: ${s.suggested_assignee}` : ""}`).join("\n\n")
            ) : undefined}
          >
            <div className="space-y-2">
              {stepsResult.map((step, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    {step.suggested_assignee && (
                      <Badge variant="outline" className="text-[10px] mt-1">{step.suggested_assignee}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ResultCard>
        )}

        {agendaResult && (
          <ResultCard
            key="agenda"
            title="Meeting Agenda"
            icon={CalendarDays}
            onCopy={() => copyToClipboard(agendaResult, "agenda")}
            copied={copied === "agenda"}
            onRegenerate={() => runAction("agenda")}
            onSaveDoc={isAdmin ? () => saveAsDoc(`Agenda – ${new Date().toLocaleDateString()}`, agendaResult) : undefined}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{agendaResult}</ReactMarkdown>
            </div>
          </ResultCard>
        )}

        {rewriteResult && (
          <ResultCard
            key="rewrite"
            title="Rewritten Message"
            icon={MessageCircleHeart}
            onCopy={() => copyToClipboard(rewriteResult.rewritten, "rewrite")}
            copied={copied === "rewrite"}
            onRegenerate={() => runAction("rewrite")}
          >
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Original</p>
                <p className="text-sm bg-destructive/5 border border-destructive/10 rounded-lg p-3 italic">{rewriteResult.original}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-primary mb-1">Suggested Rewrite</p>
                <p className="text-sm bg-primary/5 border border-primary/10 rounded-lg p-3">{rewriteResult.rewritten}</p>
              </div>
              <p className="text-xs text-muted-foreground italic">💡 {rewriteResult.tone_note}</p>
            </div>
          </ResultCard>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({
  title, icon: Icon, children, onCopy, copied, onRegenerate, onSaveDoc,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  onCopy: () => void;
  copied: boolean;
  onRegenerate: () => void;
  onSaveDoc?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" /> {title}
            </CardTitle>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCopy} title="Copy">
                {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRegenerate} title="Regenerate">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              {onSaveDoc && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSaveDoc}>
                  <Plus className="h-3 w-3 mr-1" /> Save to Docs
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
