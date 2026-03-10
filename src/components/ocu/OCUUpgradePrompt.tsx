import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OCUUpgradePromptProps {
  onEnable?: () => void;
  canEnable?: boolean;
}

export function OCUUpgradePrompt({ onEnable, canEnable = false }: OCUUpgradePromptProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-display font-semibold text-lg">Open Contributive Unit (OCU)</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          OCU mode unlocks the full contributive accounting subsystem — contribution tracking,
          live value pie, peer-validated logs, contracts, and envelope distribution.
        </p>
      </div>
      <ul className="text-sm text-muted-foreground space-y-1 max-w-sm mx-auto text-left">
        <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary shrink-0" /> Contribution logging with peer validation</li>
        <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary shrink-0" /> Live value pie & weighted distribution</li>
        <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary shrink-0" /> Quest contracts & amendments</li>
        <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary shrink-0" /> Envelope budgeting & external spending</li>
      </ul>
      {canEnable && onEnable && (
        <Button onClick={onEnable} className="mt-2">
          <Lock className="h-4 w-4 mr-1" /> Enable OCU Mode
        </Button>
      )}
      {!canEnable && (
        <p className="text-xs text-muted-foreground">Only quest admins can enable this feature.</p>
      )}
    </div>
  );
}
