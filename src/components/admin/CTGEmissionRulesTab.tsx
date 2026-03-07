import { useState, useMemo, useEffect } from "react";
import {
  Save, RotateCcw, Sprout, Globe, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

/* ─── Label mapping ─── */
const CONTRIBUTION_LABELS: Record<string, string> = {
  subtask_completed: "Sous-tâche complétée",
  quest_completed: "Quête complétée",
  proposal_accepted: "Proposition acceptée",
  review_given: "Revue donnée",
  ritual_participation: "Participation rituel",
  documentation: "Documentation",
  mentorship: "Mentorat",
  governance_vote: "Vote de gouvernance",
  ecological_annotation: "Annotation écologique",
};

/* ─── Default values (from prompt #1) ─── */
const DEFAULTS: Record<string, { ctg_amount: number; commons_share_percent: number }> = {
  subtask_completed: { ctg_amount: 5, commons_share_percent: 10 },
  quest_completed: { ctg_amount: 50, commons_share_percent: 15 },
  proposal_accepted: { ctg_amount: 20, commons_share_percent: 10 },
  review_given: { ctg_amount: 10, commons_share_percent: 10 },
  ritual_participation: { ctg_amount: 15, commons_share_percent: 20 },
  documentation: { ctg_amount: 10, commons_share_percent: 10 },
  mentorship: { ctg_amount: 25, commons_share_percent: 15 },
  governance_vote: { ctg_amount: 5, commons_share_percent: 10 },
  ecological_annotation: { ctg_amount: 15, commons_share_percent: 25 },
};

interface RuleRow {
  id: string;
  contribution_type: string;
  ctg_amount: number;
  commons_share_percent: number;
  is_active: boolean;
  created_at: string;
}

interface EditState {
  ctg_amount: number;
  commons_share_percent: number;
  is_active: boolean;
}

export function CTGEmissionRulesTab() {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["admin-ctg-emission-rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ctg_emission_rules")
        .select("*")
        .order("ctg_amount", { ascending: false });
      return (data ?? []) as RuleRow[];
    },
    staleTime: 15_000,
  });

  // Seed edits from server data
  useEffect(() => {
    if (rules && Object.keys(edits).length === 0) {
      const initial: Record<string, EditState> = {};
      rules.forEach((r) => {
        initial[r.id] = {
          ctg_amount: r.ctg_amount,
          commons_share_percent: r.commons_share_percent,
          is_active: r.is_active,
        };
      });
      setEdits(initial);
    }
  }, [rules]);

  const updateEdit = (id: string, patch: Partial<EditState>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  // Detect changed rows
  const changedIds = useMemo(() => {
    if (!rules) return [];
    return rules.filter((r) => {
      const e = edits[r.id];
      if (!e) return false;
      return (
        e.ctg_amount !== r.ctg_amount ||
        e.commons_share_percent !== r.commons_share_percent ||
        e.is_active !== r.is_active
      );
    }).map((r) => r.id);
  }, [rules, edits]);

  const handleSave = async () => {
    if (!rules || changedIds.length === 0) return;
    setSaving(true);
    try {
      for (const id of changedIds) {
        const e = edits[id];
        const { error } = await supabase
          .from("ctg_emission_rules")
          .update({
            ctg_amount: e.ctg_amount,
            commons_share_percent: e.commons_share_percent,
            is_active: e.is_active,
          })
          .eq("id", id);
        if (error) throw error;
      }
      toast.success(`${changedIds.length} règle(s) mise(s) à jour`);
      queryClient.invalidateQueries({ queryKey: ["admin-ctg-emission-rules"] });
      setEdits({});
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!rules) return;
    setResetting(true);
    try {
      for (const r of rules) {
        const def = DEFAULTS[r.contribution_type];
        if (!def) continue;
        const { error } = await supabase
          .from("ctg_emission_rules")
          .update({
            ctg_amount: def.ctg_amount,
            commons_share_percent: def.commons_share_percent,
            is_active: true,
          })
          .eq("id", r.id);
        if (error) throw error;
      }
      toast.success("Règles réinitialisées aux valeurs par défaut");
      queryClient.invalidateQueries({ queryKey: ["admin-ctg-emission-rules"] });
      setEdits({});
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de la réinitialisation");
    } finally {
      setResetting(false);
    }
  };

  // Impact preview
  const impact = useMemo(() => {
    if (!rules) return null;
    const getActive = (type: string) => {
      const r = rules.find((x) => x.contribution_type === type);
      if (!r) return { amount: 0, commons: 0 };
      const e = edits[r.id] ?? { ctg_amount: r.ctg_amount, commons_share_percent: r.commons_share_percent, is_active: r.is_active };
      if (!e.is_active) return { amount: 0, commons: 0 };
      return { amount: e.ctg_amount, commons: e.commons_share_percent };
    };
    const quest = getActive("quest_completed");
    const sub = getActive("subtask_completed");
    const totalGross = quest.amount + 5 * sub.amount;
    const commonsAmount =
      quest.amount * (quest.commons / 100) + 5 * sub.amount * (sub.commons / 100);
    const contributorAmount = totalGross - commonsAmount;
    return { totalGross, commonsAmount: Math.round(commonsAmount * 100) / 100, contributorAmount: Math.round(contributorAmount * 100) / 100 };
  }, [rules, edits]);

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold">Règles d'émission</h3>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={resetting}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Valeurs par défaut
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Réinitialiser les règles ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Toutes les règles d'émission seront remises à leurs valeurs initiales. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Réinitialiser</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" disabled={changedIds.length === 0 || saving} onClick={handleSave}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Sauvegarde…" : `Sauvegarder (${changedIds.length})`}
          </Button>
        </div>
      </div>

      {/* Rules table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type de contribution</TableHead>
                <TableHead className="text-right w-[130px]">$CTG émis</TableHead>
                <TableHead className="text-right w-[130px]">Part communs %</TableHead>
                <TableHead className="w-[80px] text-center">Actif</TableHead>
                <TableHead className="hidden sm:table-cell">Modifié</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Chargement…</TableCell>
                </TableRow>
              )}
              {(rules ?? []).map((r) => {
                const e = edits[r.id];
                const isChanged = changedIds.includes(r.id);
                return (
                  <TableRow key={r.id} className={isChanged ? "bg-accent/30" : undefined}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {CONTRIBUTION_LABELS[r.contribution_type] ?? r.contribution_type}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{r.contribution_type}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={1000}
                        step={1}
                        className="w-24 ml-auto text-right tabular-nums h-8 text-sm"
                        value={e?.ctg_amount ?? r.ctg_amount}
                        onChange={(ev) =>
                          updateEdit(r.id, {
                            ctg_amount: Math.max(0, Math.min(1000, parseFloat(ev.target.value) || 0)),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        step={1}
                        className="w-20 ml-auto text-right tabular-nums h-8 text-sm"
                        value={e?.commons_share_percent ?? r.commons_share_percent}
                        onChange={(ev) =>
                          updateEdit(r.id, {
                            commons_share_percent: Math.max(0, Math.min(50, parseFloat(ev.target.value) || 0)),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={e?.is_active ?? r.is_active}
                        onCheckedChange={(v) => updateEdit(r.id, { is_active: v })}
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(r.created_at), "dd/MM/yyyy")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Impact preview */}
      {impact && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sprout className="h-4 w-4 text-primary" />
              Aperçu d'impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Avec les règles actuelles, compléter une quête entière (1 quête + 5 sous-tâches)
              rapporterait :{" "}
              <strong className="text-foreground">{impact.contributorAmount} $CTG</strong> au contributeur
              {" "}+{" "}
              <strong className="text-foreground">{impact.commonsAmount} $CTG</strong> aux communs
              {" "}({impact.totalGross} $CTG brut total)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Commons wallet */}
      <CommonsWalletCard />
    </div>
  );
}

