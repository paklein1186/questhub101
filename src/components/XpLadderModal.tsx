import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { XP_LEVEL_THRESHOLDS, LEVEL_LABELS, LEVEL_DESCRIPTIONS } from "@/lib/xpCreditsConfig";
import { GOVERNANCE_RIGHTS, GOVERNANCE_BODIES, VOTING_THRESHOLDS, getTranslocalBadge, TERRITORY_MULTIPLIERS } from "@/lib/governanceConfig";
import { type LucideIcon, Circle, Droplet, Sprout, Anchor, Leaf, GitBranch, Flower2, TreePine, Wheat, Sparkles, Waypoints, TreeDeciduous, Shield, ShieldCheck, Trees, Lock, Unlock, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface XpLadderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLevel?: number;
  currentXp?: number;
}

const LEVEL_ICONS: Record<number, LucideIcon> = {
  1: Circle, 2: Droplet, 3: Sprout, 4: Anchor, 5: Leaf,
  6: GitBranch, 7: Flower2, 8: TreePine, 9: Wheat, 10: Sparkles,
  11: Waypoints, 12: TreeDeciduous, 13: Shield, 14: ShieldCheck, 15: Trees,
};

const LEVEL_COLORS: Record<number, string> = {
  1: "text-[hsl(120,20%,70%)]", 2: "text-[hsl(120,22%,65%)]", 3: "text-[hsl(120,25%,60%)]",
  4: "text-[hsl(130,30%,45%)]", 5: "text-[hsl(130,32%,42%)]", 6: "text-[hsl(135,35%,38%)]",
  7: "text-[hsl(145,40%,32%)]", 8: "text-[hsl(148,42%,30%)]", 9: "text-[hsl(150,45%,28%)]",
  10: "text-[hsl(170,45%,35%)]", 11: "text-[hsl(172,48%,32%)]", 12: "text-[hsl(175,50%,30%)]",
  13: "text-[hsl(155,55%,30%)]", 14: "text-[hsl(155,55%,28%)]", 15: "text-[hsl(45,70%,45%)]",
};

const SPHERE_COLORS: Record<string, string> = {
  personal: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  guild: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  territory: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  platform: "bg-violet-500/10 text-violet-700 border-violet-500/30",
};

