import { Shield } from "lucide-react";
import { GuildsTab } from "./tabs/ContentTabs";

export default function AdminCommunityGuilds() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" /> Guilds
      </h2>
      <GuildsTab />
    </div>
  );
}
