import { useState } from "react";
import { ShieldAlert, EyeOff, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AdminEntityEditor } from "@/components/AdminEntityEditor";
import { PlatformBroadcastDialog } from "@/components/PlatformBroadcastDialog";
import { BroadcastHistoryPanel } from "@/components/broadcast/BroadcastHistoryPanel";
import { CreditTransfersMonitor } from "@/components/admin/CreditTransfersMonitor";

export default function AdminSuperMode() {
  const [maskPII, setMaskPII] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl font-bold">Super Admin Mode</h2>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          {maskPII ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          <Label htmlFor="mask-pii" className="text-sm cursor-pointer">
            Mask personal identifiers
          </Label>
          <Switch id="mask-pii" checked={maskPII} onCheckedChange={setMaskPII} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground max-w-xl">
        Search and inspect any record. Edit visibility, ownership, and internal flags.
        Toggle PII masking for screen sharing or demos.
      </p>

      <PlatformBroadcastDialog />

      <BroadcastHistoryPanel />

      <AdminEntityEditor maskPII={maskPII} />

      <CreditTransfersMonitor />
    </div>
  );
}
