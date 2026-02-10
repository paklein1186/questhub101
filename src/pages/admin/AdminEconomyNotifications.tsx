import { Bell } from "lucide-react";
import { NotificationsMonitoringTab } from "./tabs/ContentTabs";

export default function AdminEconomyNotifications() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Bell className="h-6 w-6 text-primary" /> Notifications Monitoring
      </h2>
      <NotificationsMonitoringTab />
    </div>
  );
}
