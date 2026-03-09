/**
 * TerritoryAdminPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Steward-only admin panel for a territory portal.
 * Each section is gated by XP level + optionally $CTG balance.
 *
 * Tool sections:
 *  1. Portal Customization (images, summary, tags) — lvl 3+
 *  2. Member Management (view, approve, role assignments) — lvl 5+
 *  3. Quest Curation (pin quests, set featured) — lvl 5+
 *  4. Natural System Management (link/unlink NS) — lvl 6+
 *  5. Steward Delegation (assign co-stewards) — lvl 8+
 *  6. Territory Governance (proposals, budget) — lvl 10+
 *  7. Economy Tools (XP grants, CTG distributions) — lvl 12+
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings, Users, Compass, Leaf, Shield, Lock, Zap, Coins,
  Globe, Image, Tag, Plus, Trash2, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, TreePine, Star, Trophy, Vote,
} from "lucide-react";
import { LEVEL_LABELS, XP_LEVEL_THRESHOLDS } from "@/lib/xpCreditsConfig";

/* ── Types ── */
interface TerritoryAdminPanelProps {
  territoryId: string;
  territoryName: string;
  currentUserXpLevel: number;
  currentUserCtgBalance: number;
  isSuperAdmin?: boolean;
}

/* ── Section config ── */
interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  minXpLevel: number;
  minCtgBalance?: number;
  component: React.ComponentType<SectionProps>;
}

interface SectionProps {
  territoryId: string;
  territoryName: string;
  currentUserXpLevel: number;
}

/* ── Level gate ── */
function LevelGate({
  required,
  current,
  ctgRequired,
  ctgCurrent,
  children,
}: {
  required: number;
  current: number;
  ctgRequired?: number;
  ctgCurrent?: number;
  children: React.ReactNode;
}) {
  const xpOk = current >= required;
  const ctgOk = !ctgRequired || (ctgCurrent ?? 0) >= ctgRequired;
  const ok = xpOk && ctgOk;

  if (ok) return <>{children}</>;

  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
      <Lock className="h-6 w-6 text-muted-foreground/40 mx-auto" />
      <p className="text-sm text-muted-foreground">
        Requires{" "}
        <span className="font-semibold text-foreground">
          {LEVEL_LABELS[required] ?? `Level ${required}`}
        </span>{" "}
        (lvl {required}+)
        {ctgRequired && ` · ${ctgRequired} $CTG`}
      </p>
      <p className="text-xs text-muted-foreground opacity-60">
        You are level {current}{ctgRequired ? ` · ${ctgCurrent ?? 0} $CTG` : ""}
      </p>
    </div>
  );
}

