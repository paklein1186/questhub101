import { useState } from "react";
import { PATHS, type PathConfig } from "@/constants/paths";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PathSelectorProps {
  onPathSelected?: (pathId: string) => void;
  className?: string;
}

export function PathSelector({ onPathSelected, className }: PathSelectorProps) {
  const { session } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectPath = async (path: PathConfig) => {
    if (!session?.user?.id || saving) return;
    setSelectedId(path.id);
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ current_path: path.id, path_step: 1 } as any)
      .eq("user_id", session.user.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to set path");
      setSelectedId(null);
      return;
    }

    toast.success(`You chose ${path.name}!`);
    onPathSelected?.(path.id);
  };

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
      {PATHS.map((path, i) => {
        const isSelected = selectedId === path.id;
        return (
          <motion.button
            key={path.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            onClick={() => selectPath(path)}
            disabled={saving}
            className={cn(
              "relative text-left rounded-xl border p-4 transition-all duration-200",
              "hover:border-primary/50 hover:bg-primary/5",
              isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-border bg-card/40"
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5">{path.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{path.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {path.description}
                </p>
                <p className="text-[10px] text-primary/70 mt-1.5 italic">{path.forWho}</p>
              </div>
              {isSelected && saving && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              {isSelected && !saving && <Check className="h-4 w-4 text-primary shrink-0" />}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
