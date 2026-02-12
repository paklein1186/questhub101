import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Trash2, UserPlus, ShieldCheck, Shield,
  Users, Briefcase, Settings, Pencil, Crown, Hash, MapPin,
  AlertCircle, Loader2, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { PodType, AttachmentTargetType, GuildJoinPolicy } from "@/types/enums";
import { AttachmentUpload, AttachmentList } from "@/components/AttachmentUpload";
import { formatDistanceToNow } from "date-fns";
import { EntityApplicationsTab } from "@/components/EntityApplicationsTab";
import { MembershipPolicyEditor } from "@/components/MembershipPolicyEditor";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTopics } from "@/hooks/useSupabaseData";
import { Label } from "@/components/ui/label";
import { AIWriterButton } from "@/components/AIWriterButton";

import { UserSearchInput } from "@/components/UserSearchInput";
import { sendInviteNotification } from "@/lib/inviteNotification";

const TABS = [
  { key: "identity", label: "Identity & Profile", icon: Shield },
  { key: "membership", label: "Membership Policy", icon: ClipboardList },
  { key: "applications", label: "Applications", icon: Users },
  { key: "members", label: "Members & Roles", icon: Users },
  { key: "documents", label: "Documents", icon: Briefcase },
];

export default function PodSettings() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();

  const { data: pod, isLoading } = useQuery({
    queryKey: ["pod-settings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pods")
        .select("*, pod_members(id, user_id, role, joined_at)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <PageShell><Loader2 className="h-6 w-6 animate-spin mx-auto mt-16" /></PageShell>;
  if (!pod) return <PageShell><p>Pod not found.</p></PageShell>;

  const currentMembership = pod.pod_members?.find(
    (pm: any) => pm.user_id === currentUser.id
  );
  if (currentMembership?.role !== "HOST") {
    return <PageShell><p>You must be a host of this pod to access settings.</p></PageShell>;
  }

  return <PodSettingsInner podId={pod.id} pod={pod} />;
}

function PodSettingsInner({ podId, pod }: { podId: string; pod: any }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "identity";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const { data: allTopics = [] } = useTopics();

  // ── Identity state ──
  const [name, setName] = useState(pod.name);
  const [imageUrl, setImageUrl] = useState(pod.image_url ?? "");
  const [description, setDescription] = useState(pod.description ?? "");
  const [type, setType] = useState<string>(pod.type);
  const [topicId, setTopicId] = useState<string>(pod.topic_id ?? "");
  const [startDate, setStartDate] = useState(pod.start_date ?? "");
  const [endDate, setEndDate] = useState(pod.end_date ?? "");
  const [universeVisibility, setUniverseVisibility] = useState<string>(pod.universe_visibility ?? "both");

  // ── Members ──
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["pod-members-settings", podId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pod_members")
        .select("id, user_id, role, joined_at")
        .eq("pod_id", podId);
      if (error) throw error;
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url")
        .in("user_id", userIds);
      return data.map((m: any) => ({
        ...m,
        user: profiles?.find((p: any) => p.user_id === m.user_id),
      }));
    },
  });

  const [inviteOpen, setInviteOpen] = useState(false);

  // ── Handlers ──
  const handleSaveIdentity = async () => {
    const { error } = await supabase
      .from("pods")
      .update({
        name: name.trim() || pod.name,
        image_url: imageUrl.trim() || null,
        description: description.trim() || null,
        type: type as any,
        topic_id: topicId || null,
        start_date: startDate || null,
        end_date: endDate || null,
        universe_visibility: universeVisibility,
      } as any)
      .eq("id", podId);
    if (error) { toast({ title: "Failed to save", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["pod-settings", podId] });
    qc.invalidateQueries({ queryKey: ["pod", podId] });
    toast({ title: "Pod identity updated!" });
  };

  const inviteMember = async (selectedUserId: string) => {
    if (!selectedUserId) return;
    const already = members.some((m: any) => m.user_id === selectedUserId);
    if (already) { toast({ title: "Already a member", variant: "destructive" }); return; }
    const { error } = await supabase.from("pod_members").insert({
      pod_id: podId, user_id: selectedUserId, role: "MEMBER" as any,
    });
    if (error) { toast({ title: "Failed to add member", variant: "destructive" }); return; }
    sendInviteNotification({ invitedUserId: selectedUserId, inviterName: currentUser.name, entityType: "pod", entityId: podId, entityName: pod?.name || "Pod" });
    setInviteOpen(false);
    refetchMembers();
    toast({ title: "Member added!" });
  };

  const toggleMemberRole = async (memberId: string) => {
    const pm = members.find((m: any) => m.id === memberId);
    if (!pm) return;
    const hosts = members.filter((m: any) => m.role === "HOST");
    if (pm.role === "HOST" && hosts.length <= 1) {
      toast({ title: "Cannot demote", description: "At least one host must exist.", variant: "destructive" });
      return;
    }
    const newRole = pm.role === "HOST" ? "MEMBER" : "HOST";
    await supabase.from("pod_members").update({ role: newRole as any }).eq("id", memberId);
    refetchMembers();
    toast({ title: `Role changed to ${newRole.toLowerCase()}` });
  };

  const removeMember = async (memberId: string) => {
    const pm = members.find((m: any) => m.id === memberId);
    if (!pm || pm.user_id === currentUser.id) return;
    if (pm.role === "HOST") {
      const hosts = members.filter((m: any) => m.role === "HOST");
      if (hosts.length <= 1) { toast({ title: "Cannot remove the last host", variant: "destructive" }); return; }
    }
    await supabase.from("pod_members").delete().eq("id", memberId);
    refetchMembers();
    toast({ title: "Member removed" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/pods/${podId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to pod</Link>
      </Button>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {pod.image_url && <img src={pod.image_url} className="h-10 w-10 rounded-lg object-cover" alt="" />}
          <div>
            <h1 className="font-display text-2xl font-bold">Pod Settings</h1>
            <p className="text-sm text-muted-foreground">{pod.name}</p>
          </div>
          {pod.is_draft ? (
            <Badge variant="outline" className="ml-auto"><AlertCircle className="h-3 w-3 mr-1" /> Draft</Badge>
          ) : (
            <Badge className="bg-primary/10 text-primary border-0 ml-auto"><ShieldCheck className="h-3 w-3 mr-1" /> Active</Badge>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <nav className="md:w-52 shrink-0 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

              {/* ── Identity & Profile ── */}
              {activeTab === "identity" && (
                <div className="space-y-5 max-w-lg">
                  <Section title="Pod Identity" icon={<Shield className="h-5 w-5" />}>
                    <div className="space-y-4">
                      <div><label className="text-sm font-medium mb-1 block">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
                      <ImageUpload label="Cover Image" currentImageUrl={imageUrl || undefined} onChange={(url) => setImageUrl(url ?? "")} aspectRatio="16/9" description="Cover image, recommended 1200×400" />
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium">Description</label>
                          <AIWriterButton
                            type="guild_identity"
                            context={{ title: name, guildType: type, memberCount: pod.pod_members?.length || 0 }}
                            currentText={description}
                            onAccept={(text) => setDescription(text)}
                          />
                        </div>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="resize-none min-h-[120px]" />
                      </div>
                      <div><label className="text-sm font-medium mb-1 block">Type</label>
                        <Select value={type} onValueChange={setType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QUEST_POD">Quest Pod</SelectItem>
                            <SelectItem value="STUDY_GROUP">Study Group</SelectItem>
                            <SelectItem value="PROJECT_TEAM">Project Team</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Section>

                  <Separator />

                  <Section title="Topic" icon={<Hash className="h-5 w-5" />}>
                    <Select value={topicId} onValueChange={setTopicId}>
                      <SelectTrigger><SelectValue placeholder="Select a topic…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {allTopics.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Section>

                  <Section title="Dates" icon={<Settings className="h-5 w-5" />}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Start date</label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">End date</label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      </div>
                    </div>
                  </Section>

                  <Section title="Universe Visibility" icon={<Settings className="h-5 w-5" />}>
                    <p className="text-xs text-muted-foreground mb-2">
                      Control in which universe this pod appears when users filter by Creative or Impact.
                    </p>
                    <Select value={universeVisibility} onValueChange={setUniverseVisibility}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both universes</SelectItem>
                        <SelectItem value="creative">Creative Universe only</SelectItem>
                        <SelectItem value="impact">Impact Universe only</SelectItem>
                      </SelectContent>
                    </Select>
                  </Section>

                  <Button onClick={handleSaveIdentity} className="w-full"><Save className="h-4 w-4 mr-2" /> Save identity</Button>
                </div>
              )}

              {/* ── Membership Policy ── */}
              {activeTab === "membership" && (
                <MembershipPolicyEditor
                  joinPolicy={pod.join_policy || "OPEN"}
                  applicationQuestions={(pod.application_questions as string[]) || []}
                  onSave={async (policy, questions) => {
                    await supabase.from("pods").update({
                      join_policy: policy as any,
                      application_questions: questions as any,
                    }).eq("id", podId);
                    qc.invalidateQueries({ queryKey: ["pod-settings", podId] });
                    qc.invalidateQueries({ queryKey: ["pod", podId] });
                    toast({ title: "Membership policy saved!" });
                  }}
                />
              )}

              {/* ── Applications ── */}
              {activeTab === "applications" && (
                <EntityApplicationsTab entityType="pod" entityId={podId} currentUserId={currentUser.id} />
              )}

              {/* ── Members & Roles ── */}
              {activeTab === "members" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Section title={`Members (${members.length})`} icon={<Users className="h-5 w-5" />}><span /></Section>
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                      <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Add member</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Search by name</label>
                            <UserSearchInput
                              onSelect={(user) => inviteMember(user.user_id)}
                              placeholder="Type a member name…"
                              excludeUserIds={members.map((m: any) => m.user_id)}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">User</th>
                          <th className="text-left px-4 py-2 font-medium">Role</th>
                          <th className="text-left px-4 py-2 font-medium">Joined</th>
                          <th className="text-right px-4 py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m: any) => (
                          <tr key={m.id} className="border-t border-border">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8"><AvatarImage src={m.user?.avatar_url} /><AvatarFallback>{m.user?.name?.[0]}</AvatarFallback></Avatar>
                                <div>
                                  <p className="font-medium">{m.user?.name}</p>
                                  <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={m.role === "HOST" ? "default" : "outline"} className="capitalize text-xs">
                                {m.role === "HOST" && <Crown className="h-3 w-3 mr-1" />}
                                {m.role.toLowerCase()}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleMemberRole(m.id)}
                                  title={m.role === "HOST" ? "Demote to member" : "Promote to host"}>
                                  {m.role === "HOST" ? "Demote" : "Promote"}
                                </Button>
                                {m.user_id !== currentUser.id && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => removeMember(m.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Documents ── */}
              {activeTab === "documents" && (
                <div className="space-y-6 max-w-lg">
                  <Section title="Pod Documents" icon={<Briefcase className="h-5 w-5" />}>
                    <p className="text-sm text-muted-foreground mb-4">Upload documents, resources, and files for pod members.</p>
                    <AttachmentList targetType={AttachmentTargetType.POD} targetId={pod.id} />
                    <div className="mt-4">
                      <AttachmentUpload targetType={AttachmentTargetType.POD} targetId={pod.id} />
                    </div>
                  </Section>
                </div>
              )}




            </motion.div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ── Helper ──
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">{icon} {title}</h3>
      {children}
    </div>
  );
}
