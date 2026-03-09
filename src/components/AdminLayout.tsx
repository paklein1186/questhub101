import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, Users as UsersIcon, Shield, Compass, ShoppingBag, Sprout,
  Hash, CreditCard, MessageSquare, Star, ScrollText, Bell, Mail,
  Settings, Zap, Flag, Building2, LayoutDashboard, ChevronRight,
  Menu, X, ShieldAlert, ToggleLeft, Trophy, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserRoles } from "@/lib/admin";
import { AppNav } from "@/components/AppNav";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

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
      { to: "/admin/content/feature-suggestions", label: "Feature Ideas", icon: Zap },
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
      { to: "/admin/economy/treasury", label: "Treasury & Revenue", icon: Zap },
      { to: "/admin/economy/milestones", label: "Milestones", icon: Trophy },
      { to: "/admin/economy/agent-billing", label: "Agent Billing", icon: Bot },
      { to: "/admin/economy/ctg", label: "$CTG Token", icon: Sprout },
    ],
  },
  {
    label: "System",
    icon: Settings,
    superadminOnly: true,
    items: [
      { to: "/admin/system/super-mode", label: "Super Admin Mode", icon: ShieldAlert },
      { to: "/admin/system/email-templates", label: "Email Templates", icon: Mail },
      { to: "/admin/system/feature-toggles", label: "Feature Toggles", icon: ToggleLeft },
      { to: "/admin/system/roles", label: "Users & Roles", icon: UsersIcon },
      { to: "/admin/system/houses", label: "Topics & Territories", icon: Hash },
      { to: "/admin/system/stewardship", label: "Stewardship", icon: Shield },
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

      {/* Mobile top nav - horizontal scrollable chips */}
      <div className="lg:hidden sticky top-14 z-30 bg-card/95 backdrop-blur border-b border-border overflow-x-auto">
        <div className="flex items-center gap-1 px-2 py-2 min-w-max">
          {visibleClusters.map((cluster) => (
            <DropdownMenu key={cluster.label}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                    cluster.items.some((i) => isActive(i.to))
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <cluster.icon className="h-3.5 w-3.5" />
                  {cluster.label}
                  <ChevronRight className="h-3 w-3 rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {cluster.items.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link
                      to={item.to}
                      className={cn(
                        "cursor-pointer",
                        isActive(item.to) && "bg-primary/10 font-medium"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 mr-2" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </div>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-border bg-card/50 overflow-y-auto sticky top-14 h-[calc(100vh-3.5rem)]">
          {sidebar}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 overflow-x-auto">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
