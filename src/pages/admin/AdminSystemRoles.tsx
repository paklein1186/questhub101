import { Users } from "lucide-react";
import { UsersRolesTab } from "./tabs/ContentTabs";

export default function AdminSystemRoles() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" /> Users & Roles
      </h2>
      <UsersRolesTab />
    </div>
  );
}
