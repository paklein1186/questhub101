import { useState, useEffect } from "react";
import { Heart, Users, Globe, Loader2, X, Percent, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DistributionRow {
  target_type: "GUILD" | "PLATFORM";
  guild_id: string | null;
  percentage: number;
}

interface GiveBackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earnedAmount?: number;
  serviceName?: string;
  bookingId?: string;
}

export function GiveBackModal({ open, onOpenChange, earnedAmount, serviceName, bookingId }: GiveBackModalProps) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [rows, setRows] = useState<DistributionRow[]>([]);
  const [totalAmount, setTotalAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load distribution rules (multi-guild)
  const { data: distRules } = useQuery({
    queryKey: ["giveback-distribution", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("giveback_distribution_rules")
        .select("target_type, guild_id, percentage")
        .eq("user_id", userId!)
        .order("created_at");
      return data as DistributionRow[] | null;
    },
  });

  // Fallback to legacy profile settings
  const { data: defaults } = useQuery({
    queryKey: ["giveback-settings", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("default_give_back_target_type, default_give_back_guild_id")
        .eq("user_id", userId!)
        .single();
      return data;
    },
  });

  // Load user's guilds
  const { data: myGuilds = [] } = useQuery({
    queryKey: ["my-guilds-for-giveback", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("guild_id, guilds(id, name, logo_url)")
        .eq("user_id", userId!);
      return (data ?? []).map((m: any) => m.guilds).filter(Boolean);
    },
  });

  // Apply distribution rules when opening
  useEffect(() => {
    if (!open) return;
    if (distRules && distRules.length > 0) {
      setRows(distRules.map(r => ({ ...r })));
    } else if (defaults) {
      const d = defaults as any;
      if (d.default_give_back_target_type === "GUILD" && d.default_give_back_guild_id) {
        setRows([{ target_type: "GUILD", guild_id: d.default_give_back_guild_id, percentage: 100 }]);
      } else if (d.default_give_back_target_type === "PLATFORM") {
        setRows([{ target_type: "PLATFORM", guild_id: null, percentage: 100 }]);
      } else {
        setRows([{ target_type: "PLATFORM", guild_id: null, percentage: 100 }]);
      }
    } else {
      setRows([{ target_type: "PLATFORM", guild_id: null, percentage: 100 }]);
    }
    setShowCustom(false);
    setTotalAmount("");
  }, [open, distRules, defaults]);

  const totalPercent = rows.reduce((s, r) => s + r.percentage, 0);
  const guildName = (id: string | null) => myGuilds.find((g: any) => g.id === id)?.name || "Guild";

  const updateRow = (idx: number, patch: Partial<DistributionRow>) => {
    setRows(rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));
  const addRow = () => {
    setRows([...rows, { target_type: "PLATFORM", guild_id: null, percentage: Math.max(0, 100 - totalPercent) }]);
  };

  const processGiveBack = async (amount: number) => {
    if (!userId || amount < 1) return;
    if (totalPercent !== 100) {
      toast({ title: `Percentages must total 100% (currently ${totalPercent}%)`, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Process each row's share
      for (const row of rows) {
        const share = Math.round(amount * row.percentage / 100);
        if (share < 1) continue;
        const { error } = await supabase.rpc("process_give_back", {
          _to_target_type: row.target_type,
          _to_guild_id: row.target_type === "GUILD" ? row.guild_id : null,
          _amount_credits: share,
          _booking_id: bookingId || null,
          _metadata: {
            reason: "GIVE_BACK_FROM_SERVICE_TRANSACTION",
            service_name: serviceName || null,
            auto_or_manual: "manual",
            distribution_share_percent: row.percentage,
          },
        });
        if (error) throw error;
      }

      const recipientSummary = rows
        .map(r => `${r.percentage}% → ${r.target_type === "GUILD" ? guildName(r.guild_id) : "Platform"}`)
        .join(", ");

      toast({
        title: "Thank you for giving back! 💚",
        description: `${amount} credits distributed: ${recipientSummary}`,
      });
      qc.invalidateQueries({ queryKey: ["credit-transactions"] });
      qc.invalidateQueries({ queryKey: ["plan-limits"] });
      qc.invalidateQueries({ queryKey: ["giveback-history"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Give-back failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const presets = [5, 10, 20];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> Give back from this transaction?
          </DialogTitle>
          <DialogDescription>
            {earnedAmount != null && serviceName
              ? `You just earned ${earnedAmount} credits from "${serviceName}".`
              : "Would you like to give back some credits?"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Distribution overview - editable per transaction */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Distribution</Label>
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border border-border p-2 bg-muted/30">
                <Select
                  value={row.target_type === "GUILD" && row.guild_id ? `guild:${row.guild_id}` : row.target_type === "PLATFORM" ? "platform" : ""}
                  onValueChange={(v) => {
                    if (v === "platform") updateRow(idx, { target_type: "PLATFORM", guild_id: null });
                    else if (v.startsWith("guild:")) updateRow(idx, { target_type: "GUILD", guild_id: v.replace("guild:", "") });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">
                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Platform</span>
                    </SelectItem>
                    {myGuilds.map((g: any) => (
                      <SelectItem key={g.id} value={`guild:${g.id}`}>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {g.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={row.percentage}
                    onChange={(e) => updateRow(idx, { percentage: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className="h-8 w-14 text-center text-xs"
                  />
                  <Percent className="h-3 w-3 text-muted-foreground" />
                </div>
                {rows.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 px-2" onClick={addRow}>
                <Plus className="h-3 w-3" /> Add
              </Button>
              <span className={`text-xs font-medium ${totalPercent === 100 ? "text-primary" : "text-destructive"}`}>
                {totalPercent}%
              </span>
            </div>
          </div>

          {/* Preset amounts */}
          <div className="flex gap-2 flex-wrap">
            {presets.map((amt) => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                disabled={loading || totalPercent !== 100}
                onClick={() => processGiveBack(amt)}
                className="flex-1 min-w-[80px]"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Heart className="h-3 w-3 mr-1" />}
                Give {amt}
              </Button>
            ))}
          </div>

          {/* Custom amount */}
          {showCustom ? (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min={1}
                placeholder="Amount…"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="h-8 w-28"
              />
              <Button
                size="sm"
                disabled={loading || !totalAmount || parseInt(totalAmount) < 1 || totalPercent !== 100}
                onClick={() => processGiveBack(parseInt(totalAmount))}
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Give"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCustom(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={() => setShowCustom(true)}>
              Custom amount…
            </Button>
          )}

          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => onOpenChange(false)}>
            Skip this time
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
