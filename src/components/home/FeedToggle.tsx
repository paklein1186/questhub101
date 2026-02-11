import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedSection } from "@/components/feed/FeedSection";
import { usePersona } from "@/hooks/usePersona";

export function FeedToggle() {
  const [mode, setMode] = useState<"houses" | "all">("houses");
  const { label } = usePersona();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" /> {label("feed.label")}
        </h2>
        <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-muted/50">
          <Button variant={mode === "houses" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs"
            onClick={() => setMode("houses")}>
            My Topics only
          </Button>
          <Button variant={mode === "all" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs"
            onClick={() => setMode("all")}>
            Show All
          </Button>
        </div>
      </div>
      <FeedSection contextType="GLOBAL" />
    </section>
  );
}