export function XpLadderModal({ open, onOpenChange, currentLevel, currentXp }: XpLadderModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Leaf className="h-5 w-5 text-[hsl(135,35%,38%)]" />
            The Regenerative Collaboration Ladder
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="levels" className="text-xs">Levels</TabsTrigger>
            <TabsTrigger value="governance" className="text-xs">Governance</TabsTrigger>
            <TabsTrigger value="how" className="text-xs">How XP Works</TabsTrigger>
          </TabsList>

          {/* ─── Overview ─── */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This platform recognizes contribution and collaboration through a regenerative progression model.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              XP reflects <strong className="text-foreground">trust, participation, and ecosystem impact</strong>.
              It is not financial capital and cannot be bought.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Higher levels reflect deeper collaboration, cross-territory contribution, and commons stewardship.
            </p>

            {currentLevel != null && currentXp != null && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = LEVEL_ICONS[currentLevel] || Circle;
                    return <Icon className={`h-5 w-5 ${LEVEL_COLORS[currentLevel] || ""}`} />;
                  })()}
                  <span className="font-semibold">
                    Level {currentLevel} – {LEVEL_LABELS[currentLevel]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{LEVEL_DESCRIPTIONS[currentLevel]}</p>
                {(() => {
                  const next = XP_LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
                  const current = XP_LEVEL_THRESHOLDS.find(t => t.level === currentLevel);
                  if (!next || !current) return <p className="text-xs text-muted-foreground">🌿 Maximum level reached</p>;
                  const progress = ((currentXp - current.minXp) / (next.minXp - current.minXp)) * 100;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{currentXp} XP</span>
                        <span>{next.minXp} XP</span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                      <p className="text-[10px] text-muted-foreground">
                        {next.minXp - currentXp} XP to {LEVEL_LABELS[next.level]}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          {/* ─── Levels ─── */}
          <TabsContent value="levels" className="mt-4">
            <ScrollArea className="h-[50vh] pr-2">
              <div className="space-y-1">
                {XP_LEVEL_THRESHOLDS.map(({ level, minXp }) => {
                  const Icon = LEVEL_ICONS[level] || Circle;
                  const isActive = currentLevel != null && level === currentLevel;
                  const isPast = currentLevel != null && level < currentLevel;
                  return (
                    <div
                      key={level}
                      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                        isActive ? "bg-accent/60 border border-primary/20" : isPast ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border border-border shrink-0 mt-0.5">
                        <Icon className={`h-4 w-4 ${LEVEL_COLORS[level] || ""}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Lv{level} – {LEVEL_LABELS[level]}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{minXp.toLocaleString()} XP</span>
                          {isActive && (
                            <span className="text-[10px] font-medium text-primary">← You</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{LEVEL_DESCRIPTIONS[level]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Governance & Responsibility ─── */}
          <TabsContent value="governance" className="mt-4">
            <ScrollArea className="h-[50vh] pr-2">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Higher levels unlock governance responsibility. Governance is service to the commons, not hierarchy. Rights can be revoked if misused.
                </p>

                {/* Current governance status */}
                {currentLevel != null && (
                  <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <p className="text-xs font-semibold">Your Governance Status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {GOVERNANCE_BODIES.map(b => (
                        <Badge key={b.name} variant="outline" className="text-[10px] bg-primary/5">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1 text-primary" />
                          {b.name} Eligible
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rights by level phase */}
                {[
                  { title: "🌱 Emergence (Lv 1–3)", levels: [1, 2, 3] },
                  { title: "🌿 Rooting (Lv 4–6)", levels: [4, 5, 6] },
                  { title: "🌼 Collaboration (Lv 7–9)", levels: [7, 8, 9] },
                  { title: "🌊 Structuring (Lv 10–12)", levels: [10, 11, 12] },
                  { title: "🏛 Stewardship (Lv 13–15)", levels: [13, 14, 15] },
                ].map(phase => {
                  const rights = GOVERNANCE_RIGHTS.filter(r => phase.levels.includes(r.minLevel));
                  if (!rights.length) return null;
                  return (
                    <div key={phase.title}>
                      <p className="text-xs font-semibold mb-1.5">{phase.title}</p>
                      <div className="space-y-1">
                        {rights.map((r, i) => {
                          return (
                            <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-md">
                              <Unlock className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium">{r.label}</span>
                                  <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${SPHERE_COLORS[r.sphere] || ""}`}>
                                    {r.sphere}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground">{r.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Voting thresholds */}
                <div>
                  <p className="text-xs font-semibold mb-1.5">🗳 Voting Thresholds</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(VOTING_THRESHOLDS).map(([sphere, minLvl]) => (
                      <div key={sphere} className="flex items-center gap-2 text-[10px]">
                        <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-4 ${SPHERE_COLORS[sphere] || ""}`}>
                          {sphere}
                        </Badge>
                        <span className="text-muted-foreground">Level {minLvl}+</span>
                        {currentLevel != null && currentLevel >= minLvl && (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anti-centralization */}
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold mb-1">🔒 Anti-Centralization Safeguards</p>
                  <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li>No user can hold more than 1 executive moderation role per sphere</li>
                    <li>Level 15 actions require co-signature</li>
                    <li>Voting weight is capped: 1 person = 1 vote</li>
                    <li>12 months inactivity → governance rights suspended (XP retained)</li>
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── How XP Works ─── */}
          <TabsContent value="how" className="mt-4">
            <ScrollArea className="h-[50vh] pr-2">
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-semibold mb-2">How XP is earned</h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Completing quests</li>
                    <li>Co-creating projects</li>
                    <li>Cross-territory collaboration</li>
                    <li>Publishing valuable knowledge</li>
                    <li>Hosting events</li>
                    <li>Mentoring members</li>
                    <li>Receiving upvotes on meaningful contributions</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">XP is NOT earned through</h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Payments</li>
                    <li>Donations</li>
                    <li>Shareholding</li>
                    <li>Buying credits</li>
                  </ul>
                </div>

                {/* Cross-Territory Multipliers */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">🌍 Territorial Impact Multipliers</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Collaboration across territories increases your XP earned. The platform rewards translocal cooperation.
                  </p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-3 py-1.5 font-medium">Collaboration Type</th>
                          <th className="text-right px-3 py-1.5 font-medium">Multiplier</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border"><td className="px-3 py-1.5">Same Guild</td><td className="text-right px-3 py-1.5">×1.0</td></tr>
                        <tr className="border-b border-border"><td className="px-3 py-1.5">Different Guild (same territory)</td><td className="text-right px-3 py-1.5">×1.1</td></tr>
                        <tr className="border-b border-border"><td className="px-3 py-1.5">Different Territory (same region)</td><td className="text-right px-3 py-1.5">×1.2</td></tr>
                        <tr className="border-b border-border"><td className="px-3 py-1.5">Different Region (same country)</td><td className="text-right px-3 py-1.5">×1.3</td></tr>
                        <tr className="border-b border-border"><td className="px-3 py-1.5">Different Country</td><td className="text-right px-3 py-1.5">×1.5</td></tr>
                        <tr><td className="px-3 py-1.5">Multi-country (3+)</td><td className="text-right px-3 py-1.5">×1.8</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    +20% bonus when collaborating in a new territory for the first time.
                  </p>
                </div>

                {/* Ecosystem separation */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold mb-2">Understanding the ecosystem</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">XP</p>
                      <p>Non-monetary reputation</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">Credits</p>
                      <p>Platform utility tokens</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">Shares</p>
                      <p>Coop-like ownership</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">Money (€)</p>
                      <p>Mission budgets & payments</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
