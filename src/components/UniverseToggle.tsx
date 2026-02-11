import { Sparkles, Globe, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UniverseMode } from "@/lib/universeMapping";

interface Props {
  value: UniverseMode;
  onChange: (mode: UniverseMode) => void;
  className?: string;
}

const OPTIONS: { value: UniverseMode; label: string; icon: typeof Sparkles }[] = [
  { value: "creative", label: "Creative", icon: Sparkles },
  { value: "impact", label: "Impact", icon: Globe },
  { value: "both", label: "Both", icon: Layers },
];

export function UniverseToggle({ value, onChange, className = "" }: Props) {
  return (
    <div className={`inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 ${className}`}>
      {OPTIONS.map(({ value: v, label, icon: Icon }) => (
        <Button
          key={v}
          variant={value === v ? "default" : "ghost"}
          size="sm"
          className={`text-xs gap-1.5 h-7 px-3 ${value === v ? "" : "text-muted-foreground"}`}
          onClick={() => onChange(v)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
