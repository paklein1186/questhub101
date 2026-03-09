/**
 * TerritoryUnlockModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-step modal for "unlocking" (pioneering) a territory that has no steward yet.
 *
 * Steps:
 *  1. Welcome — explain what pioneering means (XP requirements check)
 *  2. Customize — set territory description, cover images, tags
 *  3. Commitment — territorial stewardship pledge + confirm
 *  4. Success — earn Pioneer badge, redirect to portal
 *
 * Checks:
 *  - User must be XP level ≥ 3 (Seedling) to pioneer a Town
 *  - Level ≥ 5 (Sprout) for Region
 *  - Level ≥ 7 (Pollinator) for National / Continent
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sprout, Star, Shield, TreePine, Zap,
  CheckCircle2, ArrowRight, ChevronLeft, AlertCircle, Globe,
} from "lucide-react";

/* ── XP requirements per level ── */
const UNLOCK_REQUIREMENTS: Record<string, { minXpLevel: number; label: string }> = {
  TOWN:      { minXpLevel: 3,  label: "Seedling (lvl 3+)" },
  LOCALITY:  { minXpLevel: 3,  label: "Seedling (lvl 3+)" },
  PROVINCE:  { minXpLevel: 5,  label: "Sprout (lvl 5+)" },
  REGION:    { minXpLevel: 5,  label: "Sprout (lvl 5+)" },
  NATIONAL:  { minXpLevel: 7,  label: "Pollinator (lvl 7+)" },
  CONTINENT: { minXpLevel: 9,  label: "Harvester (lvl 9+)" },
  GLOBAL:    { minXpLevel: 12, label: "Ecosystem Builder (lvl 12+)" },
};

/* ── Steward pledge lines ── */
const STEWARD_PLEDGE = [
  "I will contribute to quests and activities in this territory",
  "I will help onboard new members with care and openness",
  "I will act as a guardian of local natural systems",
  "I will uphold the CTG community guidelines",
  "I understand that stewardship can be passed on if I become inactive",
];

/* ── Types ── */
interface TerritoryUnlockModalProps {
  open: boolean;
  onClose: () => void;
  territory: {
    id: string;
    name: string;
    level: string;
    slug?: string | null;
  };
  currentUserXpLevel: number;
  currentUserId: string;
}

