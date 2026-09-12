/**
 * TerritoryUnlockModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-step modal for "unlocking" (pioneering) a territory that has no steward yet.
 *
 * Steps:
 *  1. Welcome — explain what pioneering means (XP requirements check)
 *  2. Customize — set territory description, cover images, tags
 *  3. Commitment — territorial stewardship pledge + confirm
 *  4. Success — earn Pioneer badge, redirect to portal
 *
 * Checks:
 *  - User must be XP level ≥ 3 (Seedling) to pioneer a Town
 *  - Level ≥ 5 (Sprout) for Region
 *  - Level ≥ 7 (Pollinator) for National / Continent
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sprout, Star, Shield, TreePine, Zap,
  CheckCircle2, ArrowRight, ChevronLeft, AlertCircle, Globe,
} from "lucide-react";

/* ── XP requirements per level ── */
const UNLOCK_REQUIREMENTS: Record<string, { minXpLevel: number }> = {
  TOWN:      { minXpLevel: 1 },
  LOCALITY:  { minXpLevel: 1 },
  PROVINCE:  { minXpLevel: 1 },
  REGION:    { minXpLevel: 1 },
  NATIONAL:  { minXpLevel: 1 },
  CONTINENT: { minXpLevel: 1 },
  GLOBAL:    { minXpLevel: 1 },
};

/* ── Types ── */
interface TerritoryUnlockModalProps {
  open: boolean;
  onClose: () => void;
  territory: {
    id: string;
    name: string;
    level: string;
    slug?: string | null;
  };
  currentUserXpLevel: number;
  currentUserId: string;
}

