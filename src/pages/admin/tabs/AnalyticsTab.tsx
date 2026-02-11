/**
 * AnalyticsTab — ALL data from real database, zero mocks.
 */
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart3, Users as UsersIcon, Shield, Compass, Hash, ShoppingBag,
  CreditCard, MessageSquare, Zap, ScrollText, TrendingUp, MapPin, Building2, Loader2,
} from "lucide-react";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useEntityCounts() {
  return useQuery({
    queryKey: ["admin-entity-counts"],
    queryFn: async () => {
      const [
        questsRes, guildsRes, podsRes, servicesRes, bookingsRes, commentsRes,
        coursesRes, companiesRes, territoriesRes, topicsRes,
      ] = await Promise.all([
        supabase.from("quests").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("guilds").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("pods").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("territories").select("id", { count: "exact", head: true }),
        supabase.from("topics").select("id", { count: "exact", head: true }),
      ]);
      return {
        quests: questsRes.count ?? 0,
        guilds: guildsRes.count ?? 0,
        pods: podsRes.count ?? 0,
        services: servicesRes.count ?? 0,
        bookings: bookingsRes.count ?? 0,
        comments: commentsRes.count ?? 0,
        courses: coursesRes.count ?? 0,
        companies: companiesRes.count ?? 0,
        territories: territoriesRes.count ?? 0,
        topics: topicsRes.count ?? 0,
      };
    },
    staleTime: 30_000,
  });
}

function useCourseStats() {
  return useQuery({
    queryKey: ["admin-course-stats"],
    queryFn: async () => {
      const [enrollRes, completedRes, paidCoursesRes, revenueRes] = await Promise.all([
        supabase.from("course_enrollments").select("id", { count: "exact", head: true }),
        supabase.from("course_enrollments").select("id", { count: "exact", head: true }).not("completed_at", "is", null),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_free", false).eq("is_published", true),
        supabase.from("course_purchases").select("amount").eq("status", "PAID"),
      ]);
      const courseRevenue = (revenueRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      return {
        enrollments: enrollRes.count ?? 0,
        completions: completedRes.count ?? 0,
        paidCourses: paidCoursesRes.count ?? 0,
        revenue: courseRevenue,
      };
    },
    staleTime: 30_000,
  });
}

function useMarketplaceStats() {
  return useQuery({
    queryKey: ["admin-marketplace-stats"],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("amount, payment_status")
        .eq("is_deleted", false);
      const rows = bookings ?? [];
      const totalRevenue = rows.reduce((s, b) => s + (b.amount ?? 0), 0);
      const paidBookings = rows.filter((b) => b.payment_status === "PAID" || (b.amount && b.amount > 0)).length;
      return { totalRevenue, paidBookings };
    },
    staleTime: 30_000,
  });
}

function useShareStats() {
  return useQuery({
    queryKey: ["admin-share-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("shareholdings").select("share_class, number_of_shares, total_paid");
      const rows = data ?? [];
      const totalA = rows.filter(r => r.share_class === "A").reduce((s, r) => s + r.number_of_shares, 0);
      const totalB = rows.filter(r => r.share_class === "B").reduce((s, r) => s + r.number_of_shares, 0);
      const totalPaid = rows.reduce((s, r) => s + r.total_paid, 0);
      return { totalA, totalB, totalPaid };
    },
    staleTime: 30_000,
  });
}

function useTopicStats() {
  return useQuery({
    queryKey: ["admin-topic-stats"],
    queryFn: async () => {
      const [topicsRes, qtRes, utRes] = await Promise.all([
        supabase.from("topics").select("id, name"),
        supabase.from("quest_topics").select("topic_id"),
        supabase.from("user_topics").select("topic_id"),
      ]);
      const topics = topicsRes.data ?? [];
      const qt = qtRes.data ?? [];
      const ut = utRes.data ?? [];
      return topics.map((t) => ({
        topic: t,
        quests: qt.filter((q) => q.topic_id === t.id).length,
        users: ut.filter((u) => u.topic_id === t.id).length,
      })).filter((t) => t.quests > 0 || t.users > 0).sort((a, b) => b.quests - a.quests).slice(0, 10);
    },
    staleTime: 60_000,
  });
}

function useTerritoryStats() {
  return useQuery({
    queryKey: ["admin-territory-stats"],
    queryFn: async () => {
      const [terrRes, qtRes, utRes] = await Promise.all([
        supabase.from("territories").select("id, name, level"),
        supabase.from("quest_territories").select("territory_id"),
        supabase.from("user_territories").select("territory_id"),
      ]);
      const territories = terrRes.data ?? [];
      const qt = qtRes.data ?? [];
      const ut = utRes.data ?? [];
      return territories.map((t) => ({
        territory: t,
        quests: qt.filter((q) => q.territory_id === t.id).length,
        users: ut.filter((u) => u.territory_id === t.id).length,
      })).filter((t) => t.quests > 0 || t.users > 0).sort((a, b) => b.quests - a.quests);
    },
    staleTime: 60_000,
  });
}

