import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check, X, Loader2, UserPlus, MessageSquareWarning, Vote,
  Shield, Building2, Users, Eye, ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// ─── Helpers ────────────────────────────────────────────────
function SectionShell({ icon: Icon, title, count, children, emptyMsg }: {
  icon: any; title: string; count: number; children: React.ReactNode; emptyMsg: string;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-display font-semibold flex items-center gap-2 text-base">
        <Icon className="h-4.5 w-4.5 text-primary" /> {title}
        {count > 0 && <Badge variant="secondary" className="text-[10px]">{count}</Badge>}
      </h3>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{emptyMsg}</p>
      ) : children}
    </section>
  );
}

// ─── Types ──────────────────────────────────────────────────
interface AdminEntity {
  entityType: "guild" | "company" | "pod";
  entityId: string;
  entityName: string;
  logoUrl?: string | null;
}

interface PendingApp {
  id: string;
  applicant_user_id: string;
  status: string;
  answers: Array<{ question: string; answer: string }> | null;
  admin_note: string | null;
  created_at: string;
  entityType: "guild" | "company" | "pod";
  entityId: string;
  entityName: string;
  entityLogo?: string | null;
  applicant?: { name: string | null; avatar_url: string | null; headline: string | null; user_id: string | null; xp: number | null };
}

// ─── Hook: entities where user is admin ────────────────────
function useAdminEntities(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-entities", userId],
    enabled: !!userId,
    queryFn: async () => {
      const entities: AdminEntity[] = [];
      const [guilds, companies, pods] = await Promise.all([
        supabase.from("guild_members").select("guild_id, role, guilds(id, name, logo_url)").eq("user_id", userId!).eq("role", "ADMIN"),
        supabase.from("company_members").select("company_id, role, companies(id, name, logo_url)").eq("user_id", userId!).eq("role", "ADMIN"),
        supabase.from("pod_members").select("pod_id, role, pods(id, name, logo_url)").eq("user_id", userId!).eq("role", "HOST"),
      ]);
      guilds.data?.forEach((m: any) => entities.push({ entityType: "guild", entityId: m.guild_id, entityName: m.guilds?.name || "Guild", logoUrl: m.guilds?.logo_url }));
      companies.data?.forEach((m: any) => entities.push({ entityType: "company", entityId: m.company_id, entityName: m.companies?.name || "Organization", logoUrl: m.companies?.logo_url }));
      pods.data?.forEach((m: any) => entities.push({ entityType: "pod", entityId: m.pod_id, entityName: m.pods?.name || "Pod", logoUrl: m.pods?.logo_url }));
      return entities;
    },
  });
}

