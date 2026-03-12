import { useState } from "react";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface XpSpendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canAfford: boolean;
  /** Credit cost for the action */
  xpCost: number;
  /** Current user Credits */
  userXp: number;
  actionLabel: string;
  limitLabel: string;
  onConfirm: () => void | Promise<void>;
  /** User's $CTG balance (optional — enables exchange path) */
  ctgBalance?: number;
}

export function XpSpendDialog({
  open, onOpenChange, canAfford, xpCost, userXp, actionLabel, limitLabel, onConfirm, ctgBalance,
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
              ? <><CurrencyIcon currency="credits" className="h-5 w-5" /> Spend Credits to continue</>
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
                Spend <span className="font-bold text-primary">{xpCost} Credits</span> to {actionLabel}?
              </p>
              <p className="text-xs text-muted-foreground">
                Your balance: <span className="font-semibold">{userXp} Credits</span> → <span className="font-semibold">{userXp - xpCost} Credits</span>
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={confirming}>
                <CurrencyIcon currency="credits" className="h-4 w-4 mr-1" /> {confirming ? "Spending…" : `Spend ${xpCost} Credits`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need <span className="font-semibold text-primary">{xpCost} Credits</span> to {actionLabel}, but you only have <span className="font-semibold">{userXp} Credits</span>.
            </p>

            {/* CTG exchange path */}
            {ctgBalance && ctgBalance > 0 ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                   <CurrencyIcon currency="ctg" className="h-4 w-4" />
                   <p className="text-sm font-medium">
                    You have {ctgBalance.toLocaleString()} $CTG
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exchange your contribution earnings for Credits — no payment needed.
                </p>
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <Link to="/me/credits">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Exchange $CTG for Credits
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3">
                💡 Tip: Complete quests and subtasks to earn 🌱 $CTG,
                which you can exchange for Credits without paying €.
              </p>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" asChild>
                <Link to="/plans">See plans <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
              <Button asChild>
                <Link to="/me/credits"><CurrencyIcon currency="credits" className="h-4 w-4 mr-1" /> Buy Credits</Link>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