/* ── Mutation ── */
function useUnlockTerritory() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      territoryId,
      userId,
      summary,
      imageUrls,
      tags,
    }: {
      territoryId: string;
      userId: string;
      summary: string;
      imageUrls: string[];
      tags: string[];
    }) => {
      // Pre-flight: check if stewardship edge already exists
      const { data: existing } = await (supabase.from("trust_edges") as any)
        .select("id")
        .eq("from_node_id", userId)
        .eq("to_node_id", territoryId)
        .eq("edge_type", "stewardship")
        .maybeSingle();
      if (existing) throw new Error("You are already a steward of this territory.");

      // 1. Update territory with summary and meta
      const { error: terrErr } = await supabase
        .from("territories")
        .update({
          summary,
          stats: { images: imageUrls, tags },
          updated_at: new Date().toISOString(),
        })
        .eq("id", territoryId);
      if (terrErr) throw terrErr;

      // 2. Upsert pioneer steward edge (safe against race conditions)
      await (supabase.from("trust_edges") as any).upsert({
        from_node_id: userId,
        from_node_type: "user",
        to_node_id: territoryId,
        to_node_type: "territory",
        edge_type: "stewardship",
        score: 1,
        tags: ["pioneer"],
        status: "active",
        created_by: userId,
      } as any, { onConflict: "from_node_id,to_node_id,edge_type", ignoreDuplicates: true });

      // 3. Set territory as user's primary territory
      await supabase
        .from("profiles")
        .update({ territory_id: territoryId } as any)
        .eq("user_id", userId);

      // 4. Award XP for pioneering
      await (supabase.from("xp_events" as any) as any).insert({
        user_id: userId,
        event_type: "TERRITORY_PIONEER",
        xp_amount: 50,
        related_entity_id: territoryId,
        related_entity_type: "territory",
        description: `Pioneered territory: ${territoryId}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["territory-detail"] });
      qc.invalidateQueries({ queryKey: ["territory-member-count"] });
      qc.invalidateQueries({ queryKey: ["territory-portal-stewards"] });
      qc.invalidateQueries({ queryKey: ["territory-portal-grid"] });
      toast({ title: "Territory unlocked! 🌱", description: "You are now the founding steward." });
    },
    onError: (e: any) => {
      toast({ title: "Failed to unlock", description: e.message, variant: "destructive" });
    },
  });
}

/* ── Step indicator ── */
function StepDot({ active, done, num }: { active: boolean; done: boolean; num: number }) {
  return (
    <div
      className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
        done
          ? "bg-primary border-primary text-primary-foreground"
          : active
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-background border-border text-muted-foreground"
      )}
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : num}
    </div>
  );
}

/* ── Main component ── */
export function TerritoryUnlockModal({
  open,
  onClose,
  territory,
  currentUserXpLevel,
  currentUserId,
}: TerritoryUnlockModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [summary, setSummary] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [pledgeChecked, setPledgeChecked] = useState(false);

  const req = UNLOCK_REQUIREMENTS[territory.level?.toUpperCase()] ?? UNLOCK_REQUIREMENTS["TOWN"];
  const canUnlock = currentUserXpLevel >= req.minXpLevel;

  const unlockMutation = useUnlockTerritory();

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      setImageUrls(prev => [...prev, imageUrl.trim()]);
      setImageUrl("");
    }
  };

  const handleUnlock = async () => {
    await unlockMutation.mutateAsync({
      territoryId: territory.id,
      userId: currentUserId,
      summary,
      imageUrls,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setStep(4);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-amber-500" />
            Pioneer {territory.name}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        {step < 4 && (
          <div className="flex items-center gap-2 py-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-2">
                <StepDot num={n} active={step === n} done={step > n} />
                {n < 3 && <div className={cn("h-0.5 w-8 rounded-full", step > n ? "bg-primary" : "bg-border")} />}
              </div>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">Step {step} of 3</span>
          </div>
        )}

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <p className="text-sm font-semibold text-foreground">What is pioneering?</p>
              </div>
              <p className="text-sm text-muted-foreground">
                As a pioneer, you become the founding steward of <strong>{territory.name}</strong>. You'll
                set the tone, welcome new members, and help this territory thrive within the CTG network.
              </p>
              <ul className="space-y-1.5">
                {[
                  "Earn the Pioneer badge (+50 XP)",
                  "Appear as founding steward in the portal",
                  "Access territory admin tools",
                  "Customize the territory's portal",
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* XP check */}
            <div className={cn(
              "rounded-xl border p-4 flex items-center gap-3",
              canUnlock
                ? "border-primary/30 bg-primary/5"
                : "border-destructive/30 bg-destructive/5"
            )}>
              <div className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                canUnlock ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
              )}>
                {canUnlock ? <Shield className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {canUnlock ? "You meet the requirements" : "Level requirement not met"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Requires {req.label} · You are level {currentUserXpLevel}
                </p>
              </div>
              {canUnlock && (
                <Badge className="ml-auto bg-primary/15 text-primary border-primary/30">
                  ✓ Eligible
                </Badge>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canUnlock}
                className="gap-1.5"
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Customize ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Give {territory.name} a voice. These details will appear on the public portal.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="ter-summary" className="text-xs font-medium">
                Territory description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="ter-summary"
                placeholder={`What makes ${territory.name} special? Describe its ecosystem, community, and regenerative projects...`}
                value={summary}
                onChange={e => setSummary(e.target.value)}
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Cover image URLs <span className="text-muted-foreground">(one per line or add via button)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/photo.jpg"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="text-sm"
                  onKeyDown={e => e.key === "Enter" && handleAddImage()}
                />
                <Button size="sm" variant="outline" onClick={handleAddImage}>Add</Button>
              </div>
              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageUrls.map((url, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground"
                    >
                      <span className="truncate max-w-[140px]">{url.split("/").pop()}</span>
                      <button
                        onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ter-tags" className="text-xs font-medium">
                Tags <span className="text-muted-foreground">(comma-separated)</span>
              </Label>
              <Input
                id="ter-tags"
                placeholder="regenerative, permaculture, urban farming..."
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="gap-1.5">
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Pledge ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Steward's Pledge</p>
              </div>
              <ul className="space-y-2">
                {STEWARD_PLEDGE.map(line => (
                  <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Sprout className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={pledgeChecked}
                onChange={e => setPledgeChecked(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                I accept the steward's pledge for <strong>{territory.name}</strong>
              </span>
            </label>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
              <Button
                onClick={handleUnlock}
                disabled={!pledgeChecked || unlockMutation.isPending}
                className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              >
                {unlockMutation.isPending ? (
                  "Unlocking..."
                ) : (
                  <>
                    <Star className="h-3.5 w-3.5 fill-white" /> Pioneer this Territory
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="text-center py-6 space-y-5">
            <div className="h-20 w-20 rounded-full bg-primary/15 border-4 border-primary/30 flex items-center justify-center mx-auto">
              <TreePine className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-foreground">
                {territory.name} is now alive! 🌱
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                You are the founding steward. The portal is now active and visible to the world.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">+50 XP earned</span>
              <Badge className="bg-amber-500 text-white text-[10px] border-0">Pioneer</Badge>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                onClick={() => {
                  onClose();
                  navigate(`/territories/${territory.slug ?? territory.id}?tab=admin`);
                }}
                className="gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" /> Open Admin Panel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  setStep(1);
                }}
              >
                Back to Portal
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
