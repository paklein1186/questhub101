import { Flag } from "lucide-react";
import { ModerationTab } from "./tabs/ContentTabs";

export default function AdminContentReports() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Flag className="h-6 w-6 text-primary" /> Reports & Moderation
      </h2>
      <ModerationTab />
    </div>
  );
}
