import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Trash2, Coins, Settings, Puzzle, Calendar,
  ListChecks, MessageCircle, AlertTriangle, Ban, Loader2, Shield,
  Users, UserPlus, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";

const TABS = [
  { key: "fundraising", label: "Fundraising", icon: Coins },
  { key: "features", label: "Features", icon: Puzzle },
  { key: "danger", label: "Danger Zone", icon: AlertTriangle },
];

export default function QuestSettings() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  const { data: quest, isLoading } = useQuery({
    queryKey: ["quest-settings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <PageShell><Loader2 className="h-6 w-6 animate-spin mx-auto mt-16" /></PageShell>;
  if (!quest) return <PageShell><p>Quest not found.</p></PageShell>;

  const isOwner = currentUser.id === quest.created_by_user_id;
  const isGlobalAdmin = checkIsGlobalAdmin(currentUser.email);

  if (!isOwner && !isGlobalAdmin) {
    return <PageShell><p>You must be the owner of this quest to access settings.</p></PageShell>;
  }

  return <QuestSettingsInner questId={quest.id} quest={quest} />;
}

function QuestSettingsInner({ questId, quest }: { questId: string; quest: any }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "fundraising";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const isCancelled = quest.status === "CANCELLED";

  // ── Fundraising state ──
  const [fundingType, setFundingType] = useState<"CREDITS" | "FIAT">((quest as any).funding_type || "CREDITS");
  const [fundingGoal, setFundingGoal] = useState(String((quest as any).funding_goal_credits ?? ""));
  const [creditBudget, setCreditBudget] = useState(String((quest as any).credit_budget ?? 0));
  const [creditReward, setCreditReward] = useState(String(quest.credit_reward ?? 0));
  const [allowFundraising, setAllowFundraising] = useState((quest as any).allow_fundraising ?? false);

  // ── Features config state ──
  const defaultFeatures = { rituals: true, subtasks: true, discussion: true };
  const parsedFeatures = typeof (quest as any).features_config === "object" && (quest as any).features_config
    ? { ...defaultFeatures, ...(quest as any).features_config }
    : defaultFeatures;
  const [featuresConfig, setFeaturesConfig] = useState(parsedFeatures);

  const toggleFeature = (key: string) => setFeaturesConfig((prev: any) => ({ ...prev, [key]: !prev[key] }));

  const saveFundraising = async () => {
    await supabase.from("quests").update({
      funding_type: fundingType,
      funding_goal_credits: fundingGoal ? Number(fundingGoal) : null,
      credit_budget: Number(creditBudget) || 0,
      credit_reward: Number(creditReward) || 0,
      allow_fundraising: allowFundraising,
    } as any).eq("id", questId);
    qc.invalidateQueries({ queryKey: ["quest", questId] });
    qc.invalidateQueries({ queryKey: ["quest-settings", questId] });
    toast({ title: "Fundraising settings saved" });
  };

  const saveFeatures = async () => {
    await supabase.from("quests").update({ features_config: featuresConfig } as any).eq("id", questId);
    qc.invalidateQueries({ queryKey: ["quest", questId] });
    qc.invalidateQueries({ queryKey: ["quest-settings", questId] });
    toast({ title: "Features saved!" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={`/quests/${questId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to quest</Link>
      </Button>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Quest Settings</h1>
            <p className="text-sm text-muted-foreground">{quest.title}</p>
          </div>
          {isCancelled && (
            <Badge variant="outline" className="ml-auto text-destructive border-destructive/30">Cancelled</Badge>
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

              {/* ── Fundraising ── */}
              {activeTab === "fundraising" && (
                <div className="space-y-5 max-w-lg">
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <h3 className="font-display font-semibold flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" /> Fundraising Settings
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Funding Type</label>
                        <Select value={fundingType} onValueChange={(v) => setFundingType(v as "CREDITS" | "FIAT")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CREDITS">Credits (internal currency)</SelectItem>
                            <SelectItem value="FIAT">Fiat (€ via Stripe)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Funding Goal</label>
                        <Input type="number" value={fundingGoal} onChange={e => setFundingGoal(e.target.value)} min={0} placeholder="Optional" />
                        <p className="text-xs text-muted-foreground mt-1">Target {fundingType === "CREDITS" ? "Credits" : "€"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{fundingType === "CREDITS" ? "Credit Budget" : "Fiat Budget (€)"}</label>
                        <Input type="number" value={creditBudget} onChange={e => setCreditBudget(e.target.value)} min={0} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Credit Reward</label>
                        <Input type="number" value={creditReward} onChange={e => setCreditReward(e.target.value)} min={0} />
                        <p className="text-xs text-muted-foreground mt-1">Per participant on completion</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <Switch id="settingsFundraising" checked={allowFundraising} onCheckedChange={setAllowFundraising} />
                      <label htmlFor="settingsFundraising" className="text-sm font-medium">Allow community fundraising</label>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
                      <p><strong>Current pot:</strong> {(quest as any).escrow_credits ?? 0} {fundingType === "FIAT" ? "€" : "Credits"}</p>
                      {(quest as any).funding_goal_credits && (
                        <p><strong>Goal:</strong> {(quest as any).funding_goal_credits} — {Math.min(100, Math.round(((quest as any).escrow_credits / (quest as any).funding_goal_credits) * 100))}% funded</p>
                      )}
                      <p><strong>Fundraising:</strong> {(quest as any).allow_fundraising ? "Open" : "Closed"}{(quest as any).fundraising_cancelled ? " (Cancelled)" : ""}</p>
                    </div>
                    <Button size="sm" onClick={saveFundraising}>
                      <Save className="h-4 w-4 mr-1" /> Save Fundraising Settings
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Features ── */}
              {activeTab === "features" && (
                <div className="space-y-5 max-w-lg">
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <h3 className="font-display font-semibold flex items-center gap-2">
                      <Puzzle className="h-4 w-4 text-primary" /> Quest Features
                    </h3>
                    <p className="text-sm text-muted-foreground">Enable or disable tools for this quest.</p>
                    <div className="space-y-3">
                      {[
                        { key: "rituals", label: "Rituals", desc: "Recurring sessions with video calls and attendance", icon: Calendar },
                        { key: "subtasks", label: "Subtasks", desc: "Break the quest into smaller assignable tasks", icon: ListChecks },
                        { key: "discussion", label: "Discussion", desc: "Feed and comment thread for the quest", icon: MessageCircle },
                      ].map(({ key, label, desc, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">{label}</span>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                          <Switch checked={featuresConfig[key]} onCheckedChange={() => toggleFeature(key)} />
                        </div>
                      ))}
                    </div>
                    <Button onClick={saveFeatures} size="sm"><Save className="h-4 w-4 mr-1" /> Save Features</Button>
                  </div>
                </div>
              )}

              {/* ── Danger Zone ── */}
              {activeTab === "danger" && (
                <div className="space-y-5 max-w-lg">
                  {!isCancelled ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
                      <h3 className="font-display font-semibold flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" /> Danger Zone
                      </h3>
                      <p className="text-sm text-muted-foreground">These actions are irreversible. Proceed with caution.</p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-500/30 hover:bg-orange-500/10"
                          onClick={async () => {
                            if (!confirm("Cancel this quest? Credit contributions will be refunded.")) return;
                            if ((quest as any).funding_type === "CREDITS" && (quest as any).escrow_credits > 0) {
                              await supabase.rpc("refund_quest_funding" as any, { _quest_id: quest.id });
                            }
                            await supabase.from("quests").update({ status: "CANCELLED" } as any).eq("id", quest.id);
                            qc.invalidateQueries({ queryKey: ["quest", questId] });
                            qc.invalidateQueries({ queryKey: ["quest-settings", questId] });
                            toast({ title: "Quest cancelled" });
                          }}
                        >
                          <Ban className="h-4 w-4 mr-1" /> Cancel Quest & Refund
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={async () => {
                            if (!confirm("Are you sure you want to delete this quest?")) return;
                            await supabase.from("quests").update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq("id", quest.id);
                            toast({ title: "Quest deleted" });
                            navigate("/explore?tab=quests");
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete Quest
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-card p-5">
                      <p className="text-sm text-muted-foreground">This quest has been cancelled. No further actions are available.</p>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