/* ─── Commons Wallet Card ─── */
function CommonsWalletCard() {
  const { data: commons } = useQuery({
    queryKey: ["admin-ctg-commons-wallet"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ctg_commons_wallet")
        .select("balance, lifetime_received")
        .limit(1)
        .single();
      return data;
    },
    staleTime: 30_000,
  });

  const { data: chartData } = useQuery({
    queryKey: ["admin-ctg-commons-daily"],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from("ctg_transactions")
        .select("amount, created_at")
        .eq("type", "COMMONS_EMISSION")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      const byDay: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        byDay[format(subDays(new Date(), 29 - i), "yyyy-MM-dd")] = 0;
      }
      (data ?? []).forEach((t) => {
        const d = format(new Date(t.created_at), "yyyy-MM-dd");
        if (d in byDay) byDay[d] += Math.abs(t.amount);
      });
      return Object.entries(byDay).map(([date, amount]) => ({
        date: format(new Date(date), "dd/MM"),
        amount: Math.round(amount * 100) / 100,
      }));
    },
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Wallet Communs
        </CardTitle>
        <CardDescription>Fonds collectifs alimentés par le pourcentage communs de chaque émission.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Solde actuel</p>
            <p className="text-2xl font-bold tabular-nums">
              {(commons?.balance ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} $CTG
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Total reçu (lifetime)</p>
            <p className="text-2xl font-bold tabular-nums">
              {(commons?.lifetime_received ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} $CTG
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Apports quotidiens aux communs — 30 derniers jours</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  formatter={(val: number) => [`${val} $CTG`, "Communs"]}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
