import { useQuestContributions, useLogContribution, type ContributionType } from "@/hooks/useContributionLog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2, Clock, FileText, Shield, Star, Plus, ChevronDown, ChevronUp, Zap, Award, BookOpen
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  questId: string;
  questOwnerId: string;
  guildId?: string | null;
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  subtask_completed: { label: "Subtask", icon: CheckCircle2, color: "text-emerald-600" },
  quest_completed: { label: "Quest", icon: Award, color: "text-primary" },
  proposal_accepted: { label: "Proposal", icon: Star, color: "text-amber-500" },
  review_given: { label: "Review", icon: BookOpen, color: "text-blue-500" },
  documentation: { label: "Docs", icon: FileText, color: "text-indigo-500" },
  mentorship: { label: "Mentorship", icon: Shield, color: "text-purple-500" },
  governance_vote: { label: "Vote", icon: Zap, color: "text-orange-500" },
  ecological_annotation: { label: "Ecology", icon: Star, color: "text-green-600" },
  insight: { label: "Insight", icon: Zap, color: "text-cyan-500" },
  debugging: { label: "Debug", icon: FileText, color: "text-red-500" },
  other: { label: "Other", icon: FileText, color: "text-muted-foreground" },
};

const CONTRIBUTION_OPTIONS: { value: ContributionType; label: string }[] = [
  { value: "documentation", label: "Documentation" },
  { value: "review_given", label: "Review / Feedback" },
  { value: "mentorship", label: "Mentorship" },
  { value: "insight", label: "Insight / Idea" },
  { value: "debugging", label: "Debugging / Fix" },
  { value: "ecological_annotation", label: "Ecological annotation" },
  { value: "other", label: "Other contribution" },
];

export function ContributionLogPanel({ questId, questOwnerId, guildId }: Props) {
  const currentUser = useCurrentUser();
  const { data: contributions = [], isLoading } = useQuestContributions(questId);
  const { logContribution, verifyContribution } = useLogContribution();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Form state
  const [formType, setFormType] = useState<ContributionType>("documentation");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHours, setFormHours] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isOwner = currentUser.id === questOwnerId;

  const handleSubmit = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    await logContribution({
      questId,
      guildId: guildId ?? undefined,
      contributionType: formType,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      hoursLogged: formHours ? parseFloat(formHours) : undefined,
    });
    setFormTitle("");
    setFormDescription("");
    setFormHours("");
    setShowForm(false);
    setSubmitting(false);
  };

  // Aggregate stats
  const totalXp = contributions.reduce((s, c) => s + c.xp_earned, 0);
  const totalCredits = contributions.reduce((s, c) => s + c.credits_earned, 0);
  const uniqueContributors = new Set(contributions.map((c) => c.user_id)).size;
  const verified = contributions.filter((c) => c.status === "verified").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-display font-semibold text-sm hover:text-primary transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Proof of Contribution
          <Badge variant="secondary" className="text-xs">{contributions.length}</Badge>
        </button>

        {currentUser.id && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3 w-3" /> Log contribution
          </Button>
        )}
      </div>

      {expanded && (
        <>
          {/* Summary Stats */}
          {contributions.length > 0 && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold text-primary">{uniqueContributors}</p>
                <p className="text-[10px] text-muted-foreground">Contributors</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold text-primary">{contributions.length}</p>
                <p className="text-[10px] text-muted-foreground">Contributions</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold text-primary">{totalXp}</p>
                <p className="text-[10px] text-muted-foreground">XP Earned</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold text-primary">{verified}/{contributions.length}</p>
                <p className="text-[10px] text-muted-foreground">Verified</p>
              </div>
            </div>
          )}

          {/* Log Form */}
          {showForm && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex gap-2">
                <Select value={formType} onValueChange={(v) => setFormType(v as ContributionType)}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRIBUTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="What did you contribute?"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="flex-1 h-8 text-sm"
                />
              </div>
              <Textarea
                placeholder="Details (optional)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Hours (optional)"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  className="w-28 h-8 text-sm"
                  step="0.25"
                  min="0"
                />
                <div className="flex-1" />
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" className="h-7" onClick={handleSubmit} disabled={!formTitle.trim() || submitting}>
                  Log
                </Button>
              </div>
            </div>
          )}

          {/* Contribution List */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading contributions…</p>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No contributions logged yet.</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1.5">
                {contributions.map((c) => {
                  const typeInfo = TYPE_LABELS[c.contribution_type] ?? TYPE_LABELS.other;
                  const Icon = typeInfo.icon;
                  return (
                    <div key={c.id} className="flex items-start gap-2 rounded-md border border-border bg-card p-2 group">
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{c.profile?.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium truncate">{c.profile?.name}</span>
                          <Badge variant="outline" className={`text-[10px] gap-0.5 ${typeInfo.color}`}>
                            <Icon className="h-2.5 w-2.5" />
                            {typeInfo.label}
                          </Badge>
                          {c.status === "verified" && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">✓ Verified</Badge>
                          )}
                          {c.xp_earned > 0 && (
                            <span className="text-[10px] text-primary font-medium">+{c.xp_earned} XP</span>
                          )}
                          {c.credits_earned > 0 && (
                            <span className="text-[10px] text-amber-600 font-medium">+{c.credits_earned} Cr</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                        {c.hours_logged && (
                          <span className="text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5 inline mr-0.5" />{c.hours_logged}h
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {isOwner && c.status === "logged" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] opacity-0 group-hover:opacity-100"
                          onClick={() => verifyContribution(c.id)}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* IP Licence note */}
          <p className="text-[10px] text-muted-foreground">
            All contributions are attributed and licensed under CC-BY-SA by default. Your work is immutably recorded.
          </p>
        </>
      )}
    </div>
  );
}
