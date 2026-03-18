import { useState } from "react";
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
      const content = `
<h2>Collaboration Agreement</h2>
<h3>1. Scope</h3>
<p>${scope}</p>

<h3>2. Contribution Valuation</h3>
<p>Base rate: €${baseRate}/half-day. Difficulty multipliers: Standard (×1), Complex (×1.5), Expert (×2), Exceptional (×3).</p>
<p>External spending is deducted from the distribution envelope before pie calculation.</p>

<h3>3. Validation Protocol</h3>
<p>Mode: ${validationMode === "owner" ? "Quest owner validates all contributions." : validationMode === "peer" ? `Peer review with quorum of ${quorum} approval(s).` : "Owner validates contributions above €500 FMV. Peer review for smaller contributions."}</p>
<p>Contributions auto-verify after 14 days if no action is taken.</p>

<h3>4. Distribution Method</h3>
<p>${distributionMode === "proportional" ? "Proportional to Fair Market Value (pie share)." : distributionMode === "equal" ? "Equal split among all verified contributors." : "Manual allocation by quest admin."}</p>

<h3>5. Exit Terms</h3>
<ul>
  <li>Voluntary exit (good leaver): ${goodLeaverPct}% of FMV at exit</li>
  <li>Graceful withdrawal (with handover): ${gracefulPct}% of FMV at exit</li>
  <li>Removal for cause (bad leaver): ${badLeaverPct}% of FMV at exit</li>
</ul>
<p>Remaining pie is redistributed proportionally to continuing contributors.</p>

<h3>6. Dispute Resolution</h3>
<p>Disputes are resolved through the quest discussion thread. If unresolved after 7 days, a governance vote is triggered.</p>
      `.trim();

      // Create contract
      const { data: contract, error } = await supabase
        .from("quest_contracts" as any)
        .insert({
          quest_id: quest.id,
          title: `Collaboration Agreement — ${quest.title}`,
          content,
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
      toast({ title: "Agreement created!", description: "All participants have been invited to sign." });
      onOpenChange(false);
      setStep(1);
    } catch (e: any) {
      toast({ title: "Failed to create agreement", description: e.message, variant: "destructive" });
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
            Collaboration Agreement
          </DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps} — {["Scope", "Valuation", "Validation", "Distribution", "Exit Terms", "Review & Sign"][step - 1]}
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
              <Label className="text-sm font-medium mb-1 block">What is this quest about?</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Describe the work being done. This becomes the scope of the agreement.
              </p>
              <Textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Describe the quest scope..."
                rows={4}
              />
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>{activeParticipants.length} participant(s)</strong> will be invited to sign this agreement.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Valuation */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">Base rate per half-day: €{baseRate}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                This is the base value for a half-day of work. Difficulty multipliers adjust it.
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
              <p className="text-xs font-medium">Difficulty multipliers:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span>Standard</span><span className="font-medium">×1 = €{baseRate}</span></div>
                <div className="flex justify-between"><span>Complex</span><span className="font-medium">×1.5 = €{Math.round(baseRate * 1.5)}</span></div>
                <div className="flex justify-between"><span>Expert</span><span className="font-medium">×2 = €{baseRate * 2}</span></div>
                <div className="flex justify-between"><span>Exceptional</span><span className="font-medium">×3 = €{baseRate * 3}</span></div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Other contribution types (expenses, equipment, sales) are valued at their actual amount.
            </p>
          </div>
        )}

        {/* Step 3: Validation */}
        {step === 3 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Who validates contributions?</Label>
            <RadioGroup value={validationMode} onValueChange={setValidationMode} className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="owner" id="val-owner" className="mt-0.5" />
                <label htmlFor="val-owner" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">Owner validates</span>
                  <p className="text-xs text-muted-foreground">The quest owner (or co-hosts) approves each contribution. Simplest option.</p>
                </label>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="peer" id="val-peer" className="mt-0.5" />
                <label htmlFor="val-peer" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">Peer review</span>
                  <p className="text-xs text-muted-foreground">Contributors review each other. More democratic but requires active participation.</p>
                </label>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="mixed" id="val-mixed" className="mt-0.5" />
                <label htmlFor="val-mixed" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">Mixed</span>
                  <p className="text-xs text-muted-foreground">Owner for large contributions, peer review for smaller ones.</p>
                </label>
              </div>
            </RadioGroup>
            {validationMode === "peer" && (
              <div>
                <Label className="text-sm font-medium mb-1 block">Approvals needed: {quorum}</Label>
                <Slider value={[quorum]} min={1} max={Math.max(3, activeParticipants.length - 1)} step={1} onValueChange={([v]) => setQuorum(v)} className="max-w-xs" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              In all modes, contributions auto-verify after 14 days if no action is taken.
            </p>
          </div>
        )}

        {/* Step 4: Distribution */}
        {step === 4 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">How should resources be distributed?</Label>
            <RadioGroup value={distributionMode} onValueChange={setDistributionMode} className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="proportional" id="dist-prop" className="mt-0.5" />
                <label htmlFor="dist-prop" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">By pie share (recommended)</span>
                  <p className="text-xs text-muted-foreground">Each person receives a % proportional to their FMV contribution. Fairest for unequal work loads.</p>
                </label>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="equal" id="dist-equal" className="mt-0.5" />
                <label htmlFor="dist-equal" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">Equal split</span>
                  <p className="text-xs text-muted-foreground">Everyone gets the same share regardless of contribution amount.</p>
                </label>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="manual" id="dist-manual" className="mt-0.5" />
                <label htmlFor="dist-manual" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">Manual</span>
                  <p className="text-xs text-muted-foreground">Quest admin decides allocation manually when funds arrive.</p>
                </label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Step 5: Exit Terms */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Define what happens if someone leaves the quest. These percentages determine how much of their contribution value (FMV) they keep.
            </p>

            <div>
              <Label className="text-sm font-medium mb-1 block">Voluntary exit: {goodLeaverPct}%</Label>
              <p className="text-xs text-muted-foreground mb-2">Someone who chooses to leave.</p>
              <Slider value={[goodLeaverPct]} min={0} max={100} step={5} onValueChange={([v]) => setGoodLeaverPct(v)} className="max-w-xs" />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">Graceful withdrawal: {gracefulPct}%</Label>
              <p className="text-xs text-muted-foreground mb-2">Someone who leaves but hands over their work properly.</p>
              <Slider value={[gracefulPct]} min={0} max={100} step={5} onValueChange={([v]) => setGracefulPct(v)} className="max-w-xs" />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">Removal for cause: {badLeaverPct}%</Label>
              <p className="text-xs text-muted-foreground mb-2">Someone removed for misconduct.</p>
              <Slider value={[badLeaverPct]} min={0} max={100} step={5} onValueChange={([v]) => setBadLeaverPct(v)} className="max-w-xs" />
            </div>

            <div className="rounded-lg border border-border p-3 text-xs space-y-1">
              <p className="font-medium">Example: contributor with €3,000 FMV</p>
              <p>Voluntary exit → keeps €{(3000 * goodLeaverPct / 100).toLocaleString()}</p>
              <p>Graceful withdrawal → keeps €{(3000 * gracefulPct / 100).toLocaleString()}</p>
              <p>Removal for cause → keeps €{(3000 * badLeaverPct / 100).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Step 6: Review & Sign */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span className="font-medium">Agreement Summary</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Base rate</span>
                  <span className="font-medium">€{baseRate}/half-day</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Validation</span>
                  <span className="font-medium capitalize">{validationMode === "peer" ? `Peer review (${quorum} approvals)` : validationMode}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Distribution</span>
                  <span className="font-medium capitalize">{distributionMode === "proportional" ? "By pie share" : distributionMode}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Exit: voluntary</span>
                  <span className="font-medium">{goodLeaverPct}% of FMV</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Exit: graceful</span>
                  <span className="font-medium">{gracefulPct}% of FMV</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exit: removal</span>
                  <span className="font-medium">{badLeaverPct}% of FMV</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
              <p className="font-medium mb-1">Signatories ({activeParticipants.length}):</p>
              <div className="flex flex-wrap gap-1">
                {activeParticipants.map((p: any) => (
                  <Badge key={p.id} variant="secondary" className="text-[10px]">
                    {p.user?.name || "Participant"}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground mt-2">
                All participants will be invited to sign. The agreement becomes active when everyone has signed.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button size="sm" onClick={() => setStep(step + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create & Invite to Sign
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
