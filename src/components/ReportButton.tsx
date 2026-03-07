import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReportTargetType } from "@/types/enums";

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  variant?: "sm" | "inline";
}

export function ReportButton({ targetType, targetId, variant = "sm" }: ReportButtonProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (!reason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUser.id,
      target_type: targetType,
      target_id: targetId,
      reason: reason.trim(),
      status: "OPEN",
    });
    if (error) { toast({ title: "Failed to submit report", variant: "destructive" }); return; }
    setReason("");
    setOpen(false);
    toast({ title: "Report submitted", description: "An admin will review it shortly." });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "inline" ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-destructive">
            <Flag className="h-3 w-3 mr-1" />Report
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="text-muted-foreground hover:text-destructive hover:border-destructive">
            <Flag className="h-4 w-4 mr-1" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType.toLowerCase().replace(/_/g, " ")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Please describe why you're reporting this content. An admin will review your report.
          </p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue…" className="min-h-[100px] resize-none" maxLength={500} />
          <Button onClick={submit} disabled={!reason.trim()} className="w-full">
            <Flag className="h-4 w-4 mr-1" /> Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
