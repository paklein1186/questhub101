import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrustNodeType } from "@/types/enums";
import { preCheckTrustEdge, parseTrustEdgeError, classifyTagSpecialization } from "@/lib/trustGraph";
import { Shield, AlertTriangle, Link2, Star, Info, ChevronLeft, ChevronRight, Check, Eye, EyeOff, Users, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CreateTrustEdgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetNodeType: TrustNodeType;
  targetNodeId: string;
  targetName?: string;
  contextQuestId?: string;
  contextGuildId?: string;
  contextTerritoryId?: string;
  onCreated?: () => void;
}

const EDGE_TYPE_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  skill_trust: { label: "Skill Trust", desc: "Trust in their technical or domain expertise", icon: "🎯" },
  reliability: { label: "Reliability", desc: "Dependable, follows through on commitments", icon: "🤝" },
  collaboration: { label: "Collaboration", desc: "Great to work with, co-creates effectively", icon: "🔗" },
  stewardship: { label: "Stewardship", desc: "Takes care of commons, governance, shared resources", icon: "🌿" },
  financial_trust: { label: "Financial Trust", desc: "Trustworthy in financial matters", icon: "💎" },
};

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", desc: "Visible to everyone. Earns +1 credit and full XP.", icon: Eye },
  { value: "network", label: "Network", desc: "Visible to authenticated users only.", icon: Users },
  { value: "private", label: "Private", desc: "Only visible to you. No XP granted.", icon: EyeOff },
];

const SUGGESTED_TAGS = [
  "governance", "stewardship", "facilitation",
  "agroecology", "construction", "heritage", "crafts",
  "fundraising", "financial",
  "community", "hospitality", "mediation",
  "digital", "data", "ai", "product",
];

const NODE_TYPE_LABELS: Record<string, string> = {
  profile: "Person",
  guild: "Guild",
  quest: "Quest",
  service: "Service",
  partner_entity: "Partner",
  territory: "Territory",
};

const TOTAL_STEPS = 5;

