import { Shield, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserRoles } from "@/lib/admin";

interface AdminBadgeProps {
  /** Pass the user's auth uid (not email) */
  userId?: string;
  /** @deprecated — use userId instead */
  email?: string;
  className?: string;
}

/**
 * Renders a "Superadmin" or "Admin" badge based on the user's DB roles.
 * Shows nothing for non-admins.
 */
export function AdminBadge({ userId, className }: AdminBadgeProps) {
  const { isAdmin, isSuperAdmin } = useUserRoles(userId);

  if (!isAdmin) return null;

  if (isSuperAdmin) {
    return (
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 font-semibold border-amber-500/40 text-amber-600 bg-amber-500/10 gap-0.5 ${className ?? ""}`}
      >
        <Crown className="h-2.5 w-2.5" />
        Superadmin
      </Badge>
    );
  }

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
