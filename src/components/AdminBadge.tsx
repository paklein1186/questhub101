import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isAdmin } from "@/lib/admin";

interface AdminBadgeProps {
  email?: string;
  className?: string;
}

/**
 * Renders a compact "Admin" badge if the given email belongs to an admin.
 * Shows nothing for non-admins.
 */
export function AdminBadge({ email, className }: AdminBadgeProps) {
  if (!email || !isAdmin(email)) return null;

  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 font-semibold border-primary/40 text-primary bg-primary/10 gap-0.5 ${className ?? ""}`}
    >
      <Shield className="h-2.5 w-2.5" />
      Admin
    </Badge>
  );
}
