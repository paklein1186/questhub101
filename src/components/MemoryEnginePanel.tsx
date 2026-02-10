import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Loader2, Copy, Check, RefreshCw, Plus, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

interface MemoryEnginePanelProps {
  entityType: "GUILD" | "QUEST" | "POD" | "TERRITORY";
  entityId: string;
  entityName: string;
  /** If provided, "Save to Docs" saves into this guild's docs */
  guildId?: string;
  /** For quests: callback to append summary to quest description */
  onAppendToDescription?: (text: string) => void;
}

export function MemoryEnginePanel({
  entityType,
  entityId,
  entityName,
  guildId,
  onAppendToDescription,
}: MemoryEnginePanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-memory", {
        body: { entityType, entityId },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
        return;
      }
      setSummary(data.summary || "");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const saveToGuildDocs = async () => {
    if (!summary) return;
    const targetGuildId = guildId || (entityType === "GUILD" ? entityId : undefined);
    if (!targetGuildId) {
      toast({ title: "No guild context to save doc" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("guild_docs").insert({
      guild_id: targetGuildId,
      title: `Memory Summary: ${entityName} – ${new Date().toLocaleDateString()}`,
      content: summary,
      created_by_user_id: user.id,
    } as any);
    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["guild-docs", targetGuildId] });
    toast({ title: "Saved to Guild Docs" });
  };

  const canSaveToDocs = !!(guildId || entityType === "GUILD");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-semibold">Institutional Memory</h3>
        <Badge variant="secondary" className="text-[10px]">AI</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Generate a comprehensive history summary covering decisions, milestones, collaborators, lessons learned, and risks for <strong>{entityName}</strong>.
      </p>

      <Button onClick={generate} disabled={loading} className="gap-2">
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
        ) : summary ? (
          <><RefreshCw className="h-4 w-4" /> Regenerate Summary</>
        ) : (
          <><Brain className="h-4 w-4" /> Generate History Summary</>
        )}
      </Button>

      {summary && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Memory Summary
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyToClipboard} title="Copy">
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={generate} title="Regenerate">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  {canSaveToDocs && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={saveToGuildDocs}>
                      <Plus className="h-3 w-3 mr-1" /> Save to Docs
                    </Button>
                  )}
                  {onAppendToDescription && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAppendToDescription(summary)}>
                      <Plus className="h-3 w-3 mr-1" /> Append to Description
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
