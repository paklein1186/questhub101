import { useState, useEffect } from "react";
import { Heart, Users, Globe, Loader2, Save, Plus, Trash2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DistributionRow {
  id?: string;
  target_type: "GUILD" | "PLATFORM";
  guild_id: string | null;
  percentage: number;
}

export function GiveBackSettingsSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [mode, setMode] = useState<"NONE" | "DISTRIBUTE">("NONE");
  const [rows, setRows] = useState<DistributionRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Load current distribution rules
  const { data: rules } = useQuery({
    queryKey: ["giveback-distribution", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("giveback_distribution_rules")
        .select("id, target_type, guild_id, percentage")
        .eq("user_id", userId!)
        .order("created_at");
      return data as DistributionRow[] | null;
    },
  });

  // Load user's guilds
  const { data: myGuilds = [] } = useQuery({
    queryKey: ["my-guilds-for-giveback", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("guild_id, guilds(id, name, logo_url)")
        .eq("user_id", userId!);
      return (data ?? []).map((m: any) => m.guilds).filter(Boolean);
    },
  });

  // Also load legacy profile setting for backward compat
  const { data: profile } = useQuery({
    queryKey: ["giveback-settings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("default_give_back_target_type, default_give_back_guild_id")
        .eq("user_id", userId!)
        .single();
      return data;
    },
  });

  useEffect(() => {
    if (rules && rules.length > 0) {
      setMode("DISTRIBUTE");
      setRows(rules);
    } else if (profile) {
      const p = profile as any;
      if (p.default_give_back_target_type === "GUILD" && p.default_give_back_guild_id) {
        setMode("DISTRIBUTE");
        setRows([{ target_type: "GUILD", guild_id: p.default_give_back_guild_id, percentage: 100 }]);
      } else if (p.default_give_back_target_type === "PLATFORM") {
        setMode("DISTRIBUTE");
        setRows([{ target_type: "PLATFORM", guild_id: null, percentage: 100 }]);
      } else {
        setMode("NONE");
        setRows([]);
      }
    }
  }, [rules, profile]);

  const totalPercent = rows.reduce((s, r) => s + r.percentage, 0);

  const addRow = () => {
    if (myGuilds.length > 0) {
      setRows([...rows, { target_type: "GUILD", guild_id: null, percentage: Math.max(0, 100 - totalPercent) }]);
    } else {
      setRows([...rows, { target_type: "PLATFORM", guild_id: null, percentage: Math.max(0, 100 - totalPercent) }]);
    }
  };

  const updateRow = (idx: number, patch: Partial<DistributionRow>) => {
    setRows(rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const removeRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!userId) return;

    if (mode === "DISTRIBUTE") {
      if (rows.length === 0) {
        toast({ title: "Add at least one recipient", variant: "destructive" });
        return;
      }
      if (totalPercent !== 100) {
        toast({ title: `Percentages must total 100% (currently ${totalPercent}%)`, variant: "destructive" });
        return;
      }
      for (const r of rows) {
        if (r.target_type === "GUILD" && !r.guild_id) {
          toast({ title: "Please select a guild for each row", variant: "destructive" });
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Delete existing rules
      await supabase.from("giveback_distribution_rules").delete().eq("user_id", userId);

      if (mode === "DISTRIBUTE" && rows.length > 0) {
        const inserts = rows.map(r => ({
          user_id: userId,
          target_type: r.target_type,
          guild_id: r.target_type === "GUILD" ? r.guild_id : null,
          percentage: r.percentage,
        }));
        const { error } = await supabase.from("giveback_distribution_rules").insert(inserts);
        if (error) throw error;
      }

      // Also update legacy profile columns for backward compat
      await supabase.from("profiles").update({
        default_give_back_target_type: mode === "NONE" ? "NONE" : rows[0]?.target_type || "NONE",
        default_give_back_guild_id: mode === "NONE" ? null : rows[0]?.target_type === "GUILD" ? rows[0]?.guild_id : null,
      } as any).eq("user_id", userId);

      toast({ title: "Give-back preferences saved!" });
      qc.invalidateQueries({ queryKey: ["giveback-distribution"] });
      qc.invalidateQueries({ queryKey: ["giveback-settings"] });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const guildName = (id: string | null) => myGuilds.find((g: any) => g.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-1">
          <Heart className="h-5 w-5 text-primary" /> Give-back preferences
        </h3>
        <p className="text-sm text-muted-foreground">
          Set a default give-back distribution when you receive revenue from services. You can still adjust it per transaction.
        </p>
      </div>

      <RadioGroup
        value={mode}
        onValueChange={(v) => {
          setMode(v as any);
          if (v === "NONE") setRows([]);
          else if (rows.length === 0) addRow();
        }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
          <RadioGroupItem value="NONE" id="gb-none" />
          <Label htmlFor="gb-none" className="cursor-pointer flex-1">
            <p className="text-sm font-medium">None</p>
            <p className="text-xs text-muted-foreground">No default give-back</p>
          </Label>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
          <RadioGroupItem value="DISTRIBUTE" id="gb-dist" />
          <Label htmlFor="gb-dist" className="cursor-pointer flex-1">
            <p className="text-sm font-medium flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> Distribute to recipients</p>
            <p className="text-xs text-muted-foreground">Split give-back across one or more guilds and/or the platform</p>
          </Label>
        </div>
      </RadioGroup>

      {mode === "DISTRIBUTE" && (
        <div className="space-y-3 pl-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg border border-border p-3 bg-muted/30">
              <Select
                value={row.target_type === "GUILD" && row.guild_id ? `guild:${row.guild_id}` : row.target_type === "PLATFORM" ? "platform" : ""}
                onValueChange={(v) => {
                  if (v === "platform") {
                    updateRow(idx, { target_type: "PLATFORM", guild_id: null });
                  } else if (v.startsWith("guild:")) {
                    updateRow(idx, { target_type: "GUILD", guild_id: v.replace("guild:", "") });
                  }
                }}
              >
                <SelectTrigger className="h-9 text-sm flex-1 min-w-[160px]">
                  <SelectValue placeholder="Choose recipient…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> The platform</span>
                  </SelectItem>
                  {myGuilds.map((g: any) => (
                    <SelectItem key={g.id} value={`guild:${g.id}`}>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {g.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1 shrink-0">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={row.percentage}
                  onChange={(e) => updateRow(idx, { percentage: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                  className="h-9 w-16 text-center text-sm"
                />
                <Percent className="h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(idx)}
                disabled={rows.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Total indicator */}
          <div className="flex items-center justify-between px-3 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className={`font-semibold ${totalPercent === 100 ? "text-primary" : "text-destructive"}`}>
              {totalPercent}%
            </span>
          </div>

          <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add recipient
          </Button>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
        Save preferences
      </Button>
    </div>
  );
}
