import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMilestones, type MilestoneWithProgress } from "@/hooks/useMilestones";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function getPersonaHeadline(persona: string): string {
  if (persona === "CREATIVE") return "🌈 You unlocked a new creative path!";
  if (persona === "IMPACT") return "🌱 You progressed in your journey of impact.";
  return "✨ You're opening new territories.";
}

export function MilestonePopup() {
  const { user } = useAuth();
  const { persona } = usePersona();
  const { pendingPopup, acknowledgeMilestone } = useMilestones();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<MilestoneWithProgress | null>(null);

  // Check if popups are enabled and enough time has passed
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
      // At least 12 hours between popups
      const hoursSince = (Date.now() - new Date(lastPopup).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 12;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (pendingPopup && popupAllowed && !current) {
      // Delay popup appearance for calm UX
      const timer = setTimeout(() => {
        setCurrent(pendingPopup);
        setVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pendingPopup, popupAllowed, current]);

  const handleDismiss = async () => {
    if (current) {
      await acknowledgeMilestone(current.id);
    }
    setVisible(false);
    setTimeout(() => setCurrent(null), 400);
  };

  if (!current) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
        >
          <div className="rounded-2xl border border-primary/20 bg-card shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                {getPersonaHeadline(persona)}
              </span>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content — clickable to milestones page */}
            <Link to="/me/milestones" onClick={handleDismiss} className="block px-5 py-4 space-y-3 hover:bg-accent/30 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{current.icon}</span>
                <div>
                  <h3 className="font-display font-semibold text-base">{current.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{current.description}</p>
                </div>
              </div>

              {/* Reward */}
              {current.reward_type !== "NONE" && (
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  {current.reward_type === "XP" && (
                    <>
                      <CurrencyIcon currency="xp" className="h-4 w-4" />
                      <span className="text-sm font-semibold">+{current.reward_amount} XP</span>
                    </>
                  )}
                  {current.reward_type === "CREDITS" && (
                    <>
                      <Coins className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-semibold">+{current.reward_amount} Credits</span>
                    </>
                  )}
                  {current.reward_type === "BADGE" && (
                    <>
                      <Trophy className="h-4 w-4 text-purple-500" />
                      <Badge variant="secondary" className="text-xs">New Badge Unlocked</Badge>
                    </>
                  )}
                </div>
              )}
            </Link>

            {/* Actions */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/me/milestones" onClick={handleDismiss}>
                  <Trophy className="h-3.5 w-3.5 mr-1.5" />
                  See all milestones
                </Link>
              </Button>
              <Button size="sm" onClick={handleDismiss}>
                Continue
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
