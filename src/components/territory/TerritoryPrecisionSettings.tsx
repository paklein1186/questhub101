import { useEffect, useState } from "react";
import { Settings2, Globe, Target, Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useTerritoryPrecisionSettings,
  useUpdateTerritoryPrecision,
} from "@/hooks/useEnvironmentalDatasets";
import { TerritorialPrecisionLevel, TerritorialGranularity } from "@/types/enums";

interface Props {
  territoryId: string;
}

const PRECISION_OPTIONS = [
  { value: TerritorialPrecisionLevel.STRICT_MATCH, label: "Strict Match", icon: "🎯", desc: "Only exact granularity datasets" },
  { value: TerritorialPrecisionLevel.PERIMETER_MATCH, label: "Perimeter Match", icon: "📐", desc: "Exact + fallback to broader levels" },
  { value: TerritorialPrecisionLevel.BIOREGIONAL_MATCH, label: "Bioregional Match", icon: "🌍", desc: "Ecoregion + territorial fallback" },
];

const GRANULARITY_OPTIONS = [
  { value: TerritorialGranularity.DISTRICT_OR_COMMUNE, label: "District / Commune" },
  { value: TerritorialGranularity.NUTS3, label: "NUTS3" },
  { value: TerritorialGranularity.NUTS2, label: "NUTS2" },
  { value: TerritorialGranularity.NUTS1, label: "NUTS1" },
  { value: TerritorialGranularity.COUNTRY, label: "Country" },
  { value: TerritorialGranularity.CUSTOM_PERIMETER, label: "Custom Perimeter" },
];

export function TerritoryPrecisionSettings({ territoryId }: Props) {
  const { data: settings, isLoading } = useTerritoryPrecisionSettings(territoryId);
  const updateMutation = useUpdateTerritoryPrecision();
  const { toast } = useToast();

  const [precision, setPrecision] = useState<string>("PERIMETER_MATCH");
  const [granularity, setGranularity] = useState<string | null>(null);
  const [autoExpand, setAutoExpand] = useState(true);
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    if (settings) {
      setPrecision(settings.precision_level || "PERIMETER_MATCH");
      setGranularity(settings.granularity);
      setAutoExpand(settings.auto_expand_perimeter ?? true);
      setCustomName(settings.custom_perimeter_name || "");
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        territoryId,
        precision_level: precision,
        granularity,
        auto_expand_perimeter: autoExpand,
        custom_perimeter_name: granularity === "CUSTOM_PERIMETER" ? customName : null,
      });
      toast({ title: "Precision settings saved!" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="h-32 rounded-xl bg-muted animate-pulse" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Settings2 className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">
            Living Systems Precision
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Configure how environmental datasets are matched
          </p>
        </div>
      </div>

      {/* Precision Level */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">
          Matching precision for living systems
        </label>
        <div className="grid gap-2">
          {PRECISION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPrecision(opt.value)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                precision === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <span className="text-lg">{opt.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
              {precision === opt.value && (
                <Badge variant="default" className="text-[9px] px-1.5">Active</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Granularity */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Territorial granularity</label>
        <Select value={granularity || ""} onValueChange={(v) => setGranularity(v || null)}>
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Auto-detect from level" />
          </SelectTrigger>
          <SelectContent>
            {GRANULARITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom perimeter name */}
      {granularity === "CUSTOM_PERIMETER" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Custom perimeter name</label>
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. Bassin de la Durance"
            className="text-xs"
            maxLength={100}
          />
        </div>
      )}

      {/* Auto-expand toggle */}
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-xs font-medium text-foreground">Auto-expand perimeter</p>
          <p className="text-[10px] text-muted-foreground">
            Fallback to broader levels when no exact match found
          </p>
        </div>
        <Switch checked={autoExpand} onCheckedChange={setAutoExpand} />
      </div>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full text-xs"
        size="sm"
      >
        Save Precision Settings
      </Button>
    </div>
  );
}