export function CreateTrustEdgeDialog({
  open,
  onOpenChange,
  targetNodeType,
  targetNodeId,
  targetName,
  contextQuestId: initialQuestId,
  contextGuildId: initialGuildId,
  contextTerritoryId: initialTerritoryId,
  onCreated,
}: CreateTrustEdgeDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [edgeType, setEdgeType] = useState<string>("collaboration");
  const [score, setScore] = useState(3);
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [visibility, setVisibility] = useState<string>("public");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preCheck, setPreCheck] = useState<Awaited<ReturnType<typeof preCheckTrustEdge>> | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  // Context pickers
  const [contextQuestId, setContextQuestId] = useState(initialQuestId ?? "");
  const [contextGuildId, setContextGuildId] = useState(initialGuildId ?? "");
  const [contextTerritoryId, setContextTerritoryId] = useState(initialTerritoryId ?? "");
  const [contextSearch, setContextSearch] = useState("");

  // Fetch user's quests, guilds, territories for context picker
  const { data: myGuilds } = useQuery({
    queryKey: ["my-guilds-for-trust"],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("guild_members")
        .select("guild_id, guilds(id, name)")
        .eq("user_id", user.id)
        .limit(50);
      return (data ?? []).map((gm: any) => ({ id: gm.guilds?.id, name: gm.guilds?.name })).filter((g: any) => g.id);
    },
    enabled: open && !!user?.id,
  });

  const { data: myQuests } = useQuery({
    queryKey: ["my-quests-for-trust"],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("quest_participants")
        .select("quest_id, quests(id, title)")
        .eq("user_id", user.id)
        .limit(50);
      return (data ?? []).map((qp: any) => ({ id: qp.quests?.id, name: qp.quests?.title })).filter((q: any) => q.id);
    },
    enabled: open && !!user?.id,
  });

  const { data: myTerritories } = useQuery({
    queryKey: ["my-territories-for-trust"],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("user_territories")
        .select("territory_id, territories(id, name)")
        .eq("user_id", user.id)
        .limit(50);
      return (data ?? []).map((ut: any) => ({ id: ut.territories?.id, name: ut.territories?.name })).filter((t: any) => t.id);
    },
    enabled: open && !!user?.id,
  });

  // Fetch existing tags for autocomplete
  const { data: existingTags } = useQuery({
    queryKey: ["trust-edge-tags"],
    queryFn: async () => {
      const { data } = await supabase.from("trust_edges").select("tags").not("tags", "is", null).limit(200);
      const tagSet = new Set<string>();
      (data ?? []).forEach((row: any) => {
        if (Array.isArray(row.tags)) row.tags.forEach((t: string) => { if (!t.startsWith("__")) tagSet.add(t); });
      });
      return Array.from(tagSet).sort();
    },
    enabled: open,
    staleTime: 60_000,
  });

  const filteredAutoTags = useMemo(() => {
    if (!tagInput.trim()) return [];
    const q = tagInput.toLowerCase();
    const all = [...new Set([...(existingTags ?? []), ...SUGGESTED_TAGS])];
    return all.filter((t) => t.includes(q) && !tags.includes(t)).slice(0, 8);
  }, [tagInput, existingTags, tags]);

  // Pre-check on step change
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setCheckLoading(true);
    preCheckTrustEdge(user.id, TrustNodeType.PROFILE, user.id, targetNodeType, targetNodeId, edgeType, visibility)
      .then((r) => { if (!cancelled) { setPreCheck(r); setCheckLoading(false); } })
      .catch(() => { if (!cancelled) setCheckLoading(false); });
    return () => { cancelled = true; };
  }, [open, user?.id, edgeType, visibility, targetNodeType, targetNodeId]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setEdgeType("collaboration");
      setScore(3);
      setNote("");
      setEvidenceUrl("");
      setVisibility("public");
      setTags([]);
      setTagInput("");
      setContextQuestId(initialQuestId ?? "");
      setContextGuildId(initialGuildId ?? "");
      setContextTerritoryId(initialTerritoryId ?? "");
    }
  }, [open]);

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (preCheck && !preCheck.canCreate) {
      toast({ title: "Cannot create attestation", description: preCheck.warnings[0], variant: "destructive" });
      return;
    }
    if (note.length > 300) {
      toast({ title: "Note too long", description: "Note must be 300 characters or fewer.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("trust_edges").insert({
      from_node_type: TrustNodeType.PROFILE as any,
      from_node_id: user.id,
      to_node_type: targetNodeType as any,
      to_node_id: targetNodeId,
      edge_type: edgeType as any,
      score,
      note: note || null,
      evidence_url: evidenceUrl || null,
      visibility: visibility as any,
      tags: tags.filter((t) => !t.startsWith("__")),
      context_quest_id: contextQuestId && contextQuestId !== "none" ? contextQuestId : null,
      context_guild_id: contextGuildId && contextGuildId !== "none" ? contextGuildId : null,
      context_territory_id: contextTerritoryId && contextTerritoryId !== "none" ? contextTerritoryId : null,
      status: "active" as any,
      created_by: user.id,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Attestation failed", description: parseTrustEdgeError(error.message), variant: "destructive" });
      return;
    }

    toast({ title: "Trust attestation created ✨", description: `You attested ${EDGE_TYPE_LABELS[edgeType]?.label} for ${targetName ?? "this entity"}.` });

    // Emit $CTG for trust given
    supabase.rpc('emit_ctg_for_contribution', {
      p_user_id: user.id,
      p_contribution_type: 'trust_given',
      p_related_entity_id: targetNodeId,
      p_related_entity_type: 'trust_edge',
    } as any).then(() => {});

    onOpenChange(false);
    onCreated?.();
  };

  const canProceed = () => {
    switch (step) {
      case 1: return true; // Confirm target
      case 2: return !!edgeType;
      case 3: return true; // Tags & context optional
      case 4: return score >= 1 && score <= 5 && note.length <= 300;
      case 5: return !!visibility && (preCheck === null || preCheck.canCreate);
      default: return true;
    }
  };

  const hasWarnings = preCheck?.warnings && preCheck.warnings.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Give Trust — Step {step}/{TOTAL_STEPS}
          </DialogTitle>
          <DialogDescription className="sr-only">Create a trust attestation</DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />

        {/* Warnings (shown on every step) */}
        {hasWarnings && preCheck!.warnings.map((w, i) => (
          <Alert key={i} variant={preCheck!.canCreate ? "default" : "destructive"} className="text-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{w}</AlertDescription>
          </Alert>
        ))}

        <div className="py-2 min-h-[200px]">
          {/* ── Step 1: Confirm target ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">You are about to attest trust for:</p>
              <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {(targetName ?? "?")[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{targetName ?? targetNodeId.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{NODE_TYPE_LABELS[targetNodeType] ?? targetNodeType}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Trust attestations are part of the Open Trust Graph and contribute to this entity's reputation across the ecosystem.</p>
            </div>
          )}

          {/* ── Step 2: Edge type ── */}
          {step === 2 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">What kind of trust?</Label>
              <div className="grid gap-2">
                {Object.entries(EDGE_TYPE_LABELS).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setEdgeType(k)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      edgeType === k
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-xl">{v.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{v.label}</p>
                      <p className="text-xs text-muted-foreground">{v.desc}</p>
                    </div>
                    {edgeType === k && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Tags & Context ── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Tags <span className="font-normal text-xs text-muted-foreground">(determines XP specialization)</span></Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => {
                    const spec = classifyTagSpecialization(tag);
                    return (
                      <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-destructive/20 transition-colors" onClick={() => removeTag(tag)}>
                        {tag}
                        {spec && <span className="ml-1 text-[10px] opacity-60">({spec.replace(/_/g, " ")})</span>}
                        <span className="ml-1 text-[10px]">×</span>
                      </Badge>
                    );
                  })}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                    placeholder="Search or add tags..."
                    className="pl-8"
                  />
                </div>
                {/* Autocomplete dropdown */}
                {filteredAutoTags.length > 0 && (
                  <div className="rounded-md border bg-popover p-1 shadow-md max-h-32 overflow-y-auto">
                    {filteredAutoTags.map((t) => (
                      <button key={t} onClick={() => addTag(t)} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors">
                        {t}
                        {classifyTagSpecialization(t) && <span className="ml-1.5 text-[10px] text-muted-foreground">({classifyTagSpecialization(t)?.replace(/_/g, " ")})</span>}
                      </button>
                    ))}
                  </div>
                )}
                {!tagInput && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).slice(0, 10).map((t) => (
                      <Badge key={t} variant="outline" className="cursor-pointer text-xs hover:bg-accent/20 transition-colors" onClick={() => addTag(t)}>+ {t}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Context */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Context <span className="font-normal text-xs text-muted-foreground">(optional — earns bonus XP)</span></Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Quest (+1 XP)</Label>
                    <Select value={contextQuestId} onValueChange={setContextQuestId}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No quest context" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(myQuests ?? []).map((q: any) => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Guild (+2 XP)</Label>
                    <Select value={contextGuildId} onValueChange={setContextGuildId}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No guild context" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(myGuilds ?? []).map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Territory (+3 XP)</Label>
                    <Select value={contextTerritoryId} onValueChange={setContextTerritoryId}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No territory context" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(myTerritories ?? []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Score, Note, Evidence ── */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Score */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Trust score</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setScore(s)} className="group flex flex-col items-center gap-0.5">
                      <Star className={`h-7 w-7 transition-all ${s <= score ? "text-primary fill-primary scale-110" : "text-muted-foreground/30 group-hover:text-primary/40"}`} />
                      <span className="text-[10px] text-muted-foreground">{s}</span>
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-semibold text-primary">{score}/5</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {score <= 2 ? "Low trust — still valuable for honest signal" : score <= 4 ? "Solid trust based on direct experience" : "Exceptional trust — strong conviction"}
                </p>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Note <span className="font-normal text-xs text-muted-foreground">({note.length}/300)</span></Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 300))}
                  placeholder="Why do you trust this entity in this area? What's your experience?"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Evidence */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <Link2 className="h-3.5 w-3.5" /> Evidence URL
                  <span className="font-normal text-xs text-muted-foreground">(+1 credit)</span>
                </Label>
                <Input
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://link-to-proof.example.com"
                  type="url"
                />
                {preCheck?.isReciprocalRecent && !evidenceUrl && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Reciprocal trust detected — add evidence to prevent XP halving.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 5: Visibility & Review ── */}
          {step === 5 && (
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Visibility</Label>
              <div className="grid gap-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setVisibility(opt.value)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        visibility === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 ${visibility === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      {visibility === opt.value && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {preCheck && visibility === "public" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  Public attestations this week: <span className="font-semibold text-foreground">{preCheck.publicThisWeek}/3</span>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-medium text-foreground">{targetName ?? targetNodeId.slice(0, 8)}</span>
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">{EDGE_TYPE_LABELS[edgeType]?.label}</span>
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-medium text-foreground">{score}/5</span>
                  <span className="text-muted-foreground">Visibility</span>
                  <span className="font-medium text-foreground capitalize">{visibility}</span>
                  {tags.length > 0 && (
                    <>
                      <span className="text-muted-foreground">Tags</span>
                      <span className="font-medium text-foreground">{tags.join(", ")}</span>
                    </>
                  )}
                  {note && (
                    <>
                      <span className="text-muted-foreground">Note</span>
                      <span className="font-medium text-foreground truncate">{note.slice(0, 60)}{note.length > 60 ? "…" : ""}</span>
                    </>
                  )}
                  {evidenceUrl && (
                    <>
                      <span className="text-muted-foreground">Evidence</span>
                      <span className="font-medium text-foreground truncate">✓ Provided</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || checkLoading || !canProceed()} className="gap-1">
              {submitting ? "Creating…" : <>Create Attestation <Check className="h-4 w-4" /></>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
