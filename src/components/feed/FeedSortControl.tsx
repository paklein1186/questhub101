import { Button } from "@/components/ui/button";
import { ArrowDownWideNarrow, Flame, Sparkles } from "lucide-react";

export type FeedSortMode = "recent" | "popular" | "relevant";

interface FeedSortControlProps {
  value: FeedSortMode;
  onChange: (mode: FeedSortMode) => void;
}

const modes: { key: FeedSortMode; label: string; icon: React.ReactNode }[] = [
  { key: "recent", label: "Most recent", icon: <ArrowDownWideNarrow className="h-3.5 w-3.5" /> },
  { key: "popular", label: "Most popular", icon: <Flame className="h-3.5 w-3.5" /> },
  { key: "relevant", label: "Most relevant", icon: <Sparkles className="h-3.5 w-3.5" /> },
];

export function FeedSortControl({ value, onChange }: FeedSortControlProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
      {modes.map((m) => (
        <Button
          key={m.key}
          variant={value === m.key ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2.5 text-xs gap-1.5"
          onClick={() => onChange(m.key)}
        >
          {m.icon}
          {m.label}
        </Button>
      ))}
    </div>
  );
}