// ─── Hook: pending applications across entities ─────────────
function usePendingApplications(entities: AdminEntity[]) {
  return useQuery({
    queryKey: ["dashboard-pending-apps", entities.map(e => e.entityId).join(",")],
    enabled: entities.length > 0,
    queryFn: async () => {
      const guildIds = entities.filter(e => e.entityType === "guild").map(e => e.entityId);
      const companyIds = entities.filter(e => e.entityType === "company").map(e => e.entityId);
      const podIds = entities.filter(e => e.entityType === "pod").map(e => e.entityId);

      const results: PendingApp[] = [];
      const entityMap = Object.fromEntries(entities.map(e => [e.entityId, e]));

      const [guildApps, companyApps, podApps] = await Promise.all([
        guildIds.length ? supabase.from("guild_applications").select("*").in("guild_id", guildIds).eq("status", "PENDING").order("created_at", { ascending: false }) : { data: [] },
        companyIds.length ? supabase.from("company_applications").select("*").in("company_id", companyIds).eq("status", "PENDING").order("created_at", { ascending: false }) : { data: [] },
        podIds.length ? supabase.from("pod_applications").select("*").in("pod_id", podIds).eq("status", "PENDING").order("created_at", { ascending: false }) : { data: [] },
      ]);

      (guildApps.data || []).forEach((a: any) => {
        const e = entityMap[a.guild_id];
        results.push({ ...a, entityType: "guild", entityId: a.guild_id, entityName: e?.entityName || "Guild", entityLogo: e?.logoUrl });
      });
      (companyApps.data || []).forEach((a: any) => {
        const e = entityMap[a.company_id];
        results.push({ ...a, entityType: "company", entityId: a.company_id, entityName: e?.entityName || "Organization", entityLogo: e?.logoUrl });
      });
      (podApps.data || []).forEach((a: any) => {
        const e = entityMap[a.pod_id];
        results.push({ ...a, entityType: "pod", entityId: a.pod_id, entityName: e?.entityName || "Pod", entityLogo: e?.logoUrl });
      });

      // Fetch applicant profiles
      const userIds = [...new Set(results.map(r => r.applicant_user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles_public").select("user_id, name, avatar_url, headline, xp").in("user_id", userIds);
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
        results.forEach(r => { r.applicant = profileMap[r.applicant_user_id] || null; });
      }

      return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });
}

// ─── Hook: reported content in admin entities ───────────────
function useAdminReports(entities: AdminEntity[]) {
  return useQuery({
    queryKey: ["dashboard-reports", entities.map(e => e.entityId).join(",")],
    enabled: entities.length > 0,
    queryFn: async () => {
      const entityIds = entities.map(e => e.entityId);
      const entityMap = Object.fromEntries(entities.map(e => [e.entityId, e]));
      // Reports on entities the user admins (target_id = entity id or target_type includes entity context)
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("status", "OPEN")
        .order("created_at", { ascending: false })
        .limit(50);

      // Also fetch starred_excerpt_reports that are pending
      const { data: excerptReports } = await supabase
        .from("starred_excerpt_reports")
        .select("*, starred_excerpts(id, content, thread_id, unit_chat_threads(entity_type, entity_id))")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(50);

      // Filter excerpt reports to only those in admin entities
      const filteredExcerpts = (excerptReports || []).filter((r: any) => {
        const entityId = r.starred_excerpts?.unit_chat_threads?.entity_id;
        return entityId && entityIds.includes(entityId);
      });

      // Enrich general reports with entity context
      const filteredReports = (data || []).filter((r: any) => entityIds.includes(r.target_id));

      return {
        reports: filteredReports,
        excerptReports: filteredExcerpts,
        total: filteredReports.length + filteredExcerpts.length,
      };
    },
  });
}

// ─── Hook: active decisions across entities ─────────────────
function useActiveDecisions(entities: AdminEntity[]) {
  return useQuery({
    queryKey: ["dashboard-decisions", entities.map(e => e.entityId).join(",")],
    enabled: entities.length > 0,
    queryFn: async () => {
      const entityIds = entities.map(e => e.entityId);
      const entityMap = Object.fromEntries(entities.map(e => [e.entityId, e]));

      const { data } = await supabase
        .from("decision_polls")
        .select("*")
        .in("entity_id", entityIds)
        .in("status", ["open", "OPEN", "active", "ACTIVE"])
        .order("created_at", { ascending: false })
        .limit(50);

      return (data || []).map((d: any) => ({
        ...d,
        entity: entityMap[d.entity_id],
      }));
    },
  });
}

// ─── Entity link helper ─────────────────────────────────────
function entityPath(type: string, id: string) {
  if (type === "company") return `/companies/${id}`;
  return `/${type}s/${id}`;
}

function EntityChip({ entityType, entityId, entityName, logoUrl }: { entityType: string; entityId: string; entityName: string; logoUrl?: string | null }) {
  return (
    <Link to={entityPath(entityType, entityId)} className="inline-flex items-center gap-1.5 text-xs bg-muted/50 rounded-full px-2 py-0.5 hover:bg-muted transition-colors">
      <Avatar className="h-4 w-4">
        <AvatarImage src={logoUrl || undefined} />
        <AvatarFallback className="text-[8px]">{entityName[0]}</AvatarFallback>
      </Avatar>
      <span className="font-medium truncate max-w-[120px]">{entityName}</span>
    </Link>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function NetworkDashboardTab() {
  const currentUser = useCurrentUser();
  const { data: adminEntities = [], isLoading: loadingEntities } = useAdminEntities(currentUser.id);
  const { data: pendingApps = [], isLoading: loadingApps } = usePendingApplications(adminEntities);
  const { data: reportData, isLoading: loadingReports } = useAdminReports(adminEntities);
  const { data: decisions = [], isLoading: loadingDecisions } = useActiveDecisions(adminEntities);

  const isLoading = loadingEntities || loadingApps || loadingReports || loadingDecisions;

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (adminEntities.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        <p className="text-muted-foreground">You're not an admin of any entity yet.</p>
        <p className="text-xs text-muted-foreground">Create or join a guild, pod, or organization to see your admin dashboard here.</p>
      </div>
    );
  }

  const totalReports = reportData?.total || 0;

  return (
    <div className="space-y-8">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="py-4 text-center">
          <p className="text-2xl font-bold text-primary">{pendingApps.length}</p>
          <p className="text-xs text-muted-foreground">Pending Applications</p>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <p className="text-2xl font-bold text-destructive">{totalReports}</p>
          <p className="text-xs text-muted-foreground">Open Reports</p>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <p className="text-2xl font-bold text-accent-foreground">{decisions.length}</p>
          <p className="text-xs text-muted-foreground">Active Decisions</p>
        </CardContent></Card>
      </div>

      {/* Pending Applications */}
      <PendingApplicationsSection apps={pendingApps} currentUserId={currentUser.id} />

      {/* Reports */}
      <SectionShell
        icon={MessageSquareWarning}
        title="Open Reports"
        count={totalReports}
        emptyMsg="No open reports across your entities."
      >
        <div className="space-y-2">
          {(reportData?.reports || []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Report on {r.target_type?.toLowerCase()}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{r.reason || "No reason provided"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7 ml-2" asChild>
                <Link to={`/admin?tab=reports`}><Eye className="h-3 w-3 mr-1" /> Review</Link>
              </Button>
            </div>
          ))}
          {(reportData?.excerptReports || []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Flagged excerpt</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{r.starred_excerpts?.content || "Content flagged"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
              </div>
              <EntityChip
                entityType={r.starred_excerpts?.unit_chat_threads?.entity_type || "guild"}
                entityId={r.starred_excerpts?.unit_chat_threads?.entity_id || ""}
                entityName="View entity"
              />
            </div>
          ))}
        </div>
      </SectionShell>

      {/* Active Decisions */}
      <SectionShell
        icon={Vote}
        title="Active Decisions"
        count={decisions.length}
        emptyMsg="No active polls or votes across your entities."
      >
        <div className="space-y-2">
          {decisions.map((d: any) => (
            <Link
              key={d.id}
              to={`${entityPath(d.entity?.entityType || d.entity_type, d.entity_id)}?tab=decisions`}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{d.question}</p>
                <div className="flex items-center gap-2 mt-1">
                  {d.entity && <EntityChip entityType={d.entity.entityType} entityId={d.entity_id} entityName={d.entity.entityName} logoUrl={d.entity.logoUrl} />}
                  <Badge variant="outline" className="text-[10px]">{d.decision_type}</Badge>
                  {d.closes_at && (
                    <span className="text-[10px] text-muted-foreground">
                      closes {formatDistanceToNow(new Date(d.closes_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

// ─── Pending Applications Section ───────────────────────────
function PendingApplicationsSection({ apps, currentUserId }: { apps: PendingApp[]; currentUserId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { notifyApplicationDecision, notifyGuildMemberAdded } = useNotifications();
  const [selectedApp, setSelectedApp] = useState<PendingApp | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [acting, setActing] = useState(false);

  const TABLE_MAP: Record<string, any> = {
    guild: { applications: "guild_applications", members: "guild_members", idCol: "guild_id" },
    pod: { applications: "pod_applications", members: "pod_members", idCol: "pod_id" },
    company: { applications: "company_applications", members: "company_members", idCol: "company_id" },
  };

  const handleAction = async (app: PendingApp, action: "APPROVED" | "REJECTED") => {
    setActing(true);
    const cfg = TABLE_MAP[app.entityType];

    const { error } = await (supabase
      .from(cfg.applications)
      .update({
        status: action,
        reviewed_at: new Date().toISOString(),
        reviewed_by_user_id: currentUserId,
        admin_note: adminNote.trim() || null,
      })
      .eq("id", app.id) as any);

    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      setActing(false);
      return;
    }

    if (action === "APPROVED") {
      const insertData: any = { [cfg.idCol]: app.entityId, user_id: app.applicant_user_id };
      if (app.entityType !== "company") insertData.role = "MEMBER";
      await (supabase.from(cfg.members).insert(insertData) as any);
    }

    toast({ title: action === "APPROVED" ? "Application approved ✓" : "Application rejected" });
    notifyApplicationDecision({ entityType: app.entityType, entityId: app.entityId, entityName: app.entityName, applicantUserId: app.applicant_user_id, decision: action });
    if (action === "APPROVED") notifyGuildMemberAdded({ guildId: app.entityId, userId: app.applicant_user_id });

    setActing(false);
    setSelectedApp(null);
    setAdminNote("");
    qc.invalidateQueries({ queryKey: ["dashboard-pending-apps"] });
  };

  return (
    <>
      <SectionShell
        icon={UserPlus}
        title="Pending Applications"
        count={apps.length}
        emptyMsg="No pending applications across your entities."
      >
        <div className="space-y-2">
          {apps.map((app) => (
            <div key={app.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <Link to={`/users/${app.applicant?.user_id || app.applicant_user_id}`}>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={app.applicant?.avatar_url || undefined} />
                  <AvatarFallback>{app.applicant?.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/users/${app.applicant?.user_id || app.applicant_user_id}`} className="text-sm font-medium hover:text-primary transition-colors">
                  {app.applicant?.name || "Unknown"}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <EntityChip entityType={app.entityType} entityId={app.entityId} entityName={app.entityName} logoUrl={app.entityLogo} />
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {app.answers && app.answers.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setSelectedApp(app); setAdminNote(app.admin_note || ""); }}>
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleAction(app, "APPROVED")} disabled={acting}>
                  <Check className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Accept</span>
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction(app, "REJECTED")} disabled={acting}>
                  <X className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Decline</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* Detail dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => { if (!open) setSelectedApp(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
          {selectedApp && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedApp.applicant?.avatar_url || undefined} />
                  <AvatarFallback>{selectedApp.applicant?.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <Link to={`/users/${selectedApp.applicant?.user_id || selectedApp.applicant_user_id}`} className="font-medium hover:text-primary">
                    {selectedApp.applicant?.name || "Unknown"}
                  </Link>
                  {selectedApp.applicant?.headline && <p className="text-xs text-muted-foreground">{selectedApp.applicant.headline}</p>}
                  <EntityChip entityType={selectedApp.entityType} entityId={selectedApp.entityId} entityName={selectedApp.entityName} logoUrl={selectedApp.entityLogo} />
                </div>
              </div>

              {selectedApp.answers && selectedApp.answers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Answers</h4>
                  {selectedApp.answers.map((qa, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-muted-foreground">{qa.question}</p>
                      <p className="text-sm mt-1">{qa.answer || <span className="italic text-muted-foreground">No answer</span>}</p>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Admin note (optional)</label>
                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Internal note…" maxLength={500} className="resize-none" />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleAction(selectedApp, "APPROVED")} disabled={acting} className="flex-1">
                  {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Approve
                </Button>
                <Button variant="destructive" onClick={() => handleAction(selectedApp, "REJECTED")} disabled={acting} className="flex-1">
                  {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <X className="h-4 w-4 mr-1" />} Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
