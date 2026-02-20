import { useState } from "react";
import { Sparkles, Loader2, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type AIWriterType = "bio" | "guild_identity" | "quest_story" | "quest_update" | "event_description" | "rewrite_title" | "rewrite_description";

interface AIWriterButtonProps {
  type: AIWriterType;
  context: Record<string, unknown>;
  currentText: string;
  onAccept: (text: string, extra?: Record<string, string>) => void;
  label?: string;
  className?: string;
}

/**
 * Reusable "Generate with AI" button that calls the ai-storyteller edge function.
 * Shows a preview of the generated text with accept/regenerate/dismiss actions.
 */
export function AIWriterButton({ type, context, currentText, onAccept, label = "Generate with AI", className }: AIWriterButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-storyteller", {
        body: { type, context: { ...context, currentText } },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI unavailable", description: data.error, variant: "destructive" });
        return;
      }
      setResult(data);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    if (!result) return;
    const { text, ...extra } = result;
    onAccept(text, extra);
    setResult(null);
    toast({ title: "Applied!" });
  };

  if (result) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> AI Suggestion
          </span>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={generate} disabled={loading}>
              <RotateCcw className="h-3 w-3 mr-1" /> Redo
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setResult(null)}>
              Dismiss
            </Button>
            <Button type="button" size="sm" className="h-7 text-xs" onClick={accept}>
              <Check className="h-3 w-3 mr-1" /> Use
            </Button>
          </div>
        </div>
        {result.tagline && <p className="text-xs font-medium text-primary italic">"{result.tagline}"</p>}
        {result.hook && <p className="text-xs font-medium text-primary italic">"{result.hook}"</p>}
        {result.suggestedTitle && <p className="text-xs text-muted-foreground">Suggested title: <span className="font-medium">{result.suggestedTitle}</span></p>}
        <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">{result.text}</p>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-7 text-xs ${className || ""}`}
      onClick={generate}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
      {loading ? "Generating…" : label}
    </Button>
  );
}