export function AnalyticsTab() {
  const { data: realStats, isLoading: loadingReal } = useAdminStats();
  const { data: counts, isLoading: loadingCounts } = useEntityCounts();
  const { data: courseStats, isLoading: loadingCourses } = useCourseStats();
  const { data: mktStats, isLoading: loadingMkt } = useMarketplaceStats();
  const { data: shareStats } = useShareStats();
  const { data: topicStats = [] } = useTopicStats();
  const { data: territoryStats = [] } = useTerritoryStats();

  const loading = loadingReal || loadingCounts;

  const LiveLabel = () => (
    <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 text-green-600 border-green-400 bg-green-50 dark:bg-green-900/20 dark:text-green-400">LIVE</Badge>
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><BarChart3 className="h-5 w-5" /> Platform Overview <LiveLabel /></h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={UsersIcon} label="Total Users" value={realStats?.totalUsers ?? 0} sub={`+${realStats?.recentUsers7d ?? 0} (7d) · +${realStats?.recentUsers30d ?? 0} (30d)`} />
            <StatCard icon={Compass} label="Quests" value={counts?.quests ?? 0} />
            <StatCard icon={Shield} label="Guilds" value={counts?.guilds ?? 0} />
            <StatCard icon={Hash} label="Pods" value={counts?.pods ?? 0} />
            <StatCard icon={ShoppingBag} label="Services" value={counts?.services ?? 0} />
            <StatCard icon={CreditCard} label="Bookings" value={counts?.bookings ?? 0} />
            <StatCard icon={MessageSquare} label="Comments" value={counts?.comments ?? 0} />
            <StatCard icon={Building2} label="Organizations" value={counts?.companies ?? 0} />
            <StatCard icon={ScrollText} label="Courses" value={counts?.courses ?? 0} />
            <StatCard icon={MapPin} label="Territories" value={counts?.territories ?? 0} />
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Zap className="h-5 w-5" /> XP & Engagement <LiveLabel /></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total XP Awarded", value: realStats?.totalXpAwarded ?? 0 },
            { label: "Total XP Spent", value: realStats?.totalXpSpent ?? 0 },
            { label: "XP Awarded (7d)", value: realStats?.xpLast7d ?? 0 },
            { label: "XP Awarded (30d)", value: realStats?.xpLast30d ?? 0 },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-primary">{loadingReal ? "…" : s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><CreditCard className="h-5 w-5" /> Subscriptions <LiveLabel /></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Active Subscriptions</p>
            <p className="text-2xl font-bold text-primary">{loadingReal ? "…" : realStats?.totalActiveSubscriptions ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Avg XP / User</p>
            <p className="text-2xl font-bold text-primary">{loadingReal ? "…" : (realStats?.avgXpPerUser ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><ScrollText className="h-5 w-5" /> Course Engagement <LiveLabel /></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Enrollments", value: loadingCourses ? "…" : courseStats?.enrollments ?? 0 },
            { label: "Course Completions", value: loadingCourses ? "…" : courseStats?.completions ?? 0 },
            { label: "Paid Courses", value: loadingCourses ? "…" : courseStats?.paidCourses ?? 0 },
            { label: "Course Revenue", value: loadingCourses ? "…" : `€${courseStats?.revenue ?? 0}` },
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
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><TrendingUp className="h-5 w-5" /> Marketplace & Revenue <LiveLabel /></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Booking Revenue</p>
            <p className="text-2xl font-bold text-primary">{loadingMkt ? "…" : `€${mktStats?.totalRevenue ?? 0}`}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Paid Bookings</p>
            <p className="text-2xl font-bold text-primary">{loadingMkt ? "…" : mktStats?.paidBookings ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Shares (A / B)</p>
            <p className="text-2xl font-bold text-primary">{shareStats ? `${shareStats.totalA} / ${shareStats.totalB}` : "…"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Share Revenue</p>
            <p className="text-2xl font-bold text-primary">{shareStats ? `€${shareStats.totalPaid}` : "…"}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Hash className="h-5 w-5" /> Breakdown by Topic <LiveLabel /></h3>
        {topicStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No topic data yet.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Topic</TableHead><TableHead className="text-right">Quests</TableHead><TableHead className="text-right">Active Users</TableHead></TableRow></TableHeader>
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
        )}
      </div>

      <Separator />

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><MapPin className="h-5 w-5" /> Breakdown by Territory <LiveLabel /></h3>
        {territoryStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No territory data yet.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Territory</TableHead><TableHead>Level</TableHead><TableHead className="text-right">Quests</TableHead><TableHead className="text-right">Active Users</TableHead></TableRow></TableHeader>
              <TableBody>
                {territoryStats.map(({ territory, quests, users }) => (
                  <TableRow key={territory.id}>
                    <TableCell className="font-medium">{territory.name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-xs">{territory.level?.toLowerCase()}</Badge></TableCell>
                    <TableCell className="text-right">{quests}</TableCell>
                    <TableCell className="text-right">{users}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof UsersIcon; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-primary">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
