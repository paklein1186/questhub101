/**
 * AnalyticsTab — extracted from AdminDashboard.tsx
 * Shows platform KPIs, XP stats, subscriptions, courses, marketplace, and activity.
 */
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart3, Users as UsersIcon, Shield, Compass, Hash, ShoppingBag,
  CreditCard, MessageSquare, Zap, ScrollText, TrendingUp, MapPin, AlertTriangle,
} from "lucide-react";
import { useAdminStats } from "@/hooks/useAdminStats";
import {
  quests as allQuests, guilds as allGuilds, pods as allPods,
  services as allServices, bookings as allBookings, comments as allComments,
  topics as allTopics, territories as allTerritories,
  questTopics, questTerritories, userTopics, userTerritories,
} from "@/data/mock";
import { reports as allReports, courses, courseEnrollments, coursePurchases } from "@/data/mock";
import { PaymentStatus } from "@/types/enums";

export function AnalyticsTab() {
  const { data: realStats, isLoading: loadingReal } = useAdminStats();

  const totalQuests = allQuests.length;
  const totalGuilds = allGuilds.length;
  const totalPods = allPods.length;
  const totalBookings = allBookings.length;
  const totalServices = allServices.length;
  const totalComments = allComments.length;

  const publishedCourses = (courses ?? []).filter((c: any) => c.isPublished).length;
  const totalEnrollments = (courseEnrollments ?? []).length;
  const completedEnrollments = (courseEnrollments ?? []).filter((e: any) => e.completionDate).length;
  const paidCourses = (courses ?? []).filter((c: any) => !c.isFree && c.isPublished).length;
  const courseRevenue = (coursePurchases ?? []).filter((p: any) => p.status === "PAID").reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);

  const totalRevenue = allBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const paidBookings = allBookings.filter((b) => b.paymentStatus === PaymentStatus.PAID || (b.amount && b.amount > 0)).length;

  const weeklyActivity = [
    { week: "W1", users: 1, quests: 0, bookings: 0, comments: 1 },
    { week: "W2", users: 0, quests: 1, bookings: 0, comments: 2 },
    { week: "W3", users: 1, quests: 1, bookings: 1, comments: 1 },
    { week: "W4", users: 0, quests: 2, bookings: 0, comments: 3 },
    { week: "W5", users: 1, quests: 0, bookings: 1, comments: 2 },
    { week: "W6", users: 1, quests: 1, bookings: 0, comments: 1 },
    { week: "W7", users: 0, quests: 1, bookings: 0, comments: 2 },
    { week: "W8", users: 0, quests: 0, bookings: 0, comments: 1 },
  ];

  const topicStats = allTopics.map((topic) => {
    const qCount = questTopics.filter((qt) => qt.topicId === topic.id).length;
    const uCount = userTopics.filter((ut) => ut.topicId === topic.id).length;
    return { topic, quests: qCount, users: uCount };
  }).filter((t) => t.quests > 0 || t.users > 0).sort((a, b) => b.quests - a.quests).slice(0, 10);

  const territoryStats = allTerritories.map((territory) => {
    const qCount = questTerritories.filter((qt) => qt.territoryId === territory.id).length;
    const uCount = userTerritories.filter((ut) => ut.territoryId === territory.id).length;
    return { territory, quests: qCount, users: uCount };
  }).filter((t) => t.quests > 0 || t.users > 0).sort((a, b) => b.quests - a.quests);

  const MockLabel = () => (
    <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">MOCK</Badge>
  );

  const RealLabel = () => (
    <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 text-green-600 border-green-400 bg-green-50 dark:bg-green-900/20 dark:text-green-400">LIVE</Badge>
  );

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Data sources</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              <span className="inline-flex items-center gap-1"><RealLabel /> = live database</span>{" · "}
              <span className="inline-flex items-center gap-1"><MockLabel /> = sample data</span>
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><BarChart3 className="h-5 w-5" /> Platform Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Users</span>
              <RealLabel />
            </div>
            <p className="text-2xl font-bold text-primary">{loadingReal ? "…" : realStats?.totalUsers ?? 0}</p>
            {!loadingReal && realStats && (
              <p className="text-[10px] text-muted-foreground mt-0.5">+{realStats.recentUsers7d} (7d) · +{realStats.recentUsers30d} (30d)</p>
            )}
          </div>
          {[
            { label: "Total Quests", value: totalQuests, icon: Compass },
            { label: "Total Guilds", value: totalGuilds, icon: Shield },
            { label: "Total Pods", value: totalPods, icon: Hash },
            { label: "Total Services", value: totalServices, icon: ShoppingBag },
            { label: "Total Bookings", value: totalBookings, icon: CreditCard },
            { label: "Total Comments", value: totalComments, icon: MessageSquare },
            { label: "Published Courses", value: publishedCourses, icon: ScrollText },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <MockLabel />
              </div>
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Zap className="h-5 w-5" /> XP & Engagement <RealLabel /></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total XP Awarded", value: realStats?.totalXpAwarded ?? 0 },
            { label: "Total XP Spent", value: realStats?.totalXpSpent ?? 0 },
            { label: "XP Awarded (7d)", value: realStats?.xpLast7d ?? 0 },
            { label: "XP Awarded (30d)", value: realStats?.xpLast30d ?? 0 },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-green-200 dark:border-green-800 bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-primary">{loadingReal ? "…" : s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><CreditCard className="h-5 w-5" /> Subscriptions <RealLabel /></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-card p-4">
            <p className="text-xs text-muted-foreground">Active Subscriptions</p>
            <p className="text-2xl font-bold text-primary">{loadingReal ? "…" : realStats?.totalActiveSubscriptions ?? 0}</p>
          </div>
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-card p-4">
            <p className="text-xs text-muted-foreground">Avg XP / User</p>
            <p className="text-2xl font-bold text-primary">{loadingReal ? "…" : (realStats?.avgXpPerUser ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><ScrollText className="h-5 w-5" /> Course Engagement <MockLabel /></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Enrollments", value: totalEnrollments },
            { label: "Course Completions", value: completedEnrollments },
            { label: "Paid Courses", value: paidCourses },
            { label: "Course Revenue", value: `€${courseRevenue}` },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-primary">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><TrendingUp className="h-5 w-5" /> Marketplace & Revenue <MockLabel /></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Booking Revenue</p>
            <p className="text-2xl font-bold text-primary">€{totalRevenue}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Paid Bookings</p>
            <p className="text-2xl font-bold text-primary">{paidBookings}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><BarChart3 className="h-5 w-5" /> Weekly Activity (last 8 weeks) <MockLabel /></h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">New Users</TableHead>
                <TableHead className="text-right">New Quests</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyActivity.map((w) => (
                <TableRow key={w.week}>
                  <TableCell className="font-medium">{w.week}</TableCell>
                  <TableCell className="text-right">{w.users}</TableCell>
                  <TableCell className="text-right">{w.quests}</TableCell>
                  <TableCell className="text-right">{w.bookings}</TableCell>
                  <TableCell className="text-right">{w.comments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Hash className="h-5 w-5" /> Breakdown by Topic <MockLabel /></h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead className="text-right">Quests</TableHead>
                <TableHead className="text-right">Active Users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topicStats.map(({ topic, quests, users }) => (
                <TableRow key={topic.id}>
                  <TableCell className="font-medium">{topic.name}</TableCell>
                  <TableCell className="text-right">{quests}</TableCell>
                  <TableCell className="text-right">{users}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><MapPin className="h-5 w-5" /> Breakdown by Territory <MockLabel /></h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Territory</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Quests</TableHead>
                <TableHead className="text-right">Active Users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {territoryStats.map(({ territory, quests, users }) => (
                <TableRow key={territory.id}>
                  <TableCell className="font-medium">{territory.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{territory.level.toLowerCase()}</Badge></TableCell>
                  <TableCell className="text-right">{quests}</TableCell>
                  <TableCell className="text-right">{users}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
