import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { XP_LEVEL_THRESHOLDS, LEVEL_LABELS, LEVEL_DESCRIPTIONS } from "@/lib/xpCreditsConfig";
import { type LucideIcon, Circle, Droplet, Sprout, Anchor, Leaf, GitBranch, Flower2, TreePine, Wheat, Sparkles, Waypoints, TreeDeciduous, Shield, ShieldCheck, Trees } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="levels">Levels</TabsTrigger>
            <TabsTrigger value="how">How XP Works</TabsTrigger>
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

          {/* ─── How XP Works ─── */}
          <TabsContent value="how" className="mt-4 space-y-5">
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
                  <p>Cooperative ownership</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Money (€)</p>
                  <p>Mission budgets & payments</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
