import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrustEdgeType, TrustNodeType, TrustVisibility } from "@/types/enums";
import { preCheckTrustEdge, parseTrustEdgeError, classifyTagSpecialization } from "@/lib/trustGraph";
import { Shield, AlertTriangle, Link2, Star, Info } from "lucide-react";

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

const EDGE_TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  skill_trust: { label: "Skill Trust", desc: "Trust in their technical or domain expertise" },
  reliability: { label: "Reliability", desc: "Dependable, follows through on commitments" },
  collaboration: { label: "Collaboration", desc: "Great to work with, co-creates effectively" },
  stewardship: { label: "Stewardship", desc: "Takes care of commons, governance, shared resources" },
  financial_trust: { label: "Financial Trust", desc: "Trustworthy in financial matters and resource management" },
};

const VISIBILITY_LABELS: Record<string, { label: string; desc: string }> = {
  public: { label: "Public", desc: "Visible to everyone (+1 credit)" },
  network: { label: "Network", desc: "Visible to authenticated users" },
  private: { label: "Private", desc: "Only visible to you" },
};

const SUGGESTED_TAGS = [
  "governance", "stewardship", "facilitation",
  "agroecology", "construction", "heritage", "crafts",
  "fundraising", "financial",
  "community", "hospitality", "mediation",
  "digital", "data", "ai", "product",
];

export function CreateTrustEdgeDialog({
  open,
  onOpenChange,
  targetNodeType,
  targetNodeId,
  targetName,
  contextQuestId,
  contextGuildId,
  contextTerritoryId,
  onCreated,
}: CreateTrustEdgeDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

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

  // Run pre-check when dialog opens or key fields change
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setCheckLoading(true);

    preCheckTrustEdge(
      user.id,
      TrustNodeType.PROFILE,
      user.id,
      targetNodeType,
      targetNodeId,
      edgeType,
      visibility
    ).then((result) => {
      if (!cancelled) {
        setPreCheck(result);
        setCheckLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setCheckLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, user?.id, edgeType, visibility, targetNodeType, targetNodeId]);

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
    }
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
      tags,
      context_quest_id: contextQuestId || null,
      context_guild_id: contextGuildId || null,
      context_territory_id: contextTerritoryId || null,
      status: "active" as any,
      created_by: user.id,
    });

    setSubmitting(false);

    if (error) {
      const msg = parseTrustEdgeError(error.message);
      toast({ title: "Attestation failed", description: msg, variant: "destructive" });
      return;
    }

    toast({ title: "Trust attestation created", description: `You attested ${EDGE_TYPE_LABELS[edgeType]?.label ?? edgeType} for ${targetName ?? "this entity"}.` });
    onOpenChange(false);
    onCreated?.();
    // Reset form
    setNote("");
    setEvidenceUrl("");
    setTags([]);
    setScore(3);
  };

  const hasWarnings = preCheck?.warnings && preCheck.warnings.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Create Trust Attestation
          </DialogTitle>
          <DialogDescription>
            Attest trust for <span className="font-semibold text-foreground">{targetName ?? targetNodeId}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warnings */}
          {hasWarnings && preCheck!.warnings.map((w, i) => (
            <Alert key={i} variant={preCheck!.canCreate ? "default" : "destructive"} className="text-sm">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{w}</AlertDescription>
            </Alert>
          ))}

          {/* Weekly usage indicator */}
          {preCheck && visibility === "public" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Public attestations this week: <span className="font-semibold text-foreground">{preCheck.publicThisWeek}/3</span></span>
            </div>
          )}

          {/* Edge Type */}
          <div className="space-y-1.5">
            <Label>Type of trust</Label>
            <Select value={edgeType} onValueChange={setEdgeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EDGE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <div className="flex flex-col">
                      <span>{v.label}</span>
                      <span className="text-xs text-muted-foreground">{v.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Score */}
          <div className="space-y-1.5">
            <Label>Score: <span className="font-semibold text-primary">{score}/5</span></Label>
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 cursor-pointer transition-colors ${s <= score ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
                  onClick={() => setScore(s)}
                />
              ))}
            </div>
            <Slider value={[score]} onValueChange={([v]) => setScore(v)} min={1} max={5} step={1} className="w-full" />
          </div>

          {/* Visibility */}
          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(VISIBILITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <div className="flex flex-col">
                      <span>{v.label}</span>
                      <span className="text-xs text-muted-foreground">{v.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground text-xs">({note.length}/300)</span></Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why do you trust this entity in this area?"
              maxLength={300}
              rows={3}
            />
          </div>

          {/* Evidence URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Evidence URL <span className="text-xs text-muted-foreground">(+1 credit)</span>
            </Label>
            <Input
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
            {preCheck?.isReciprocalRecent && !evidenceUrl && (
              <p className="text-xs text-warning">Providing evidence prevents XP halving for reciprocal attestations.</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags <span className="text-xs text-muted-foreground">(determines XP specialization)</span></Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => {
                const spec = classifyTagSpecialization(tag);
                return (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20 transition-colors"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    {spec && <span className="ml-1 text-[10px] opacity-60">({spec.replace("_", " ")})</span>}
                    <span className="ml-1 text-[10px]">×</span>
                  </Badge>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
                }}
                placeholder="Add a tag..."
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).slice(0, 8).map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="cursor-pointer text-xs hover:bg-accent/20 transition-colors"
                  onClick={() => addTag(t)}
                >
                  + {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || checkLoading || (preCheck !== null && !preCheck.canCreate)}
          >
            {submitting ? "Creating..." : "Create Attestation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
