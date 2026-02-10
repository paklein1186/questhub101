import { ScrollText } from "lucide-react";
import { AuditLogsTab } from "./tabs/ContentTabs";

export default function AdminSystemAudit() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-primary" /> Audit Logs
      </h2>
      <AuditLogsTab />
    </div>
  );
}
