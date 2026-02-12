import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Loader2, Users, BookOpen, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usePersona } from "@/hooks/usePersona";
import {
  useTerritorySummary,
  useTerritoryContributors,
  useGenerateTerritorySummary,
} from "@/hooks/useTerritoryMemory";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

/** Enhance synthesis text with better section spacing and emoji markers */
function formatSynthesisContent(content: string): string {
  if (!content) return "";
  let formatted = content;

  // Add emoji markers to common section headers if not already present
  const sectionEmojis: Record<string, string> = {
    "overview": "🌍",
    "context": "📍",
    "key findings": "🔑",
    "key insights": "🔑",
    "strengths": "💪",
    "opportunities": "🚀",
    "challenges": "⚡",
    "risks": "⚠️",
    "recommendations": "💡",
    "next steps": "👣",
    "conclusion": "🎯",
    "summary": "📋",
    "ecosystem": "🌱",
    "community": "👥",
    "economy": "💰",
    "culture": "🎭",
    "innovation": "✨",
    "infrastructure": "🏗️",
    "education": "📚",
    "governance": "⚖️",
    "environment": "🌿",
    "health": "🏥",
    "technology": "🔧",
    "resources": "📦",
    "partnerships": "🤝",
    "impact": "📊",
    "vision": "🔭",
    "gaps": "🧩",
    "actors": "🎭",
    "key actors": "🎭",
    "takeaways": "📌",
    "key takeaways": "📌",
    "lessons": "📝",
    "key lessons": "📝",
  };

  // Process each line - add emoji to markdown headers that match known sections
  formatted = formatted.replace(/^(#{1,3})\s+(.+)$/gm, (match, hashes, title) => {
    const lower = title.toLowerCase().replace(/[^a-z\s]/g, "").trim();
    // Don't add emoji if it already starts with one
    if (/^[\u{1F000}-\u{1FFFF}]/u.test(title)) return match;
    const emoji = sectionEmojis[lower];
    return emoji ? `${hashes} ${emoji} ${title}` : match;
  });

  // Ensure sections have breathing room with horizontal rules between major sections
  formatted = formatted.replace(/\n(## )/g, "\n---\n\n$1");

  return formatted;
}

interface Props {
  territoryId: string;
  territoryName: string;
  isMember: boolean;
}

export function TerritorySynthesis({ territoryId, territoryName, isMember }: Props) {
  const { persona } = usePersona();
  const { data: summary, isLoading: summaryLoading } = useTerritorySummary(territoryId);
  const { data: contributors = [] } = useTerritoryContributors(territoryId);
  const generateMutation = useGenerateTerritorySummary();

  const sectionTitle = persona === "CREATIVE" ? "World Synthesis" : persona === "IMPACT" ? "Territory Synthesis" : "Resilience Synthesis";
  const contributorsTitle = persona === "CREATIVE"
    ? "World-builders of this territory"
    : persona === "IMPACT"
    ? "Knowledge contributors"
    : "Weavers of this territory";
  const contributorsDesc = persona === "CREATIVE"
    ? "These creators have been weaving the story of this place."
    : persona === "IMPACT"
    ? "These practitioners and operators feed the intelligence of this territory."
    : "These people contribute data, stories and insights for territorial resilience.";

  return (
    <div className="space-y-5">
      {/* AI Synthesis */}
      <div className="relative rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-transparent overflow-hidden">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base">{sectionTitle}</h3>
                  {summary && (
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Updated {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true })}
                      {" · "}{contributors.length} contributor{contributors.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {isMember && (
              <Button
                size="sm"
                variant={summary ? "outline" : "default"}
                className="gap-1.5 rounded-lg"
                onClick={() => generateMutation.mutate(territoryId)}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5" /> {summary ? "Regenerate" : "Generate"}</>
                )}
              </Button>
            )}
          </div>

          {/* Loading */}
          {summaryLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty state */}
          {!summaryLoading && !summary && (
            <div className="text-center py-10 space-y-3">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium">No synthesis generated yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {isMember
                    ? "Generate an AI-powered synthesis from this territory's collective knowledge base."
                    : "Territory members can generate an AI synthesis from the knowledge base."}
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          {!summaryLoading && summary && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="prose prose-sm dark:prose-invert max-w-none text-[0.9rem] leading-[1.9] prose-headings:font-display prose-headings:text-foreground/90 prose-headings:mt-6 prose-headings:mb-3 prose-p:text-foreground/80 prose-p:mb-4 prose-strong:text-foreground/90 prose-li:text-foreground/80 prose-li:mb-1.5 prose-ul:my-3 prose-ol:my-3 prose-hr:my-6 prose-hr:border-primary/10 prose-blockquote:border-primary/30 prose-blockquote:bg-primary/[0.03] prose-blockquote:rounded-lg prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic">
                <ReactMarkdown>{formatSynthesisContent(summary.content)}</ReactMarkdown>
              </div>
              {generateMutation.data?.hasFractalContext && (
                <div className="flex items-center gap-2 mt-5 px-3.5 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  🧩 Parts of this synthesis are inferred from neighboring territories due to sparse local data.
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Contributors */}
      {contributors.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
          <div>
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> {contributorsTitle}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{contributorsDesc}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {contributors.map(c => (
              <Link
                key={c.user_id}
                to={`/users/${c.user_id}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 hover:border-primary/25 hover:bg-primary/[0.02] transition-all"
              >
                <Avatar className="h-9 w-9 ring-2 ring-primary/10">
                  <AvatarImage src={c.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs bg-primary/5 text-primary">{c.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{c.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{c.entry_count} {c.entry_count === 1 ? "entry" : "entries"}</span>
                    {c.total_ai_score > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Score {Math.round(c.total_ai_score)}
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {!isMember && contributors.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Improve this description by joining this territory and adding more knowledge.
        </p>
      )}
    </div>
  );
}
