import { useState } from "react";
import { Zap, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface XpSpendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Can the user afford this? */
  canAfford: boolean;
  /** XP cost for the action */
  xpCost: number;
  /** Current user XP */
  userXp: number;
  /** Human-readable action name, e.g. "create an extra quest" */
  actionLabel: string;
  /** Limit description, e.g. "free quests for this week" */
  limitLabel: string;
  /** Called when user confirms spending XP */
  onConfirm: () => void | Promise<void>;
}

export function XpSpendDialog({
  open, onOpenChange, canAfford, xpCost, userXp, actionLabel, limitLabel, onConfirm,
}: XpSpendDialogProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {canAfford
              ? <><Zap className="h-5 w-5 text-primary" /> Spend XP to continue</>
              : <><AlertTriangle className="h-5 w-5 text-warning" /> Limit reached</>}
          </DialogTitle>
          <DialogDescription>
            You've used all your {limitLabel}.
          </DialogDescription>
        </DialogHeader>

        {canAfford ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Spend <span className="font-bold text-primary">{xpCost} XP</span> to {actionLabel}?
              </p>
              <p className="text-xs text-muted-foreground">
                Your balance: <span className="font-semibold">{userXp} XP</span> → <span className="font-semibold">{userXp - xpCost} XP</span>
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={confirming}>
                <Zap className="h-4 w-4 mr-1" /> {confirming ? "Spending…" : `Spend ${xpCost} XP`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need <span className="font-semibold text-primary">{xpCost} XP</span> to {actionLabel}, but you only have <span className="font-semibold">{userXp} XP</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Buy XP bundles or upgrade your plan to unlock more actions.
            </p>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" asChild>
                <Link to="/plans">See plans <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
              <Button asChild>
                <Link to="/me/xp"><Zap className="h-4 w-4 mr-1" /> Buy XP bundles</Link>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
