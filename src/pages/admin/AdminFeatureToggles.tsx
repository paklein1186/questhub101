import { Settings, ToggleLeft, ToggleRight } from "lucide-react";
import { useFeatureFlags, useToggleFeatureFlag, type FeatureFlag } from "@/hooks/useFeatureFlags";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  CORE: "Core Features",
  NETWORK: "Explore & Network",
  AI: "AI & Agents",
  ECONOMY: "Economy & Credits",
  MISC: "Experimental / Beta",
};

const CATEGORY_ORDER = ["CORE", "NETWORK", "AI", "ECONOMY", "MISC"];

export default function AdminFeatureToggles() {
  const { data: flags = [], isLoading } = useFeatureFlags();
  const toggle = useToggleFeatureFlag();

  const grouped = CATEGORY_ORDER.reduce<Record<string, FeatureFlag[]>>((acc, cat) => {
    acc[cat] = flags.filter((f) => f.category === cat);
    return acc;
  }, {});

  const handleToggle = (flag: FeatureFlag) => {
    toggle.mutate(
      { id: flag.id, enabled: !flag.enabled },
      {
        onSuccess: () =>
          toast.success(`${flag.label} ${!flag.enabled ? "enabled" : "disabled"}`),
        onError: () => toast.error("Failed to update flag. Are you a Super Admin?"),
      }
    );
  };

  if (isLoading) {
    return <div className="text-muted-foreground py-12 text-center">Loading feature flags…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="font-display text-2xl font-bold">Platform Controls</h2>
      </div>
      <p className="text-muted-foreground text-sm max-w-xl">
        Toggle major platform features on or off. Disabling a feature hides it from the UI
        without deleting any data. Super Admins can always access disabled features in admin views.
      </p>

      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{CATEGORY_LABELS[cat] ?? cat}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {items.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between py-2.5 px-1 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{flag.label}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {flag.key}
                      </Badge>
                    </div>
                    {flag.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                    )}
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={() => handleToggle(flag)}
                    disabled={toggle.isPending}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
