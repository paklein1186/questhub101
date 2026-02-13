import { LayoutList, LayoutGrid, Grid3X3, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export type FeedDisplayMode = "list" | "small" | "medium" | "large";

interface FeedDisplayToggleProps {
  value: FeedDisplayMode;
  onChange: (mode: FeedDisplayMode) => void;
}

const modes: { mode: FeedDisplayMode; icon: React.ElementType; label: string }[] = [
  { mode: "list", icon: LayoutList, label: "List view" },
  { mode: "small", icon: Grid3X3, label: "Small tiles" },
  { mode: "medium", icon: Grid2X2, label: "Medium tiles" },
  { mode: "large", icon: LayoutGrid, label: "Large tiles" },
];

export function FeedDisplayToggle({ value, onChange }: FeedDisplayToggleProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
        {modes.map(({ mode, icon: Icon, label }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-md ${
                  value === mode
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onChange(mode)}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
