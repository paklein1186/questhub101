/**
 * DeepAnalyticsSection — Time-series charts, retention, revenue breakdown,
 * feed engagement, and week-over-week growth trends. All data from real DB.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, TrendingUp, Users, DollarSign, MessageSquare, BarChart3 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { format, subDays, startOfWeek, differenceInWeeks, parseISO } from "date-fns";
import { useMemo } from "react";

const LiveLabel = () => (
  <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 text-green-600 border-green-400 bg-green-50 dark:bg-green-900/20 dark:text-green-400">
    LIVE
  </Badge>
);

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted-foreground))",
  destructive: "hsl(var(--destructive))",
};

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

// ─── Data Hooks ──────────────────────────────────────────

function useSignupTimeSeries() {
  return useQuery({
    queryKey: ["deep-analytics-signups"],
    queryFn: async () => {
      const since = subDays(new Date(), 90).toISOString();
      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      const rows = data ?? [];
      // Group by week
      const weekMap = new Map<string, number>();
      rows.forEach((r) => {
        const week = format(startOfWeek(parseISO(r.created_at), { weekStartsOn: 1 }), "MMM d");
        weekMap.set(week, (weekMap.get(week) || 0) + 1);
      });
      return Array.from(weekMap.entries()).map(([week, count]) => ({ week, signups: count }));
    },
    staleTime: 60_000,
  });
}

function useRevenueTimeSeries() {
  return useQuery({
    queryKey: ["deep-analytics-revenue"],
    queryFn: async () => {
      const since = subDays(new Date(), 90).toISOString();
      const [bookingsRes, coursesRes, sharesRes] = await Promise.all([
        supabase.from("bookings").select("created_at, amount, payment_status").gte("created_at", since).eq("is_deleted", false),
        supabase.from("course_purchases").select("created_at, amount, status").gte("created_at", since),
        supabase.from("shareholdings").select("created_at, total_paid").gte("created_at", since),
      ]);

      const weekMap = new Map<string, { bookings: number; courses: number; shares: number }>();
      const getWeek = (d: string) => format(startOfWeek(parseISO(d), { weekStartsOn: 1 }), "MMM d");
      const ensure = (w: string) => {
        if (!weekMap.has(w)) weekMap.set(w, { bookings: 0, courses: 0, shares: 0 });
        return weekMap.get(w)!;
      };

      (bookingsRes.data ?? []).forEach((r) => {
        if (r.amount && r.amount > 0) ensure(getWeek(r.created_at)).bookings += r.amount;
      });
      (coursesRes.data ?? []).filter((r) => r.status === "PAID").forEach((r) => {
        ensure(getWeek(r.created_at)).courses += r.amount ?? 0;
      });
      (sharesRes.data ?? []).forEach((r) => {
        ensure(getWeek(r.created_at)).shares += r.total_paid;
      });

      // Sort by week chronologically
      return Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([week, v]) => ({ week, ...v, total: v.bookings + v.courses + v.shares }));
    },
    staleTime: 60_000,
  });
}

function useRevenueBreakdown() {
  return useQuery({
    queryKey: ["deep-analytics-revenue-breakdown"],
    queryFn: async () => {
      const [bookingsRes, coursesRes, sharesRes, subsRes] = await Promise.all([
        supabase.from("bookings").select("amount").eq("is_deleted", false).gt("amount", 0),
        supabase.from("course_purchases").select("amount").eq("status", "PAID"),
        supabase.from("shareholdings").select("total_paid"),
        supabase.from("user_subscriptions").select("plan_id, status").eq("is_current", true).eq("status", "ACTIVE"),
      ]);
      const bookingTotal = (bookingsRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const courseTotal = (coursesRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const shareTotal = (sharesRes.data ?? []).reduce((s, r) => s + r.total_paid, 0);
      const activeSubscriptions = (subsRes.data ?? []).length;

      return {
        breakdown: [
          { name: "Bookings", value: bookingTotal },
          { name: "Courses", value: courseTotal },
          { name: "Shares", value: shareTotal },
        ].filter((b) => b.value > 0),
        activeSubscriptions,
        grandTotal: bookingTotal + courseTotal + shareTotal,
      };
    },
    staleTime: 60_000,
  });
}

function useFeedEngagement() {
  return useQuery({
    queryKey: ["deep-analytics-feed-engagement"],
    queryFn: async () => {
      const since = subDays(new Date(), 90).toISOString();
      const [postsRes, commentsRes] = await Promise.all([
        supabase.from("feed_posts").select("created_at, upvote_count").gte("created_at", since).eq("is_deleted", false),
        supabase.from("comments").select("created_at").gte("created_at", since).eq("is_deleted", false),
      ]);
      const posts = postsRes.data ?? [];
      const comments = commentsRes.data ?? [];

      const getWeek = (d: string) => format(startOfWeek(parseISO(d), { weekStartsOn: 1 }), "MMM d");
      const weekMap = new Map<string, { posts: number; upvotes: number; comments: number }>();
      const ensure = (w: string) => {
        if (!weekMap.has(w)) weekMap.set(w, { posts: 0, upvotes: 0, comments: 0 });
        return weekMap.get(w)!;
      };

      posts.forEach((p) => {
        const e = ensure(getWeek(p.created_at));
        e.posts += 1;
        e.upvotes += p.upvote_count ?? 0;
      });
      comments.forEach((c) => {
        ensure(getWeek(c.created_at)).comments += 1;
      });

      return Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([week, v]) => ({ week, ...v }));
    },
    staleTime: 60_000,
  });
}

function useRetentionData() {
  return useQuery({
    queryKey: ["deep-analytics-retention"],
    queryFn: async () => {
      // Cohort: users who signed up each month, check if they have activity (posts, comments, bookings) in subsequent months
      const since = subDays(new Date(), 180).toISOString();
      const [profilesRes, postsRes, commentsRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at").gte("created_at", since),
        supabase.from("feed_posts").select("author_user_id, created_at").gte("created_at", since).eq("is_deleted", false),
        supabase.from("comments").select("author_id, created_at").gte("created_at", since).eq("is_deleted", false),
      ]);

      const profiles = profilesRes.data ?? [];
      const posts = postsRes.data ?? [];
      const cmts = commentsRes.data ?? [];

      // Build activity set: user_id -> set of months active
      const activityMap = new Map<string, Set<string>>();
      const addActivity = (uid: string, date: string) => {
        const month = format(parseISO(date), "yyyy-MM");
        if (!activityMap.has(uid)) activityMap.set(uid, new Set());
        activityMap.get(uid)!.add(month);
      };

      posts.forEach((p) => addActivity(p.author_user_id, p.created_at));
      cmts.forEach((c) => addActivity(c.author_id, c.created_at));

      // Cohort by signup month
      const cohortMap = new Map<string, { total: number; active: number }>();
      profiles.forEach((p) => {
        const signupMonth = format(parseISO(p.created_at), "yyyy-MM");
        const currentMonth = format(new Date(), "yyyy-MM");
        if (!cohortMap.has(signupMonth)) cohortMap.set(signupMonth, { total: 0, active: 0 });
        const c = cohortMap.get(signupMonth)!;
        c.total += 1;
        // "Active" = had any activity after signup month or in current month
        const userActivity = activityMap.get(p.id);
        if (userActivity && (userActivity.size > 1 || (userActivity.size === 1 && !userActivity.has(signupMonth)))) {
          c.active += 1;
        } else if (userActivity && signupMonth === currentMonth) {
          c.active += 1; // active in signup month that is current month
        }
      });

      return Array.from(cohortMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, v]) => ({
          month: format(parseISO(month + "-01"), "MMM yyyy"),
          signups: v.total,
          retained: v.active,
          rate: v.total > 0 ? Math.round((v.active / v.total) * 100) : 0,
        }));
    },
    staleTime: 120_000,
  });
}

function useGrowthTrends() {
  return useQuery({
    queryKey: ["deep-analytics-growth"],
    queryFn: async () => {
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 }).toISOString();

      const [usersThisW, usersLastW, postsThisW, postsLastW, bookingsThisW, bookingsLastW] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thisWeekStart),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", lastWeekStart).lt("created_at", thisWeekStart),
        supabase.from("feed_posts").select("id", { count: "exact", head: true }).gte("created_at", thisWeekStart).eq("is_deleted", false),
        supabase.from("feed_posts").select("id", { count: "exact", head: true }).gte("created_at", lastWeekStart).lt("created_at", thisWeekStart).eq("is_deleted", false),
        supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", thisWeekStart).eq("is_deleted", false),
        supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", lastWeekStart).lt("created_at", thisWeekStart).eq("is_deleted", false),
      ]);

      const pct = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

      return [
        { metric: "New Users", thisWeek: usersThisW.count ?? 0, lastWeek: usersLastW.count ?? 0, change: pct(usersThisW.count ?? 0, usersLastW.count ?? 0) },
        { metric: "Posts Created", thisWeek: postsThisW.count ?? 0, lastWeek: postsLastW.count ?? 0, change: pct(postsThisW.count ?? 0, postsLastW.count ?? 0) },
        { metric: "Bookings", thisWeek: bookingsThisW.count ?? 0, lastWeek: bookingsLastW.count ?? 0, change: pct(bookingsThisW.count ?? 0, bookingsLastW.count ?? 0) },
      ];
    },
    staleTime: 60_000,
  });
}

// ─── Component ───────────────────────────────────────────

export function DeepAnalyticsSection() {
  const { data: signupData, isLoading: loadingSignups } = useSignupTimeSeries();
  const { data: revenueData, isLoading: loadingRevenue } = useRevenueTimeSeries();
  const { data: breakdown, isLoading: loadingBreakdown } = useRevenueBreakdown();
  const { data: feedData, isLoading: loadingFeed } = useFeedEngagement();
  const { data: retentionData, isLoading: loadingRetention } = useRetentionData();
  const { data: growthData, isLoading: loadingGrowth } = useGrowthTrends();

  const ChartLoader = () => (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-8">
      <Separator />

      {/* ── Signups Over Time ── */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" /> Signups Over Time (90d) <LiveLabel />
        </h3>
        {loadingSignups ? <ChartLoader /> : (
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={signupData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area type="monotone" dataKey="signups" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Revenue Over Time ── */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5" /> Revenue Over Time (90d) <LiveLabel />
        </h3>
        {loadingRevenue ? <ChartLoader /> : (
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => `€${v}`}
                />
                <Legend />
                <Bar dataKey="bookings" stackId="rev" fill="#6366f1" name="Bookings" radius={[0, 0, 0, 0]} />
                <Bar dataKey="courses" stackId="rev" fill="#22c55e" name="Courses" radius={[0, 0, 0, 0]} />
                <Bar dataKey="shares" stackId="rev" fill="#f59e0b" name="Shares" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Revenue Breakdown (Pie) ── */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5" /> Revenue Breakdown (All Time) <LiveLabel />
        </h3>
        {loadingBreakdown ? <ChartLoader /> : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              {breakdown && breakdown.breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={breakdown.breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: €${value}`}
                    >
                      {breakdown.breakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `€${v}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No revenue data yet.</p>
              )}
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Grand Total Revenue</p>
                <p className="text-3xl font-bold text-primary">€{breakdown?.grandTotal ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                <p className="text-3xl font-bold text-primary">{breakdown?.activeSubscriptions ?? 0}</p>
              </div>
              {breakdown?.breakdown.map((b, i) => (
                <div key={b.name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm flex-1">{b.name}</span>
                  <span className="text-sm font-semibold">€{b.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Feed / Post Engagement ── */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5" /> Feed & Post Engagement (90d) <LiveLabel />
        </h3>
        {loadingFeed ? <ChartLoader /> : (
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={feedData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="posts" stroke="#6366f1" strokeWidth={2} dot={false} name="Posts" />
                <Line type="monotone" dataKey="upvotes" stroke="#22c55e" strokeWidth={2} dot={false} name="Upvotes" />
                <Line type="monotone" dataKey="comments" stroke="#f59e0b" strokeWidth={2} dot={false} name="Comments" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <Separator />

      {/* ── User Retention / Cohort ── */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" /> User Retention by Cohort (6 months) <LiveLabel />
        </h3>
        {loadingRetention ? <ChartLoader /> : (
          <div className="rounded-xl border border-border bg-card p-4">
            {retentionData && retentionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={retentionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="signups" fill="#6366f1" name="Signups" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="retained" fill="#22c55e" name="Retained" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Not enough data for retention analysis yet.</p>
            )}
            {retentionData && retentionData.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {retentionData.map((c) => (
                  <div key={c.month} className="text-center px-3 py-2 rounded-lg border border-border bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">{c.month}</p>
                    <p className="text-lg font-bold text-primary">{c.rate}%</p>
                    <p className="text-[10px] text-muted-foreground">{c.retained}/{c.signups}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* ── Week-over-Week Growth ── */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5" /> Week-over-Week Growth <LiveLabel />
        </h3>
        {loadingGrowth ? <ChartLoader /> : (
          <div className="grid sm:grid-cols-3 gap-4">
            {(growthData ?? []).map((g) => (
              <div key={g.metric} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{g.metric}</p>
                <div className="flex items-end gap-3">
                  <div>
                    <p className="text-2xl font-bold text-primary">{g.thisWeek}</p>
                    <p className="text-[10px] text-muted-foreground">this week</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-muted-foreground">{g.lastWeek}</p>
                    <p className="text-[10px] text-muted-foreground">last week</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-xs font-semibold ${
                      g.change > 0
                        ? "text-green-600 border-green-400 bg-green-50 dark:bg-green-900/20"
                        : g.change < 0
                        ? "text-red-600 border-red-400 bg-red-50 dark:bg-red-900/20"
                        : "text-muted-foreground"
                    }`}
                  >
                    {g.change > 0 ? "+" : ""}{g.change}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
