import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, X, Loader2, Eye, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ApplicationRow {
  id: string;
  guild_id: string;
  applicant_user_id: string;
  status: string;
  answers: Array<{ question: string; answer: string }> | null;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  created_at: string;
  applicant?: {
    name: string | null;
    avatar_url: string | null;
    headline: string | null;
    xp: number | null;
    user_id: string | null;
  };
}

interface GuildApplicationsTabProps {
  guildId: string;
  currentUserId: string;
}

export function GuildApplicationsTab({ guildId, currentUserId }: GuildApplicationsTabProps) {
  const { toast } = useToast();
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [selectedApp, setSelectedApp] = useState<ApplicationRow | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [acting, setActing] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    let query = supabase
      .from("guild_applications")
      .select("*")
      .eq("guild_id", guildId)
      .order("created_at", { ascending: false });

    if (filter !== "ALL") {
      query = query.eq("status", filter as "PENDING" | "APPROVED" | "REJECTED");
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Failed to load applications", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch applicant profiles
    const userIds = [...new Set((data || []).map((a) => a.applicant_user_id))];
    let profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, headline, xp")
        .in("user_id", userIds);
      if (profileData) {
        profileData.forEach((p) => { profiles[p.user_id!] = p; });
      }
    }

    const enriched = (data || []).map((a) => ({
      ...a,
      answers: a.answers as ApplicationRow["answers"],
      applicant: profiles[a.applicant_user_id] || null,
    }));
    setApps(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, [guildId, filter]);

  const handleAction = async (app: ApplicationRow, action: "APPROVED" | "REJECTED") => {
    setActing(true);

    // Update application status
    const { error } = await supabase
      .from("guild_applications")
      .update({
        status: action,
        reviewed_at: new Date().toISOString(),
        reviewed_by_user_id: currentUserId,
        admin_note: adminNote.trim() || null,
      })
      .eq("id", app.id);

    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      setActing(false);
      return;
    }

    // If approved, add as guild member
    if (action === "APPROVED") {
      const { error: memberError } = await supabase.from("guild_members").insert({
        guild_id: guildId,
        user_id: app.applicant_user_id,
        role: "MEMBER",
      });
      if (memberError && !memberError.message?.includes("duplicate")) {
        toast({ title: "Approved but failed to add member", description: memberError.message, variant: "destructive" });
      }
    }

    setActing(false);
    setSelectedApp(null);
    setAdminNote("");
    toast({ title: action === "APPROVED" ? "Application approved" : "Application rejected" });
    fetchApps();
  };

  const pendingCount = apps.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          Applications
          {filter === "PENDING" && pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount}</Badge>
          )}
        </h3>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : apps.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No applications found.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Applicant</th>
                <th className="text-left px-4 py-2 font-medium">Submitted</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={app.applicant?.avatar_url || undefined} />
                        <AvatarFallback>{app.applicant?.name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          to={`/users/${app.applicant?.user_id || app.applicant_user_id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {app.applicant?.name || "Unknown user"}
                        </Link>
                        {app.applicant?.headline && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{app.applicant.headline}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={app.status === "PENDING" ? "outline" : app.status === "APPROVED" ? "default" : "destructive"}
                      className="text-xs capitalize"
                    >
                      {app.status.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSelectedApp(app);
                        setAdminNote(app.admin_note || "");
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Application detail dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => { if (!open) setSelectedApp(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4 mt-2">
              {/* Applicant info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedApp.applicant?.avatar_url || undefined} />
                  <AvatarFallback>{selectedApp.applicant?.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    to={`/users/${selectedApp.applicant?.user_id || selectedApp.applicant_user_id}`}
                    className="font-medium hover:text-primary"
                  >
                    {selectedApp.applicant?.name || "Unknown user"}
                  </Link>
                  {selectedApp.applicant?.headline && (
                    <p className="text-xs text-muted-foreground">{selectedApp.applicant.headline}</p>
                  )}
                  {selectedApp.applicant?.xp != null && (
                    <Badge variant="secondary" className="text-[10px] mt-1">{selectedApp.applicant.xp} XP</Badge>
                  )}
                </div>
              </div>

              {/* Q&A */}
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

              {/* Admin note */}
              {selectedApp.status === "PENDING" && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Admin note (optional)</label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Internal note about this application…"
                    maxLength={500}
                    className="resize-none"
                  />
                </div>
              )}

              {selectedApp.status !== "PENDING" && selectedApp.admin_note && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Admin note</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{selectedApp.admin_note}</p>
                </div>
              )}

              {/* Action buttons */}
              {selectedApp.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAction(selectedApp, "APPROVED")}
                    disabled={acting}
                    className="flex-1"
                  >
                    {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction(selectedApp, "REJECTED")}
                    disabled={acting}
                    className="flex-1"
                  >
                    {acting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                    Reject
                  </Button>
                </div>
              )}

              {selectedApp.status !== "PENDING" && (
                <p className="text-xs text-muted-foreground text-center">
                  {selectedApp.status === "APPROVED" ? "This application was approved" : "This application was rejected"}
                  {selectedApp.reviewed_at && ` ${formatDistanceToNow(new Date(selectedApp.reviewed_at), { addSuffix: true })}`}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
