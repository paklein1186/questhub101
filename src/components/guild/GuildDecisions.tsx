import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow, isPast, isFuture, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote, Plus, Check, X, AlertTriangle, Clock, Archive,
  ChevronDown, ChevronUp, BarChart3, Users, Pencil, Loader2,
  MessageSquare, ThumbsUp, ThumbsDown, Minus, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType } from "@/types/enums";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AudiencePicker } from "@/components/guild/AudiencePicker";
import { useEntityRoles, type EntityRole } from "@/hooks/useEntityRoles";
import type { AudienceType, PermissionContext } from "@/lib/permissions";
import { evaluateDecisionPermissions } from "@/lib/permissions";

/* ───────── Types ───────── */
type DecisionType = "POLL" | "VOTE_SIMPLE" | "MULTI_OPTION" | "CONSENT";
type DecisionStatus = "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";

interface Option { label: string; description?: string }

interface Props {
  guildId: string;
  isAdmin: boolean;
  isMember: boolean;
  currentUserId: string;
  memberCount: number;
  currentUserRole?: string;
  featuresConfig?: any;
}

const TYPE_LABELS: Record<DecisionType, string> = {
  POLL: "Poll", VOTE_SIMPLE: "Simple Vote", MULTI_OPTION: "Multi-Option", CONSENT: "Consent",
};

const STATUS_COLORS: Record<DecisionStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  OPEN: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CLOSED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

