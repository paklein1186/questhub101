import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronRight, ChevronLeft, FileText, Scale, CheckCircle, PieChart, DoorOpen, Loader2 } from "lucide-react";

interface ContractWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quest: any;
  participants: any[];
}

export function ContractWizard({ open, onOpenChange, quest, participants }: ContractWizardProps) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Scope
  const [scope, setScope] = useState(quest.description || "");

  // Step 2: Valuation
  const [baseRate, setBaseRate] = useState(200);
  const [difficulty, setDifficulty] = useState("standard");

  // Step 3: Validation
  const [validationMode, setValidationMode] = useState("owner");
  const [quorum, setQuorum] = useState(1);

  // Step 4: Distribution
  const [distributionMode, setDistributionMode] = useState("proportional");

  // Step 5: Exit Terms
  const [goodLeaverPct, setGoodLeaverPct] = useState(75);
  const [gracefulPct, setGracefulPct] = useState(100);
  const [badLeaverPct, setBadLeaverPct] = useState(0);

  const totalSteps = 6;
  const activeParticipants = (participants || []).filter((p: any) => p.status === "ACCEPTED");

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      // Build contract content
      const validationLine = validationMode === "owner"
        ? t("contractWizard.content.validationModeOwner")
        : validationMode === "peer"
        ? t("contractWizard.content.validationModePeer", { quorum })
        : t("contractWizard.content.validationModeMixed");
      const distributionLine = distributionMode === "proportional"
        ? t("contractWizard.content.distributionProportional")
        : distributionMode === "equal"
        ? t("contractWizard.content.distributionEqual")
        : t("contractWizard.content.distributionManual");

      const content = `
<h2>${t("contractWizard.content.heading")}</h2>
<h3>${t("contractWizard.content.scopeTitle")}</h3>
<p>${scope}</p>

<h3>${t("contractWizard.content.valuationTitle")}</h3>
<p>${t("contractWizard.content.baseRateLine", { rate: baseRate })}</p>
<p>${t("contractWizard.content.externalSpendingLine")}</p>

<h3>${t("contractWizard.content.validationTitle")}</h3>
<p>${validationLine}</p>
<p>${t("contractWizard.content.autoVerifyLine")}</p>

<h3>${t("contractWizard.content.distributionTitle")}</h3>
<p>${distributionLine}</p>

<h3>${t("contractWizard.content.exitTitle")}</h3>
<ul>
  <li>${t("contractWizard.content.exitVoluntaryItem", { pct: goodLeaverPct })}</li>
  <li>${t("contractWizard.content.exitGracefulItem", { pct: gracefulPct })}</li>
  <li>${t("contractWizard.content.exitRemovalItem", { pct: badLeaverPct })}</li>
</ul>
<p>${t("contractWizard.content.exitRedistributeLine")}</p>

<h3>${t("contractWizard.content.disputeTitle")}</h3>
<p>${t("contractWizard.content.disputeLine")}</p>
      `.trim();

      // Create contract
      const { data: contract, error } = await supabase
        .from("quest_contracts" as any)
        .insert({
          quest_id: quest.id,
          title: t("contractWizard.content.title", { questName: quest.title }),
          content: { html: content },
          status: "pending_signatures",
          created_by: currentUser.id,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // Add all active participants as signatories
      const signatories = activeParticipants.map((p: any) => ({
        contract_id: (contract as any).id,
        user_id: p.user_id,
      }));

      if (signatories.length > 0) {
        await supabase.from("contract_signatories" as any).insert(signatories as any);
      }

      // Update quest features config with validation settings
      const { data: questData } = await supabase
        .from("quests")
        .select("features_config")
        .eq("id", quest.id)
        .maybeSingle();

      const currentConfig = (questData?.features_config as any) || {};
      await supabase.from("quests").update({
        features_config: {
          ...currentConfig,
          ocu: {
            ...(currentConfig.ocu || {}),
            review_quorum: validationMode === "peer" ? quorum : 1,
            validation_mode: validationMode,
            distribution_mode: distributionMode,
          },
        },
        ocu_enabled: true,
      } as any).eq("id", quest.id);

      qc.invalidateQueries({ queryKey: ["quest", quest.id] });
      qc.invalidateQueries({ queryKey: ["quest-contracts", quest.id] });
      toast({ title: t("contractWizard.toast.created"), description: t("contractWizard.toast.createdDesc") });
      onOpenChange(false);
      setStep(1);
    } catch (e: any) {
      toast({ title: t("contractWizard.toast.failed"), description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("contractWizard.dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("contractWizard.stepLabel", {
              step,
              total: totalSteps,
              name: [
                t("contractWizard.stepNames.scope"),
                t("contractWizard.stepNames.valuation"),
                t("contractWizard.stepNames.validation"),
                t("contractWizard.stepNames.distribution"),
                t("contractWizard.stepNames.exitTerms"),
                t("contractWizard.stepNames.reviewAndSign"),
              ][step - 1],
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Step 1: Scope */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">{t("contractWizard.step1.question")}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("contractWizard.step1.hint")}
              </p>
              <Textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder={t("contractWizard.step1.placeholder")}
                rows={4}
              />
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>{t("contractWizard.step1.participantsBold", { count: activeParticipants.length })}</strong> {t("contractWizard.step1.willBeInvited")}
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Valuation */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">{t("contractWizard.step2.baseRateLabel", { rate: baseRate })}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("contractWizard.step2.hint")}
              </p>
              <Slider
                value={[baseRate]}
                min={50}
                max={500}
                step={25}
                onValueChange={([v]) => setBaseRate(v)}
                className="max-w-xs"
              />
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium">{t("contractWizard.step2.multipliersTitle")}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span>{t("contractWizard.step2.standard")}</span><span className="font-medium">×1 = €{baseRate}</span></div>
                <div className="flex justify-between"><span>{t("contractWizard.step2.complex")}</span><span className="font-medium">×1.5 = €{Math.round(baseRate * 1.5)}</span></div>
                <div className="flex justify-between"><span>{t("contractWizard.step2.expert")}</span><span className="font-medium">×2 = €{baseRate * 2}</span></div>
                <div className="flex justify-between"><span>{t("contractWizard.step2.exceptional")}</span><span className="font-medium">×3 = €{baseRate * 3}</span></div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("contractWizard.step2.otherTypesNote")}
            </p>
          </div>
        )}

        {/* Step 3: Validation */}
        {step === 3 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">{t("contractWizard.step3.question")}</Label>
            <RadioGroup value={validationMode} onValueChange={setValidationMode} className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="owner" id="val-owner" className="mt-0.5" />
                <label htmlFor="val-owner" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">{t("contractWizard.step3.ownerTitle")}</span>
                  <p className="text-xs text-muted-foreground">{t("contractWizard.step3.ownerDesc")}</p>
                </label>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="peer" id="val-peer" className="mt-0.5" />
                <label htmlFor="val-peer" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">{t("contractWizard.step3.peerTitle")}</span>
                  <p className="text-xs text-muted-foreground">{t("contractWizard.step3.peerDesc")}</p>
                </label>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="mixed" id="val-mixed" className="mt-0.5" />
                <label htmlFor="val-mixed" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">{t("contractWizard.step3.mixedTitle")}</span>
                  <p className="text-xs text-muted-foreground">{t("contractWizard.step3.mixedDesc")}</p>
                </label>
              </div>
            </RadioGroup>
            {validationMode === "peer" && (
              <div>
                <Label className="text-sm font-medium mb-1 block">{t("contractWizard.step3.approvalsNeeded", { quorum })}</Label>
                <Slider value={[quorum]} min={1} max={Math.max(3, activeParticipants.length - 1)} step={1} onValueChange={([v]) => setQuorum(v)} className="max-w-xs" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("contractWizard.step3.autoVerifyNote")}
            </p>
          </div>
        )}

        {/* Step 4: Distribution */}
        {step === 4 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">{t("contractWizard.step4.question")}</Label>
            <RadioGroup value={distributionMode} onValueChange={setDistributionMode} className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="proportional" id="dist-prop" className="mt-0.5" />
                <label htmlFor="dist-prop" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">{t("contractWizard.step4.proportionalTitle")}</span>
                  <p className="text-xs text-muted-foreground">{t("contractWizard.step4.proportionalDesc")}</p>
                </label>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="equal" id="dist-equal" className="mt-0.5" />
                <label htmlFor="dist-equal" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">{t("contractWizard.step4.equalTitle")}</span>
                  <p className="text-xs text-muted-foreground">{t("contractWizard.step4.equalDesc")}</p>
                </label>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="manual" id="dist-manual" className="mt-0.5" />
                <label htmlFor="dist-manual" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">{t("contractWizard.step4.manualTitle")}</span>
                  <p className="text-xs text-muted-foreground">{t("contractWizard.step4.manualDesc")}</p>
                </label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Step 5: Exit Terms */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {t("contractWizard.step5.intro")}
            </p>

            <div>
              <Label className="text-sm font-medium mb-1 block">{t("contractWizard.step5.voluntaryLabel", { pct: goodLeaverPct })}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t("contractWizard.step5.voluntaryDesc")}</p>
              <Slider value={[goodLeaverPct]} min={0} max={100} step={5} onValueChange={([v]) => setGoodLeaverPct(v)} className="max-w-xs" />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">{t("contractWizard.step5.gracefulLabel", { pct: gracefulPct })}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t("contractWizard.step5.gracefulDesc")}</p>
              <Slider value={[gracefulPct]} min={0} max={100} step={5} onValueChange={([v]) => setGracefulPct(v)} className="max-w-xs" />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">{t("contractWizard.step5.removalLabel", { pct: badLeaverPct })}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t("contractWizard.step5.removalDesc")}</p>
              <Slider value={[badLeaverPct]} min={0} max={100} step={5} onValueChange={([v]) => setBadLeaverPct(v)} className="max-w-xs" />
            </div>

            <div className="rounded-lg border border-border p-3 text-xs space-y-1">
              <p className="font-medium">{t("contractWizard.step5.exampleTitle")}</p>
              <p>{t("contractWizard.step5.exampleVoluntary", { amount: (3000 * goodLeaverPct / 100).toLocaleString() })}</p>
              <p>{t("contractWizard.step5.exampleGraceful", { amount: (3000 * gracefulPct / 100).toLocaleString() })}</p>
              <p>{t("contractWizard.step5.exampleRemoval", { amount: (3000 * badLeaverPct / 100).toLocaleString() })}</p>
            </div>
          </div>
        )}

        {/* Step 6: Review & Sign */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span className="font-medium">{t("contractWizard.step6.summaryTitle")}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">{t("contractWizard.step6.baseRate")}</span>
                  <span className="font-medium">{t("contractWizard.step6.baseRateValue", { rate: baseRate })}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">{t("contractWizard.step6.validation")}</span>
                  <span className="font-medium capitalize">{validationMode === "peer" ? t("contractWizard.step6.validationPeer", { quorum }) : validationMode}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">{t("contractWizard.step6.distribution")}</span>
                  <span className="font-medium capitalize">{distributionMode === "proportional" ? t("contractWizard.step6.distributionProportional") : distributionMode}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">{t("contractWizard.step6.exitVoluntary")}</span>
                  <span className="font-medium">{t("contractWizard.step6.ofFmv", { pct: goodLeaverPct })}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">{t("contractWizard.step6.exitGraceful")}</span>
                  <span className="font-medium">{t("contractWizard.step6.ofFmv", { pct: gracefulPct })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("contractWizard.step6.exitRemoval")}</span>
                  <span className="font-medium">{t("contractWizard.step6.ofFmv", { pct: badLeaverPct })}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
              <p className="font-medium mb-1">{t("contractWizard.step6.signatoriesTitle", { count: activeParticipants.length })}</p>
              <div className="flex flex-wrap gap-1">
                {activeParticipants.map((p: any) => (
                  <Badge key={p.id} variant="secondary" className="text-[10px]">
                    {p.user?.name || t("contractWizard.step6.participantFallback")}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground mt-2">
                {t("contractWizard.step6.allInvited")}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {t("contractWizard.back")}
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button size="sm" onClick={() => setStep(step + 1)}>
              {t("contractWizard.next")} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("contractWizard.createAndInvite")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