/* ── Section: Portal Customization ── */
function PortalCustomizationSection({ territoryId, territoryName }: SectionProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [summary, setSummary] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: territory } = useQuery({
    queryKey: ["territory-admin-meta", territoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("territories")
        .select("summary, stats")
        .eq("id", territoryId)
        .single();
      return data;
    },
    onSuccess: (data: any) => {
      setSummary(data?.summary ?? "");
      setImageUrls(data?.stats?.images ?? []);
      setTags((data?.stats?.tags ?? []).join(", "));
    },
  } as any);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("territories")
        .update({
          summary,
          stats: {
            ...(territory as any)?.stats,
            images: imageUrls,
            tags: tags.split(",").map((t: string) => t.trim()).filter(Boolean),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", territoryId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["territory-detail", territoryId] });
      toast({ title: "Portal updated" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Territory description</Label>
        <Textarea
          placeholder={`Describe ${territoryName}...`}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Cover images (URLs)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="https://..."
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            className="text-sm"
            onKeyDown={e => { if (e.key === "Enter" && imageUrl.trim()) { setImageUrls(p => [...p, imageUrl.trim()]); setImageUrl(""); } }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => { if (imageUrl.trim()) { setImageUrls(p => [...p, imageUrl.trim()]); setImageUrl(""); } }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {imageUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted text-[11px]">
                <Image className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[120px] text-muted-foreground">{url.split("/").pop()}</span>
                <button onClick={() => setImageUrls(p => p.filter((_, j) => j !== i))} className="hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Tags (comma-separated)</Label>
        <Input placeholder="regenerative, food systems..." value={tags} onChange={e => setTags(e.target.value)} className="text-sm" />
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
        {saving ? "Saving..." : "Save portal"}
      </Button>
    </div>
  );
}

/* ── Section: Member Management ── */
function MemberManagementSection({ territoryId }: SectionProps) {
  const { data: members, isLoading } = useQuery({
    queryKey: ["territory-admin-members", territoryId],
    queryFn: async () => {
      const { data } = await (supabase
        .from("profiles")
        .select("user_id, name, avatar_url, headline, persona_type, xp_total")
        .eq("territory_id", territoryId)
        .order("xp_total", { ascending: false })
        .limit(20) as any);
      return data ?? [];
    },
    enabled: !!territoryId,
  });

  if (isLoading) return <div className="h-24 bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="space-y-2">
      {(members ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No members in this territory yet.</p>
      )}
      {(members ?? []).map((m: any) => (
        <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarImage src={m.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px]">{m.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{m.headline ?? m.persona_type}</p>
          </div>
          {m.xp_total && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              <Zap className="h-3 w-3 mr-1 text-amber-500" />
              {m.xp_total} XP
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Section: Quest Curation ── */
function QuestCurationSection({ territoryId, territoryName }: SectionProps) {
  const { toast } = useToast();
  const { data: quests } = useQuery({
    queryKey: ["territory-admin-quests", territoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_territories" as any)
        .select("quest_id, is_featured, quests(id, title, status, quest_nature)")
        .eq("territory_id", territoryId)
        .limit(20);
      return (data ?? []).map((r: any) => ({ ...r.quests, is_featured: r.is_featured })).filter(Boolean);
    },
  });

  const toggleFeatured = async (questId: string, current: boolean) => {
    await supabase
      .from("quest_territories" as any)
      .update({ is_featured: !current } as any)
      .eq("territory_id", territoryId)
      .eq("quest_id", questId);
    toast({ title: !current ? "Quest featured" : "Quest unfeatured" });
  };

  return (
    <div className="space-y-2">
      {(quests ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No quests linked to {territoryName}.</p>
      )}
      {(quests ?? []).map((q: any) => (
        <div key={q.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60">
          <Compass className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm flex-1 truncate">{q.title}</span>
          <Badge variant="outline" className="text-[10px] mr-2">{q.status}</Badge>
          <Button
            size="sm"
            variant={q.is_featured ? "secondary" : "outline"}
            onClick={() => toggleFeatured(q.id, q.is_featured)}
            className="text-[10px] h-6 px-2"
          >
            <Star className={cn("h-3 w-3 mr-1", q.is_featured && "fill-amber-500 text-amber-500")} />
            {q.is_featured ? "Featured" : "Feature"}
          </Button>
        </div>
      ))}
    </div>
  );
}

/* ── Section: Steward Delegation ── */
function StewardDelegationSection({ territoryId }: SectionProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [delegating, setDelegating] = useState(false);

  const { data: stewards } = useQuery({
    queryKey: ["territory-stewards-admin", territoryId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_territory_stewards" as any, {
        p_territory_id: territoryId,
        p_limit: 10,
      });
      return data ?? [];
    },
  });

  const handleDelegate = async () => {
    setDelegating(true);
    try {
      // Look up user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (!profile) throw new Error("User not found with that email");

      await supabase.from("trust_graph" as any).insert({
        from_id: profile.user_id,
        from_type: "user",
        to_id: territoryId,
        to_type: "territory",
        edge_type: "stewardship",
        weight: 1,
        tags: ["co-steward"],
      } as any);

      setEmail("");
      toast({ title: `${profile.name} added as co-steward` });
    } catch (e: any) {
      toast({ title: "Delegation failed", description: e.message, variant: "destructive" });
    } finally {
      setDelegating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Current stewards</Label>
        <div className="space-y-1.5">
          {(stewards ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">Only you for now.</p>
          )}
          {(stewards ?? []).map((s: any) => (
            <div key={s.from_id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-xs">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">{s.from_id}</span>
              {s.tags?.includes("pioneer") && (
                <Badge className="text-[9px] h-4 bg-amber-500/15 text-amber-600 border-amber-500/30 ml-auto">Pioneer</Badge>
              )}
              {s.tags?.includes("co-steward") && (
                <Badge className="text-[9px] h-4 bg-blue-500/15 text-blue-600 border-blue-500/30 ml-auto">Co-steward</Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Delegate a co-steward (by email)</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="member@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="text-sm"
          />
          <Button size="sm" onClick={handleDelegate} disabled={delegating || !email}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Section: Economy Tools ── */
function EconomyToolsSection({ territoryId, territoryName, currentUserXpLevel }: SectionProps) {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [xpAmount, setXpAmount] = useState("10");
  const [granting, setGranting] = useState(false);

  const handleGrantXp = async () => {
    if (!userId || !xpAmount) return;
    setGranting(true);
    try {
      const { error } = await supabase.from("xp_events" as any).insert({
        user_id: userId,
        event_type: "STEWARDSHIP_DUTY",
        xp_amount: parseInt(xpAmount, 10),
        related_entity_id: territoryId,
        related_entity_type: "territory",
        description: `Steward XP grant from ${territoryName} admin`,
      } as any);
      if (error) throw error;
      toast({ title: `+${xpAmount} XP granted` });
      setUserId("");
    } catch (e: any) {
      toast({ title: "Grant failed", description: e.message, variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-xs text-muted-foreground">
          Use these tools carefully. XP grants are permanent and visible in the contribution log.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Grant Stewardship XP to a member</Label>
        <Input
          placeholder="User ID"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="text-sm"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="XP amount"
            value={xpAmount}
            onChange={e => setXpAmount(e.target.value)}
            className="text-sm w-28"
            min={1}
            max={currentUserXpLevel >= 12 ? 200 : 50}
          />
          <span className="flex items-center text-xs text-muted-foreground">
            Max: {currentUserXpLevel >= 12 ? 200 : 50} XP
          </span>
        </div>
        <Button size="sm" onClick={handleGrantXp} disabled={granting || !userId} className="gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          {granting ? "Granting..." : "Grant XP"}
        </Button>
      </div>
    </div>
  );
}

/* ── Section config registry ── */
const ADMIN_SECTIONS = [
  {
    id: "portal",
    title: "Portal Customization",
    description: "Edit description, cover images and tags",
    icon: Globe,
    minXpLevel: 3,
    component: PortalCustomizationSection,
  },
  {
    id: "members",
    title: "Member Management",
    description: "View and manage members in this territory",
    icon: Users,
    minXpLevel: 5,
    component: MemberManagementSection,
  },
  {
    id: "quests",
    title: "Quest Curation",
    description: "Feature and pin quests in the portal",
    icon: Compass,
    minXpLevel: 5,
    component: QuestCurationSection,
  },
  {
    id: "stewards",
    title: "Steward Delegation",
    description: "Assign co-stewards and manage roles",
    icon: Shield,
    minXpLevel: 8,
    component: StewardDelegationSection,
  },
  {
    id: "economy",
    title: "Economy Tools",
    description: "Grant XP to contributors and manage CTG flows",
    icon: Coins,
    minXpLevel: 12,
    component: EconomyToolsSection,
  },
] as const;

/* ── Collapsible section card ── */
function AdminSectionCard({
  section,
  currentUserXpLevel,
  currentUserCtgBalance,
  territoryId,
  territoryName,
}: {
  section: typeof ADMIN_SECTIONS[number];
  currentUserXpLevel: number;
  currentUserCtgBalance: number;
  territoryId: string;
  territoryName: string;
}) {
  const [open, setOpen] = useState(false);
  const locked = currentUserXpLevel < section.minXpLevel;
  const Icon = section.icon;
  const SectionComp = section.component as React.ComponentType<SectionProps>;

  return (
    <Card className={cn("transition-all", locked && "opacity-60")}>
      <button
        className="w-full text-left"
        onClick={() => !locked && setOpen(o => !o)}
      >
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
              locked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
            )}>
              {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-4.5 w-4.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{section.title}</CardTitle>
                {locked && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    lvl {section.minXpLevel}+
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
            </div>
            {!locked && (
              open
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        </CardHeader>
      </button>

      {open && !locked && (
        <CardContent className="pt-0 px-4 pb-4">
          <div className="border-t border-border/60 pt-4">
            <SectionComp
              territoryId={territoryId}
              territoryName={territoryName}
              currentUserXpLevel={currentUserXpLevel}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ── Main component ── */
export function TerritoryAdminPanel({
  territoryId,
  territoryName,
  currentUserXpLevel,
  currentUserCtgBalance,
  isSuperAdmin = false,
}: TerritoryAdminPanelProps) {
  const levelLabel = LEVEL_LABELS[currentUserXpLevel] ?? `Level ${currentUserXpLevel}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Steward Admin — {territoryName}</h2>
          <p className="text-xs text-muted-foreground">
            Your level: <span className="font-medium text-foreground">{levelLabel}</span> (lvl {currentUserXpLevel})
            {" · "}{currentUserCtgBalance} $CTG
          </p>
        </div>
        {isSuperAdmin && (
          <Badge className="ml-auto bg-destructive/15 text-destructive border-destructive/30">
            Super Admin
          </Badge>
        )}
      </div>

      {/* XP ladder hint */}
      <div className="rounded-xl bg-muted/30 border border-border/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-foreground">Admin capabilities unlock with XP level</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[3, 5, 8, 12].map(lvl => (
            <div
              key={lvl}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border",
                currentUserXpLevel >= lvl
                  ? "bg-success/10 text-success border-success/30"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {currentUserXpLevel >= lvl ? "✓" : "⌛"} lvl {lvl}+ · {LEVEL_LABELS[lvl]}
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {ADMIN_SECTIONS.map(section => (
          <AdminSectionCard
            key={section.id}
            section={section}
            currentUserXpLevel={currentUserXpLevel}
            currentUserCtgBalance={currentUserCtgBalance}
            territoryId={territoryId}
            territoryName={territoryName}
          />
        ))}
      </div>
    </div>
  );
}
