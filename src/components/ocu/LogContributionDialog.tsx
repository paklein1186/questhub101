import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Difficulty = "standard" | "enhanced" | "complex" | "critical";

const DIFFICULTY_OPTIONS: { value: Difficulty; key: string; multiplier: number }[] = [
  { value: "standard", key: "standard", multiplier: 1.0 },
  { value: "enhanced", key: "enhanced", multiplier: 1.5 },
  { value: "complex", key: "complex", multiplier: 2.0 },
  { value: "critical", key: "critical", multiplier: 3.0 },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questId: string;
  guildId?: string | null;
  territoryId?: string | null;
  fmvRate?: number;
}

export function LogContributionDialog({ open, onOpenChange, questId, guildId, territoryId, fmvRate = 200 }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [halfDays, setHalfDays] = useState("1");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [subtaskId, setSubtaskId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Load subtasks for linking
  const { data: subtasks = [] } = useQuery({
    queryKey: ["quest-subtasks-select", questId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_subtasks" as any)
        .select("id, title")
        .eq("quest_id", questId)
        .order("order_index");
      return (data || []) as unknown as { id: string; title: string }[];
    },
    enabled: open,
  });

  const multiplier = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)!.multiplier;
  const parsedHalfDays = Math.max(0.5, parseFloat(halfDays) || 0.5);
  const fmvValue = useMemo(
    () => Math.round(parsedHalfDays * fmvRate * multiplier * 100) / 100,
    [parsedHalfDays, fmvRate, multiplier]
  );

  const handleSubmit = async () => {
    if (!title.trim() || !currentUser.id) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("contribution_logs" as any)
      .insert({
        user_id: currentUser.id,
        quest_id: questId,
        guild_id: guildId ?? null,
        territory_id: territoryId ?? null,
        contribution_type: "TIME",
        fmv_input: { half_days: parsedHalfDays, difficulty: difficulty.toUpperCase() },
        title: title.trim(),
        description: description.trim() || null,
        deliverable_url: deliverableUrl.trim() || null,
        subtask_id: (subtaskId && subtaskId !== "__none__") ? subtaskId : null,
        half_days: parsedHalfDays,
        difficulty: difficulty,
        weight_factor: multiplier,
        hours_logged: parsedHalfDays * 4,
        base_units: parsedHalfDays,
        weighted_units: parsedHalfDays * multiplier,
        ip_licence: "CC-BY-SA",
        status: "pending",
        review_quorum: 1,
        // fmv_value is computed server-side by trigger
      } as any);

    if (error) {
      toast({ title: t("logContribution.toast.failed"), variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // If subtask linked, emit 1 $CTG
    if (subtaskId && subtaskId !== "__none__") {
      await supabase.from("ctg_transactions" as any).insert({
        user_id: currentUser.id,
        amount: 1,
        balance_after: 0, // will be corrected by wallet logic
        type: "emission",
        note: `Subtask linked to contribution: ${title.trim()}`,
        related_entity_id: subtaskId,
        related_entity_type: "subtask",
      } as any);
    }

    toast({ title: t("logContribution.toast.submitted") });
    qc.invalidateQueries({ queryKey: ["contribution-logs"] });

    // Reset
    setTitle("");
    setDescription("");
    setHalfDays("1");
    setDifficulty("standard");
    setDeliverableUrl("");
    setSubtaskId("");
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("logContribution.dialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label className="text-sm font-medium">{t("logContribution.titleLabel")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("logContribution.titlePlaceholder")}
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium">{t("logContribution.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("logContribution.descriptionPlaceholder")}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Half-days */}
          <div>
            <Label className="text-sm font-medium">{t("logContribution.halfDaysLabel")}</Label>
            <Input
              type="number"
              value={halfDays}
              onChange={(e) => setHalfDays(e.target.value)}
              min={0.5}
              step={0.5}
              className="mt-1 max-w-[120px]"
            />
          </div>

          {/* Difficulty */}
          <div>
            <Label className="text-sm font-medium mb-2 block">{t("logContribution.difficultyLabel")}</Label>
            <RadioGroup
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as Difficulty)}
              className="grid grid-cols-2 gap-2"
            >
              {DIFFICULTY_OPTIONS.map((d) => (
                <label
                  key={d.value}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                    difficulty === d.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <RadioGroupItem value={d.value} />
                  <div>
                    <span className="text-sm font-medium">{t(`logContribution.difficulty.${d.key}.label`)}</span>
                    <span className="text-xs text-muted-foreground ml-1">×{d.multiplier}</span>
                    <p className="text-[10px] text-muted-foreground">{t(`logContribution.difficulty.${d.key}.desc`)}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Deliverable URL */}
          <div>
            <Label className="text-sm font-medium">{t("logContribution.deliverableUrlLabel")}</Label>
            <Input
              value={deliverableUrl}
              onChange={(e) => setDeliverableUrl(e.target.value)}
              placeholder={t("logContribution.deliverableUrlPlaceholder")}
              className="mt-1"
            />
          </div>

          {/* Subtask link */}
          {subtasks.length > 0 && (
            <div>
              <Label className="text-sm font-medium">{t("logContribution.linkSubtaskLabel")}</Label>
              <Select value={subtaskId} onValueChange={setSubtaskId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("logContribution.selectSubtaskPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("logContribution.none")}</SelectItem>
                  {subtasks.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* FMV Display */}
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1 font-medium">{t("logContribution.estimatedFmv")}</p>
            <div className="flex items-center gap-1.5 text-sm">
              <span>{parsedHalfDays} {t("logContribution.hdSuffix")}</span>
              <span className="text-muted-foreground">×</span>
              <span>€{fmvRate}/{t("logContribution.hdSuffix")}</span>
              <span className="text-muted-foreground">×</span>
              <span>{multiplier}x</span>
              <span className="text-muted-foreground">=</span>
              <span className="font-bold text-primary">🟩 {fmvValue} Coins</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("logContribution.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {t("logContribution.submitForReview")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
