import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Loader2, Users, BookOpen, AlertTriangle } from "lucide-react";
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
    <div className="space-y-6">
      {/* AI Synthesis */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> {sectionTitle}
            </h3>
            {summary && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated by {summary.generated_by} {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true })}
                {" · "}Based on contributions from {contributors.length} {contributors.length === 1 ? "person" : "people"}
              </p>
            )}
          </div>
          {isMember && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateMutation.mutate(territoryId)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Generating...</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5 mr-1" /> {summary ? "Regenerate" : "Generate"} with AI</>
              )}
            </Button>
          )}
        </div>

        {summaryLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!summaryLoading && !summary && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No synthesis generated yet</p>
            <p className="text-xs mt-1">
              {isMember
                ? "Click \"Generate with AI\" to create an AI-powered synthesis from this territory's knowledge."
                : "Territory members can generate an AI synthesis from the knowledge base."}
            </p>
          </div>
        )}

        {!summaryLoading && summary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{summary.content}</ReactMarkdown>
            </div>
            {generateMutation.data?.hasFractalContext && (
              <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Parts of this synthesis are inferred from neighboring territories due to sparse local data.
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Contributors */}
      {contributors.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
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
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:border-primary/30 transition-all"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={c.avatar_url ?? undefined} />
                  <AvatarFallback>{c.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{c.entry_count} {c.entry_count === 1 ? "entry" : "entries"}</span>
                    {c.total_ai_score > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        Score: {Math.round(c.total_ai_score)}
                      </Badge>
                    )}
                  </div>
                </div>
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
