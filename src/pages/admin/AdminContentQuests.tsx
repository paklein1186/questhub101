import { Compass } from "lucide-react";
import { QuestsTab } from "./tabs/ContentTabs";

export default function AdminContentQuests() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Compass className="h-6 w-6 text-primary" /> Quests
      </h2>
      <QuestsTab />
    </div>
  );
}