/* ── Mutation ── */
function useUnlockTerritory() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      territoryId,
      userId,
      summary,
      imageUrls,
      tags,
    }: {
      territoryId: string;
      userId: string;
      summary: string;
      imageUrls: string[];
      tags: string[];
    }) => {
      // Pre-flight: check if stewardship edge already exists
      const { data: existing } = await (supabase.from("trust_edges") as any)
        .select("id")
        .eq("from_node_id", userId)
        .eq("to_node_id", territoryId)
        .eq("edge_type", "stewardship")
        .maybeSingle();
      if (existing) throw new Error(t("unlockModal.toast.alreadySteward"));

      // 1. Update territory with summary and meta
      const { error: terrErr } = await supabase
        .from("territories")
        .update({
          summary,
          stats: { images: imageUrls, tags },
          updated_at: new Date().toISOString(),
        })
        .eq("id", territoryId);
      if (terrErr) throw terrErr;

      // 2. Upsert pioneer steward edge (safe against race conditions)
      await (supabase.from("trust_edges") as any).insert({
        from_node_id: userId,
        from_node_type: "profile",
        to_node_id: territoryId,
        to_node_type: "territory",
        edge_type: "stewardship",
        score: 5,
        tags: ["pioneer"],
        status: "active",
        created_by: userId,
      } as any);

      // 3. Set territory as user's primary territory
      await supabase
        .from("profiles")
        .update({ territory_id: territoryId } as any)
        .eq("user_id", userId);

      // 4. Award XP for pioneering
      await (supabase.from("xp_events" as any) as any).insert({
        user_id: userId,
        event_type: "TERRITORY_PIONEER",
        xp_amount: 50,
        related_entity_id: territoryId,
        related_entity_type: "territory",
        description: `Pioneered territory: ${territoryId}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["territory-detail"] });
      qc.invalidateQueries({ queryKey: ["territory-member-count"] });
      qc.invalidateQueries({ queryKey: ["territory-portal-stewards"] });
      qc.invalidateQueries({ queryKey: ["territory-portal-grid"] });
      qc.invalidateQueries({ queryKey: ["territory-is-admin"] });
      qc.invalidateQueries({ queryKey: ["territory-stewards"] });
      toast({ title: t("unlockModal.toast.unlocked"), description: t("unlockModal.toast.unlockedDesc") });
    },
    onError: (e: any) => {
      toast({ title: t("unlockModal.toast.failed"), description: e.message, variant: "destructive" });
    },
  });
}

/* ── Step indicator ── */
function StepDot({ active, done, num }: { active: boolean; done: boolean; num: number }) {
  return (
    <div
      className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
        done
          ? "bg-primary border-primary text-primary-foreground"
          : active
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-background border-border text-muted-foreground"
      )}
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : num}
    </div>
  );
}

/* ── Main component ── */
export function TerritoryUnlockModal({
  open,
  onClose,
  territory,
  currentUserXpLevel,
  currentUserId,
}: TerritoryUnlockModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [summary, setSummary] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [pledgeChecked, setPledgeChecked] = useState(false);

  const req = UNLOCK_REQUIREMENTS[territory.level?.toUpperCase()] ?? UNLOCK_REQUIREMENTS["TOWN"];
  const canUnlock = currentUserXpLevel >= req.minXpLevel;

  const unlockMutation = useUnlockTerritory();

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      setImageUrls(prev => [...prev, imageUrl.trim()]);
      setImageUrl("");
    }
  };

  const handleUnlock = async () => {
    await unlockMutation.mutateAsync({
      territoryId: territory.id,
      userId: currentUserId,
      summary,
      imageUrls,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setStep(4);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-amber-500" />
            {t("unlockModal.dialogTitle", { name: territory.name })}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        {step < 4 && (
          <div className="flex items-center gap-2 py-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-2">
                <StepDot num={n} active={step === n} done={step > n} />
                {n < 3 && <div className={cn("h-0.5 w-8 rounded-full", step > n ? "bg-primary" : "bg-border")} />}
              </div>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">{t("unlockModal.stepOf", { step })}</span>
          </div>
        )}

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <p className="text-sm font-semibold text-foreground">{t("unlockModal.step1.whatIsPioneering")}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("unlockModal.step1.introPart1")}<strong>{territory.name}</strong>{t("unlockModal.step1.introPart2")}
              </p>
              <ul className="space-y-1.5">
                {(t("unlockModal.step1.benefits", { returnObjects: true }) as string[]).map(item => (
                  <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* XP check */}
            <div className={cn(
              "rounded-xl border p-4 flex items-center gap-3",
              canUnlock
                ? "border-primary/30 bg-primary/5"
                : "border-destructive/30 bg-destructive/5"
            )}>
              <div className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                canUnlock ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
              )}>
                {canUnlock ? <Shield className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {canUnlock ? t("unlockModal.step1.meetsRequirements") : t("unlockModal.step1.levelNotMet")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("unlockModal.step1.requiresLevel", { req: t("unlockModal.requirementAny"), level: currentUserXpLevel })}
                </p>
              </div>
              {canUnlock && (
                <Badge className="ml-auto bg-primary/15 text-primary border-primary/30">
                  {t("unlockModal.step1.eligible")}
                </Badge>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>{t("unlockModal.step1.cancel")}</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canUnlock}
                className="gap-1.5"
              >
                {t("unlockModal.step1.continue")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Customize ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("unlockModal.step2.giveVoice", { name: territory.name })}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="ter-summary" className="text-xs font-medium">
                {t("unlockModal.step2.descriptionLabel")} <span className="text-muted-foreground">{t("unlockModal.step2.optional")}</span>
              </Label>
              <Textarea
                id="ter-summary"
                placeholder={t("unlockModal.step2.descPlaceholder", { name: territory.name })}
                value={summary}
                onChange={e => setSummary(e.target.value)}
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t("unlockModal.step2.coverImagesLabel")} <span className="text-muted-foreground">{t("unlockModal.step2.coverImagesHint")}</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t("unlockModal.step2.urlPlaceholder")}
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="text-sm"
                  onKeyDown={e => e.key === "Enter" && handleAddImage()}
                />
                <Button size="sm" variant="outline" onClick={handleAddImage}>{t("unlockModal.step2.add")}</Button>
              </div>
              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageUrls.map((url, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground"
                    >
                      <span className="truncate max-w-[140px]">{url.split("/").pop()}</span>
                      <button
                        onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ter-tags" className="text-xs font-medium">
                {t("unlockModal.step2.tagsLabel")} <span className="text-muted-foreground">{t("unlockModal.step2.tagsHint")}</span>
              </Label>
              <Input
                id="ter-tags"
                placeholder={t("unlockModal.step2.tagsPlaceholder")}
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
                <ChevronLeft className="h-3.5 w-3.5" /> {t("unlockModal.step2.back")}
              </Button>
              <Button onClick={() => setStep(3)} className="gap-1.5">
                {t("unlockModal.step2.continue")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Pledge ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">{t("unlockModal.step3.pledgeTitle")}</p>
              </div>
              <ul className="space-y-2">
                {(t("unlockModal.pledgeLines", { returnObjects: true }) as string[]).map(line => (
                  <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Sprout className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={pledgeChecked}
                onChange={e => setPledgeChecked(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {t("unlockModal.step3.acceptPledgePart1")}<strong>{territory.name}</strong>{t("unlockModal.step3.acceptPledgePart2")}
              </span>
            </label>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5">
                <ChevronLeft className="h-3.5 w-3.5" /> {t("unlockModal.step3.back")}
              </Button>
              <Button
                onClick={handleUnlock}
                disabled={!pledgeChecked || unlockMutation.isPending}
                className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              >
                {unlockMutation.isPending ? (
                  t("unlockModal.step3.unlocking")
                ) : (
                  <>
                    <Star className="h-3.5 w-3.5 fill-white" /> {t("unlockModal.step3.pioneerThisTerritory")}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="text-center py-6 space-y-5">
            <div className="h-20 w-20 rounded-full bg-primary/15 border-4 border-primary/30 flex items-center justify-center mx-auto">
              <TreePine className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-foreground">
                {t("unlockModal.step4.alive", { name: territory.name })}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t("unlockModal.step4.foundingSteward")}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t("unlockModal.step4.xpEarned")}</span>
              <Badge className="bg-amber-500 text-white text-[10px] border-0">{t("unlockModal.step4.pioneerBadge")}</Badge>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                onClick={() => {
                  onClose();
                  navigate(`/territories/${territory.slug ?? territory.id}?tab=admin`);
                }}
                className="gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" /> {t("unlockModal.step4.openAdminPanel")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  setStep(1);
                }}
              >
                {t("unlockModal.step4.backToPortal")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
