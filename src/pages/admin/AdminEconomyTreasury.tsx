import { Building2 } from "lucide-react";
import { TreasuryDashboard } from "@/components/admin/TreasuryDashboard";

export default function AdminEconomyTreasury() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Building2 className="h-6 w-6 text-primary" /> Treasury & Revenue
      </h2>
      <TreasuryDashboard />
    </div>
  );
}
