import { useState } from "react";
import { Globe, Loader2, Sparkles, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScrapeResult {
  name: string | null;
  description: string | null;
  logo: string | null;
  sector: string | null;
  url: string;
  suggestedTopics: string[];
  suggestedTerritories: string[];
}

interface Topic {
  id: string;
  name: string;
}

interface Territory {
  id: string;
  name: string;
}

interface Props {
  topics: Topic[];
  territories: Territory[];
  onApply: (result: {
    title?: string;
    description?: string;
    coverImage?: string;
    topicIds: string[];
    territoryIds: string[];
  }) => void;
}

export function UrlScrapePanel({ topics, territories, onApply }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [applied, setApplied] = useState(false);
  const { toast } = useToast();

  const handleScrape = async () => {
    let target = url.trim();
    if (!target) return;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
    }

    setLoading(true);
    setResult(null);
    setApplied(false);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-entity", {
        body: { url: target },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Scrape failed", description: data.error, variant: "destructive" });
        return;
      }

      setResult(data as ScrapeResult);
      toast({ title: "Page analyzed!", description: "Review the suggestions below." });
    } catch (e: any) {
      toast({ title: "Scrape failed", description: e.message || "Could not analyze this URL.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const matchTopics = (suggestedKeywords: string[]): string[] => {
    if (!suggestedKeywords.length) return [];
    return topics
      .filter((t) =>
        suggestedKeywords.some(
          (kw) =>
            t.name.toLowerCase().includes(kw.toLowerCase()) ||
            kw.toLowerCase().includes(t.name.toLowerCase())
        )
      )
      .map((t) => t.id);
  };

  const matchTerritories = (suggestedKeywords: string[]): string[] => {
    if (!suggestedKeywords.length) return [];
    return territories
      .filter((t) =>
        suggestedKeywords.some(
          (kw) =>
            t.name.toLowerCase().includes(kw.toLowerCase()) ||
            kw.toLowerCase().includes(t.name.toLowerCase())
        )
      )
      .map((t) => t.id);
  };

  const applyResult = () => {
    if (!result) return;
    const topicIds = matchTopics(result.suggestedTopics);
    const territoryIds = matchTerritories(result.suggestedTerritories);

    onApply({
      title: result.name || undefined,
      description: result.description || undefined,
      coverImage: result.logo || undefined,
      topicIds,
      territoryIds,
    });

    setApplied(true);

    const parts: string[] = [];
    if (result.name) parts.push("title");
    if (result.description) parts.push("description");
    if (topicIds.length) parts.push(`${topicIds.length} topics`);
    if (territoryIds.length) parts.push(`${territoryIds.length} territories`);
    toast({ title: "Applied!", description: parts.length ? `Pre-filled: ${parts.join(", ")}` : "No matching data found." });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Globe className="h-4 w-4 text-primary" />
        <span>Import from URL</span>
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a website URL to auto-fill title, description, topics &amp; territories.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="pl-8"
            maxLength={500}
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          />
        </div>
        <Button
          onClick={handleScrape}
          disabled={!url.trim() || loading}
          size="sm"
          variant="outline"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
        </Button>
      </div>

      {result && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="space-y-1.5">
            {result.name && (
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 w-20">Title</span>
                <span className="text-xs">{result.name}</span>
              </div>
            )}
            {result.description && (
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 w-20">Description</span>
                <span className="text-xs line-clamp-3">{result.description}</span>
              </div>
            )}
            {result.suggestedTopics.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 w-20">Topics</span>
                <div className="flex flex-wrap gap-1">
                  {result.suggestedTopics.map((t) => {
                    const matched = topics.some(
                      (pt) =>
                        pt.name.toLowerCase().includes(t.toLowerCase()) ||
                        t.toLowerCase().includes(pt.name.toLowerCase())
                    );
                    return (
                      <span
                        key={t}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          matched
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {matched && <Sparkles className="inline h-2.5 w-2.5 mr-0.5" />}
                        {t}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {result.suggestedTerritories.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 w-20">Territories</span>
                <div className="flex flex-wrap gap-1">
                  {result.suggestedTerritories.map((t) => {
                    const matched = territories.some(
                      (pt) =>
                        pt.name.toLowerCase().includes(t.toLowerCase()) ||
                        t.toLowerCase().includes(pt.name.toLowerCase())
                    );
                    return (
                      <span
                        key={t}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          matched
                            ? "border-accent bg-accent/10 text-accent-foreground"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {matched && <Sparkles className="inline h-2.5 w-2.5 mr-0.5" />}
                        {t}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={applyResult}
            size="sm"
            className="w-full gap-1.5"
            disabled={applied}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {applied ? "Applied ✓" : "Apply suggestions"}
          </Button>
        </div>
      )}
    </div>
  );
}
