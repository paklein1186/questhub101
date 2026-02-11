import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, Users as UsersIcon, Shield, Compass, ShoppingBag,
  Hash, CreditCard, MessageSquare, Star, ScrollText, Bell, Mail,
  Settings, Zap, Flag, Building2, LayoutDashboard, ChevronRight,
  Menu, X, ShieldAlert, ToggleLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserRoles } from "@/lib/admin";
import { AppNav } from "@/components/AppNav";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

interface NavCluster {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  superadminOnly?: boolean;
}

const clusters: NavCluster[] = [
  {
    label: "Overview",
    icon: BarChart3,
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Community",
    icon: UsersIcon,
    items: [
      { to: "/admin/community/users", label: "Users", icon: UsersIcon },
      { to: "/admin/community/guilds", label: "Guilds", icon: Shield },
      { to: "/admin/community/pods", label: "Pods", icon: Hash },
      { to: "/admin/community/companies", label: "Trad. Organizations", icon: Building2 },
    ],
  },
  {
    label: "Content",
    icon: Compass,
    items: [
      { to: "/admin/content/quests", label: "Quests", icon: Compass },
      { to: "/admin/content/courses", label: "Courses", icon: ScrollText },
      { to: "/admin/content/services", label: "Services", icon: ShoppingBag },
      { to: "/admin/content/reports", label: "Reports & Moderation", icon: Flag },
    ],
  },
  {
    label: "Economy & Ops",
    icon: CreditCard,
    items: [
      { to: "/admin/economy/bookings", label: "Bookings & Sessions", icon: CreditCard },
      { to: "/admin/economy/payments", label: "Payments & Revenue", icon: Zap },
      { to: "/admin/economy/commissions", label: "Commission Rules", icon: CreditCard },
      { to: "/admin/economy/xp", label: "XP & Achievements", icon: Star },
      { to: "/admin/economy/plans", label: "Plans", icon: CreditCard },
      { to: "/admin/economy/notifications", label: "Notifications", icon: Bell },
      { to: "/admin/economy/emails", label: "Emails & Digests", icon: Mail },
    ],
  },
  {
    label: "System",
    icon: Settings,
    superadminOnly: true,
    items: [
      { to: "/admin/system/super-mode", label: "Super Admin Mode", icon: ShieldAlert },
      { to: "/admin/system/feature-toggles", label: "Feature Toggles", icon: ToggleLeft },
      { to: "/admin/system/roles", label: "Users & Roles", icon: UsersIcon },
      { to: "/admin/system/houses", label: "Houses & Territories", icon: Hash },
      { to: "/admin/system/governance", label: "Governance", icon: Star },
      { to: "/admin/system/audit", label: "Audit Logs", icon: ScrollText },
      { to: "/admin/system/integrations", label: "Integrations", icon: Settings },
    ],
  },
];

export default function AdminLayout() {
  const currentUser = useCurrentUser();
  const { isAdmin, isSuperAdmin } = useUserRoles(currentUser.id);
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const visibleClusters = clusters.filter(
    (c) => !c.superadminOnly || isSuperAdmin
  );

  const isActive = (to: string) => {
    if (to === "/admin") return pathname === "/admin";
    return pathname.startsWith(to);
  };

  const sidebar = (
    <nav className="flex flex-col gap-1 py-4 px-3">
      {visibleClusters.map((cluster) => (
        <div key={cluster.label} className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1">
            {cluster.label}
          </p>
          {cluster.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                isActive(item.to)
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-border bg-card/50 overflow-y-auto sticky top-14 h-[calc(100vh-3.5rem)]">
          {sidebar}
        </aside>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-14 bottom-0 z-50 w-64 bg-card border-r border-border overflow-y-auto lg:hidden">
              {sidebar}
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6 lg:p-8">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
