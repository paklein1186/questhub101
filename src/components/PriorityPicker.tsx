import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type Priority = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; iconColor: string }> = {
  HIGH: { label: "High", color: "text-red-500", iconColor: "text-red-500" },
  MEDIUM: { label: "Medium", color: "text-amber-500", iconColor: "text-amber-500" },
  LOW: { label: "Low", color: "text-blue-400", iconColor: "text-blue-400" },
  NONE: { label: "None", color: "text-muted-foreground/40", iconColor: "text-muted-foreground/40" },
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  NONE: 3,
};

interface PriorityPickerProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

export function PriorityPicker({ value, onChange, size = "sm", disabled }: PriorityPickerProps) {
  const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.NONE;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            size === "sm" ? "h-6 w-6" : "h-7 w-7",
            config.iconColor,
            "hover:bg-accent/50"
          )}
          title={`Priority: ${config.label}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Flag className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", value !== "NONE" && "fill-current")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32" onClick={(e) => e.stopPropagation()}>
        {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={(e) => {
              e.stopPropagation();
              onChange(p);
            }}
            className={cn("text-xs gap-2", value === p && "bg-accent")}
          >
            <Flag className={cn("h-3 w-3", PRIORITY_CONFIG[p].iconColor, p !== "NONE" && "fill-current")} />
            {PRIORITY_CONFIG[p].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
