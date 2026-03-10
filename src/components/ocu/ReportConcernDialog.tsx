import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  distributionId: string;
  questId: string;
  questTitle: string;
  distributionDate: string;
}

export function ReportConcernDialog({
  open, onOpenChange, distributionId, questId, questTitle, distributionDate,
}: Props) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState("low");
  const [currency, setCurrency] = useState("both");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (reason.trim().length < 30) {
      toast({ title: "Please describe your concern in at least 30 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // 1. Insert report
    await supabase.from("distribution_unfairness_reports" as any).insert({
      distribution_id: distributionId,
      quest_id: questId,
      reporter_user_id: currentUser.id,
      reason: reason.trim(),
      severity,
      currency,
      status: "open",
    });

    // 2. Flag the distribution
    await supabase.from("quest_distributions" as any)
      .update({ flagged: true })
      .eq("id", distributionId);

    // 3. Notify superadmins
    const { data: superadmins } = await supabase
      .from("user_roles" as any)
      .select("user_id")
      .eq("role", "superadmin");

    for (const sa of (superadmins ?? []) as any[]) {
      await supabase.from("notifications" as any).insert({
        user_id: sa.user_id,
        type: "distribution_concern",
        title: `Distribution concern: Quest "${questTitle}" — ${severity} — ${new Date(distributionDate).toLocaleDateString()}`,
        link: `/admin/economy/distribution-concerns`,
        entity_type: "quest",
        entity_id: questId,
      });
    }

    toast({ title: "Concern submitted", description: "Your report has been sent confidentially to platform admins." });
    setSubmitting(false);
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>⚠️ Report a Distribution Concern</DialogTitle>
          <DialogDescription>
            Quest: {questTitle} — Distribution: {new Date(distributionDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Describe your concern *</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What seems unfair about this distribution? (min 30 characters)"
              rows={4}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{reason.length}/30 min characters</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Severity</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Currency affected</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coins">🟩 Coins</SelectItem>
                  <SelectItem value="ctg">🌱 $CTG</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
            Your report is confidential. Quest admins will not see the content of your report, only that a concern was raised on this distribution.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || reason.trim().length < 30}>
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Submit privately to platform admins
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
