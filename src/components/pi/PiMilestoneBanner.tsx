import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Badge } from "@/components/ui/badge";
import { useMilestones, type MilestoneWithProgress } from "@/hooks/useMilestones";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function getPersonaHeadline(persona: string): string {
  if (persona === "CREATIVE") return "🌈 New creative path!";
  if (persona === "IMPACT") return "🌱 Journey of impact";
  return "✨ New territories";
}

export function PiMilestoneBanner() {
  const { user } = useAuth();
  const { persona } = usePersona();
  const { pendingPopup, acknowledgeMilestone } = useMilestones();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<MilestoneWithProgress | null>(null);

  const { data: popupAllowed } = useQuery({
    queryKey: ["milestone-popup-allowed", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("milestone_popups_enabled, last_milestone_popup_at")
        .eq("user_id", user!.id)
        .single();
      if (!data) return false;
      if (!(data as any).milestone_popups_enabled) return false;
      const lastPopup = (data as any).last_milestone_popup_at;
      if (!lastPopup) return true;
      const hoursSince = (Date.now() - new Date(lastPopup).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 12;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (pendingPopup && popupAllowed && !current) {
      const timer = setTimeout(() => {
        setCurrent(pendingPopup);
        setVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pendingPopup, popupAllowed, current]);

  const handleDismiss = async () => {
    if (current) {
      await acknowledgeMilestone(current.id);
    }
    setVisible(false);
    setTimeout(() => setCurrent(null), 300);
  };

  if (!current) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 overflow-hidden border-b border-primary/20"
        >
          <div className="bg-gradient-to-r from-primary/10 to-accent/5 px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-primary">
                {getPersonaHeadline(persona)}
              </span>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <Link
              to="/me/milestones"
              onClick={handleDismiss}
              className="flex items-start gap-2.5 hover:bg-accent/30 rounded-lg p-1.5 -mx-1.5 transition-colors"
            >
              <span className="text-xl leading-none mt-0.5">{current.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold leading-tight">{current.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{current.description}</p>
              </div>
            </Link>

            {current.reward_type !== "NONE" && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-muted/50 rounded text-xs font-medium">
                {current.reward_type === "XP" && (
                  <>
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>+{current.reward_amount} XP</span>
                  </>
                )}
                {current.reward_type === "CREDITS" && (
                  <>
                    <Coins className="h-3 w-3 text-emerald-500" />
                    <span>+{current.reward_amount} Credits</span>
                  </>
                )}
                {current.reward_type === "BADGE" && (
                  <>
                    <Trophy className="h-3 w-3 text-purple-500" />
                    <Badge variant="secondary" className="text-[10px]">New Badge</Badge>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