/* ───────── Component ───────── */
export function GuildDecisions({ guildId, isAdmin, isMember, currentUserId, memberCount, currentUserRole, featuresConfig, permissionContext }: Props & { permissionContext?: import("@/lib/permissions").PermissionContext }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { notifyDecisionCreated } = useNotifications();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState("open");

  // ── Fetch decisions ──
  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ["guild-decisions", guildId],
    queryFn: async () => {
      const { data } = await supabase
        .from("decision_polls")
        .select("*")
        .eq("entity_type", "GUILD")
        .eq("entity_id", guildId)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  // Filter by status
  const filtered = useMemo(() => {
    if (filterTab === "all") return decisions;
    const map: Record<string, string[]> = {
      open: ["OPEN"],
      draft: ["DRAFT"],
      closed: ["CLOSED", "ARCHIVED"],
    };
    return decisions.filter((d: any) => (map[filterTab] || []).includes(d.status));
  }, [decisions, filterTab]);

  // Hide drafts from non-admins
  const visible = filtered.filter((d: any) => d.status !== "DRAFT" || isAdmin);

  const viewing = decisions.find((d: any) => d.id === viewId);

  // Determine who can propose decisions based on guild governance settings
  const decisionProposerRole = featuresConfig?.decisionProposerRole || "ADMIN";
  const canPropose = decisionProposerRole === "MEMBER" ? isMember : isAdmin;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Vote className="h-5 w-5" /> Decisions</h3>
        {canPropose && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Decision</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Decision</DialogTitle></DialogHeader>
              <CreateDecisionForm guildId={guildId} userId={currentUserId} onCreated={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ["guild-decisions", guildId] }); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={filterTab} onValueChange={setFilterTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-sm">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          {isAdmin && <TabsTrigger value="draft">Drafts</TabsTrigger>}
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

      <AnimatePresence mode="popLayout">
        {visible.map((d: any) => (
          <motion.div key={d.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <DecisionCard
              decision={d}
              isAdmin={isAdmin}
              isMember={isMember}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              memberCount={memberCount}
              guildId={guildId}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["guild-decisions", guildId] })}
              permissionContext={permissionContext}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {!isLoading && visible.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          {filterTab === "open" ? "No open decisions right now." : "No decisions to show."}
        </p>
      )}
    </div>
  );
}

/* ═══════════ Create Form ═══════════ */
function CreateDecisionForm({ guildId, userId, onCreated }: { guildId: string; userId: string; onCreated: () => void }) {
  const { toast } = useToast();
  const { roles: entityRoles } = useEntityRoles("guild", guildId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [decisionType, setDecisionType] = useState<DecisionType>("VOTE_SIMPLE");
  const [options, setOptions] = useState<Option[]>([{ label: "" }, { label: "" }]);
  const [closesAt, setClosesAt] = useState("");
  const [quorumType, setQuorumType] = useState("NONE");
  const [quorumValue, setQuorumValue] = useState("0");
  const [passThreshold, setPassThreshold] = useState("50");
  const [allowComments, setAllowComments] = useState(true);
  const [allowVoteChange, setAllowVoteChange] = useState(true);
  const [multiSelect, setMultiSelect] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  // Audience permission states
  const [visibilityAudience, setVisibilityAudience] = useState<AudienceType>("MEMBERS");
  const [visibilityRoleIds, setVisibilityRoleIds] = useState<string[]>([]);
  const [voteAudience, setVoteAudience] = useState<AudienceType>("MEMBERS");
  const [voteRoleIds, setVoteRoleIds] = useState<string[]>([]);
  const [manageAudience, setManageAudience] = useState<AudienceType>("ADMINS_ONLY");
  const [manageRoleIds, setManageRoleIds] = useState<string[]>([]);

  const needsOptions = decisionType === "MULTI_OPTION" || decisionType === "POLL";

  const save = useMutation({
    mutationFn: async () => {
      const optionsPayload = needsOptions
        ? options.filter(o => o.label.trim()).map((o, i) => ({ id: i, label: o.label.trim(), description: o.description }))
        : decisionType === "VOTE_SIMPLE"
          ? [{ id: 0, label: "Yes" }, { id: 1, label: "No" }, { id: 2, label: "Abstain" }]
          : [{ id: 0, label: "I consent" }, { id: 1, label: "I object" }];

      const { error } = await supabase.from("decision_polls").insert({
        entity_type: "GUILD",
        entity_id: guildId,
        created_by: userId,
        question: title.trim(),
        description: description.trim() || null,
        decision_type: decisionType,
        options: optionsPayload,
        status: saveAsDraft ? "DRAFT" : "OPEN",
        closes_at: closesAt || null,
        quorum_type: quorumType,
        quorum_value: Number(quorumValue) || 0,
        pass_threshold: Number(passThreshold) || 50,
        allow_comments: allowComments,
        allow_vote_change: allowVoteChange,
        multi_select: multiSelect,
        visibility_audience_type: visibilityAudience,
        allowed_visibility_role_ids: visibilityRoleIds.length > 0 ? visibilityRoleIds : null,
        can_vote_audience_type: voteAudience,
        allowed_vote_role_ids: voteRoleIds.length > 0 ? voteRoleIds : null,
        can_manage_decision_audience_type: manageAudience,
        can_manage_decision_role_ids: manageRoleIds.length > 0 ? manageRoleIds : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: saveAsDraft ? "Decision saved as draft" : "Decision created & opened" });
      // Notify members (fire-and-forget)
      if (!saveAsDraft) {
        (async () => {
          try {
            const { data: guild } = await supabase.from("guilds").select("name").eq("id", guildId).maybeSingle();
            notifyDecisionCreated({
              entityType: "GUILD",
              entityId: guildId,
              entityName: guild?.name || "your guild",
              question: title.trim(),
              creatorUserId: userId,
            });
          } catch { /* silent */ }
        })();
      }
      onCreated();
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  return (
    <div className="space-y-4 mt-2">
      <div><label className="text-sm font-medium mb-1 block">Title / Question</label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What should we decide on?" maxLength={200} /></div>
      <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Context, background, relevant links…" className="resize-none min-h-[80px]" /></div>

      <div><label className="text-sm font-medium mb-1 block">Decision Type</label>
        <Select value={decisionType} onValueChange={v => setDecisionType(v as DecisionType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="VOTE_SIMPLE">Simple Vote (Yes / No / Abstain)</SelectItem>
            <SelectItem value="MULTI_OPTION">Multi-Option Choice</SelectItem>
            <SelectItem value="CONSENT">Consent (Consent / Object)</SelectItem>
            <SelectItem value="POLL">Poll (Non-binding sentiment)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {needsOptions && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Options</label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={opt.label} onChange={e => { const next = [...options]; next[i] = { ...opt, label: e.target.value }; setOptions(next); }} placeholder={`Option ${i + 1}`} />
              {options.length > 2 && <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setOptions(options.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button>}
            </div>
          ))}
          {options.length < 10 && <Button variant="outline" size="sm" onClick={() => setOptions([...options, { label: "" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add option</Button>}
          {decisionType === "MULTI_OPTION" && (
            <div className="flex items-center gap-2"><Switch checked={multiSelect} onCheckedChange={setMultiSelect} /><span className="text-sm">Allow selecting multiple options</span></div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm font-medium mb-1 block">Closes at (optional)</label><Input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} /></div>
        <div><label className="text-sm font-medium mb-1 block">Pass threshold (%)</label><Input type="number" value={passThreshold} onChange={e => setPassThreshold(e.target.value)} min={1} max={100} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm font-medium mb-1 block">Quorum type</label>
          <Select value={quorumType} onValueChange={setQuorumType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="PERCENT_OF_MEMBERS">% of members</SelectItem>
              <SelectItem value="ABSOLUTE_NUMBER">Absolute number</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {quorumType !== "NONE" && (
          <div><label className="text-sm font-medium mb-1 block">{quorumType === "PERCENT_OF_MEMBERS" ? "Quorum %" : "Min votes"}</label><Input type="number" value={quorumValue} onChange={e => setQuorumValue(e.target.value)} min={1} /></div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2"><Switch checked={allowComments} onCheckedChange={setAllowComments} /><span className="text-sm">Allow comments</span></div>
        <div className="flex items-center gap-2"><Switch checked={allowVoteChange} onCheckedChange={setAllowVoteChange} /><span className="text-sm">Allow vote change</span></div>
      </div>

      <Separator />

      {/* Audience Pickers */}
      <div className="space-y-3 rounded-lg border border-border p-3">
        <h4 className="text-sm font-semibold">Permissions</h4>
        <AudiencePicker
          label="Who can see this decision?"
          value={visibilityAudience}
          onChange={setVisibilityAudience}
          roles={entityRoles}
          selectedRoleIds={visibilityRoleIds}
          onRoleIdsChange={setVisibilityRoleIds}
        />
        <AudiencePicker
          label="Who can vote?"
          value={voteAudience}
          onChange={setVoteAudience}
          roles={entityRoles}
          selectedRoleIds={voteRoleIds}
          onRoleIdsChange={setVoteRoleIds}
        />
        <AudiencePicker
          label="Who can manage (close, edit outcome)?"
          value={manageAudience}
          onChange={setManageAudience}
          allowedTypes={["ADMINS_ONLY", "SELECTED_ROLES", "OPERATIONS_TEAM"]}
          roles={entityRoles}
          selectedRoleIds={manageRoleIds}
          onRoleIdsChange={setManageRoleIds}
        />
      </div>

      <div className="flex items-center gap-2"><Switch checked={saveAsDraft} onCheckedChange={setSaveAsDraft} /><span className="text-sm">Save as draft (don't open yet)</span></div>

      <Button onClick={() => save.mutate()} disabled={!title.trim() || save.isPending} className="w-full">
        {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
        {saveAsDraft ? "Save Draft" : "Create & Open"}
      </Button>
    </div>
  );
}

/* ═══════════ Decision Card ═══════════ */
function DecisionCard({ decision: d, isAdmin, isMember, currentUserId, currentUserRole, memberCount, guildId, onRefresh, permissionContext }: {
  decision: any; isAdmin: boolean; isMember: boolean; currentUserId: string; currentUserRole?: string; memberCount: number; guildId: string; onRefresh: () => void; permissionContext?: import("@/lib/permissions").PermissionContext;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [outcomeEdit, setOutcomeEdit] = useState(false);
  const [outcomeTxt, setOutcomeTxt] = useState(d.outcome_summary || "");

  const status = d.status as DecisionStatus;
  const type = (d.decision_type || "POLL") as DecisionType;
  const options = (Array.isArray(d.options) ? d.options : []) as Option[];
  const isOpen = status === "OPEN" && (!d.closes_at || !isPast(new Date(d.closes_at)));
  const isScheduled = status === "OPEN" && d.opens_at && isFuture(new Date(d.opens_at));

  // Use permission evaluator if context is available, otherwise fall back to legacy
  const decisionPerms = permissionContext
    ? evaluateDecisionPermissions(d, permissionContext)
    : null;
  const canVote = decisionPerms
    ? decisionPerms.canVote && isOpen && !isScheduled
    : isMember && isOpen && !isScheduled && (Array.isArray(d.eligible_roles) ? d.eligible_roles : ["MEMBER", "ADMIN"]).includes(currentUserRole || "MEMBER");
  const canManageDecision = decisionPerms ? decisionPerms.canManage : isAdmin;

  // Fetch votes
  const { data: votes = [] } = useQuery({
    queryKey: ["decision-votes", d.id],
    queryFn: async () => {
      const { data } = await supabase.from("decision_poll_votes").select("*").eq("poll_id", d.id);
      return data || [];
    },
  });

  const myVote = votes.find((v: any) => v.user_id === currentUserId);
  const totalVotes = votes.length;

  // Quorum check
  const quorumReached = d.quorum_type === "NONE" ? true
    : d.quorum_type === "PERCENT_OF_MEMBERS" ? (totalVotes / Math.max(memberCount, 1)) * 100 >= (d.quorum_value || 0)
    : totalVotes >= (d.quorum_value || 0);

  // Auto-close check
  const shouldBeClosedByTime = status === "OPEN" && d.closes_at && isPast(new Date(d.closes_at));

  // Admin actions
  const updateStatus = async (newStatus: string) => {
    await supabase.from("decision_polls").update({ status: newStatus } as any).eq("id", d.id);
    onRefresh();
    toast({ title: `Decision ${newStatus.toLowerCase()}` });
  };

  const saveOutcome = async () => {
    await supabase.from("decision_polls").update({ outcome_summary: outcomeTxt.trim() } as any).eq("id", d.id);
    setOutcomeEdit(false);
    onRefresh();
    toast({ title: "Outcome saved" });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left flex items-start gap-3 hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={cn("text-[10px]", STATUS_COLORS[status])}>{shouldBeClosedByTime ? "ENDED" : status}</Badge>
            <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[type]}</Badge>
            {d.closes_at && isOpen && <span className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-0.5" />Closes {formatDistanceToNow(new Date(d.closes_at), { addSuffix: true })}</span>}
          </div>
          <h4 className="font-display font-semibold">{d.question}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
            {!quorumReached && d.quorum_type !== "NONE" && <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="h-3 w-3" />Quorum not met</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 mt-1 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4">
              <Separator />

              {/* Outcome summary */}
              {d.outcome_summary && !outcomeEdit && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs font-medium text-primary mb-1">📋 Outcome</p>
                  <p className="text-sm">{d.outcome_summary}</p>
                  {canManageDecision && <Button variant="ghost" size="sm" className="mt-1" onClick={() => { setOutcomeEdit(true); setOutcomeTxt(d.outcome_summary); }}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>}
                </div>
              )}

              {outcomeEdit && (
                <div className="space-y-2">
                  <Textarea value={outcomeTxt} onChange={e => setOutcomeTxt(e.target.value)} placeholder="Summarize what was decided…" className="resize-none" />
                  <div className="flex gap-2"><Button size="sm" onClick={saveOutcome}>Save</Button><Button size="sm" variant="ghost" onClick={() => setOutcomeEdit(false)}>Cancel</Button></div>
                </div>
              )}

              {/* Description */}
              {d.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{d.description}</p>}

              {/* Voting UI */}
              <VotingSection
                decision={d}
                type={type}
                options={options}
                votes={votes}
                myVote={myVote}
                canVote={canVote}
                isOpen={isOpen && !isScheduled}
                totalVotes={totalVotes}
                memberCount={memberCount}
                quorumReached={quorumReached}
                onRefresh={onRefresh}
                currentUserId={currentUserId}
              />

              {/* Comments */}
              {d.allow_comments && (
                <div className="pt-2">
                  <p className="text-sm font-medium flex items-center gap-1 mb-2"><MessageSquare className="h-3.5 w-3.5" /> Discussion</p>
                  <CommentThread targetType={CommentTargetType.QUEST} targetId={d.id} />
                </div>
              )}

              {/* Admin controls */}
              {canManageDecision && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {status === "DRAFT" && <Button size="sm" onClick={() => updateStatus("OPEN")}><Check className="h-3.5 w-3.5 mr-1" /> Open Now</Button>}
                  {(status === "OPEN" || shouldBeClosedByTime) && <Button size="sm" variant="outline" onClick={() => updateStatus("CLOSED")}><X className="h-3.5 w-3.5 mr-1" /> Close</Button>}
                  {status === "CLOSED" && !outcomeEdit && <Button size="sm" variant="outline" onClick={() => setOutcomeEdit(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> Add Outcome</Button>}
                  {(status === "CLOSED") && <Button size="sm" variant="ghost" onClick={() => updateStatus("ARCHIVED")}><Archive className="h-3.5 w-3.5 mr-1" /> Archive</Button>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════ Voting Section ═══════════ */
function VotingSection({ decision, type, options, votes, myVote, canVote, isOpen, totalVotes, memberCount, quorumReached, onRefresh, currentUserId }: {
  decision: any; type: DecisionType; options: Option[]; votes: any[]; myVote: any; canVote: boolean; isOpen: boolean; totalVotes: number; memberCount: number; quorumReached: boolean; onRefresh: () => void; currentUserId: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [objReason, setObjReason] = useState("");

  const castVote = async (optionIndex: number, value?: string, objectionReason?: string) => {
    if (myVote) {
      if (!decision.allow_vote_change) { toast({ title: "Vote change not allowed" }); return; }
      // Update existing vote
      await supabase.from("decision_poll_votes").update({ option_index: optionIndex, value: value || null, objection_reason: objectionReason || null } as any).eq("id", myVote.id);
    } else {
      await supabase.from("decision_poll_votes").insert({
        poll_id: decision.id, user_id: currentUserId, option_index: optionIndex, value: value || null, objection_reason: objectionReason || null,
      } as any);
    }
    qc.invalidateQueries({ queryKey: ["decision-votes", decision.id] });
    onRefresh();
    toast({ title: "Vote recorded" });
  };

  // Tally per option
  const tally = options.map((_: any, i: number) => votes.filter((v: any) => v.option_index === i).length);
  const maxTally = Math.max(...tally, 1);

  // For consent type
  const consentCount = votes.filter((v: any) => v.value === "CONSENT" || v.option_index === 0).length;
  const objectionCount = votes.filter((v: any) => v.value === "OBJECTION" || v.option_index === 1).length;
  const objections = votes.filter((v: any) => (v.value === "OBJECTION" || v.option_index === 1) && v.objection_reason);

  return (
    <div className="space-y-3">
      {/* Vote buttons for VOTE_SIMPLE */}
      {type === "VOTE_SIMPLE" && (
        <div className="space-y-2">
          {canVote && (
            <div className="flex gap-2">
              <Button size="sm" variant={myVote?.option_index === 0 ? "default" : "outline"} onClick={() => castVote(0, "YES")} className="flex-1">
                <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Yes
              </Button>
              <Button size="sm" variant={myVote?.option_index === 1 ? "default" : "outline"} onClick={() => castVote(1, "NO")} className="flex-1">
                <ThumbsDown className="h-3.5 w-3.5 mr-1" /> No
              </Button>
              <Button size="sm" variant={myVote?.option_index === 2 ? "default" : "outline"} onClick={() => castVote(2, "ABSTAIN")} className="flex-1">
                <Minus className="h-3.5 w-3.5 mr-1" /> Abstain
              </Button>
            </div>
          )}
          {!canVote && myVote && <p className="text-xs text-muted-foreground">You voted: <strong>{["Yes", "No", "Abstain"][myVote.option_index]}</strong></p>}
          <ResultBars options={[{ label: "Yes" }, { label: "No" }, { label: "Abstain" }]} tally={tally} total={totalVotes} passThreshold={decision.pass_threshold} />
        </div>
      )}

      {/* MULTI_OPTION or POLL */}
      {(type === "MULTI_OPTION" || type === "POLL") && (
        <div className="space-y-2">
          {options.map((opt: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              {canVote && (
                <Button size="sm" variant={myVote?.option_index === i ? "default" : "outline"} className="shrink-0" onClick={() => castVote(i, "CHOICE")}>
                  {myVote?.option_index === i ? <Check className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{opt.label}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{tally[i]} vote{tally[i] !== 1 ? "s" : ""}</span>
                </div>
                <Progress value={totalVotes > 0 ? (tally[i] / totalVotes) * 100 : 0} className="h-1.5 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONSENT */}
      {type === "CONSENT" && (
        <div className="space-y-3">
          {canVote && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" variant={myVote?.option_index === 0 ? "default" : "outline"} onClick={() => castVote(0, "CONSENT")} className="flex-1">
                  <Check className="h-3.5 w-3.5 mr-1" /> I consent
                </Button>
                <Button size="sm" variant={myVote?.option_index === 1 ? "destructive" : "outline"} onClick={() => { if (objReason.trim()) castVote(1, "OBJECTION", objReason.trim()); else castVote(1, "OBJECTION"); }} className="flex-1">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" /> I object
                </Button>
              </div>
              <Input value={objReason} onChange={e => setObjReason(e.target.value)} placeholder="Reason for objection (optional)" className="text-sm" />
            </div>
          )}
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400"><Check className="h-3.5 w-3.5 inline mr-0.5" />{consentCount} consent</span>
            <span className={objectionCount > 0 ? "text-destructive" : "text-muted-foreground"}><AlertTriangle className="h-3.5 w-3.5 inline mr-0.5" />{objectionCount} objection{objectionCount !== 1 ? "s" : ""}</span>
          </div>
          {objections.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-destructive">Objections raised:</p>
              {objections.map((v: any) => <p key={v.id} className="text-xs text-muted-foreground bg-destructive/5 rounded px-2 py-1">"{v.objection_reason}"</p>)}
            </div>
          )}
          {objectionCount === 0 && totalVotes > 0 && <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">No objections — consent achieved</Badge>}
        </div>
      )}

      {/* Quorum info */}
      {decision.quorum_type !== "NONE" && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          Quorum: {totalVotes}/{decision.quorum_type === "PERCENT_OF_MEMBERS" ? `${Math.ceil(memberCount * (decision.quorum_value || 0) / 100)} (${decision.quorum_value}%)` : decision.quorum_value}
          {quorumReached ? <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] ml-1">Met</Badge> : <Badge variant="outline" className="text-[10px] ml-1">Not met</Badge>}
        </div>
      )}
    </div>
  );
}

/* ═══════════ Result Bars ═══════════ */
function ResultBars({ options, tally, total, passThreshold }: { options: Option[]; tally: number[]; total: number; passThreshold?: number }) {
  return (
    <div className="space-y-1.5">
      {options.map((opt, i) => {
        const pct = total > 0 ? Math.round((tally[i] / total) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-0.5">
              <span>{opt.label}</span>
              <span className="text-xs text-muted-foreground">{tally[i]} ({pct}%)</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}
