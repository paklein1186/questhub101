import { Star } from "lucide-react";
import { GovernanceTab } from "./tabs/ContentTabs";

export default function AdminSystemGovernance() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Star className="h-6 w-6 text-primary" /> Governance & Featured Content
      </h2>
      <GovernanceTab />
    </div>
  );
}
