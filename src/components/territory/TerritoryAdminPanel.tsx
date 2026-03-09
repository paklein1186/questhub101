import { Settings } from "lucide-react";

interface Props {
  territoryId: string;
  territoryName: string;
  currentUserXpLevel: number;
  currentUserCtgBalance: number;
  isSuperAdmin?: boolean;
}

export function TerritoryAdminPanel({ territoryId, territoryName, isSuperAdmin }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="text-lg font-display font-semibold flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" /> Admin — {territoryName}
      </h2>
      <p className="text-sm text-muted-foreground">
        Territory administration panel. Manage stewards, configure portal settings, and monitor activity.
      </p>
      {isSuperAdmin && (
        <p className="text-xs text-primary">You have super-admin access to this territory.</p>
      )}
      {/* TODO: expand with territory admin features */}
    </div>
  );
}
