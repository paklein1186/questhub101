import { Hash } from "lucide-react";
import { HousesTerritoriesTab } from "./tabs/ContentTabs";

export default function AdminSystemHouses() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Hash className="h-6 w-6 text-primary" /> Houses & Territories
      </h2>
      <HousesTerritoriesTab />
    </div>
  );
}
