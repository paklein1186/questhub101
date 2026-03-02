import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { usePiSidePanel } from "./PiSidePanelContext";
import ConversationGuide from "./ConversationGuide";
import { Badge } from "@/components/ui/badge";

const CONTEXT_LABELS: Record<string, string> = {
  global: "Global",
  onboarding: "Onboarding",
  guild: "Guild",
  quest: "Quest",
  territory: "Territory",
};

export function PiSidePanel() {
  const { session } = useAuth();
  const { isOpen, closePanel, contextType, contextId } = usePiSidePanel();
  const isMobile = useIsMobile();

  if (!session) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closePanel}
            className="fixed inset-0 z-[55] bg-background/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className={
              isMobile
                ? "fixed z-[56] inset-y-0 left-0 w-[calc(100%-3rem)] max-w-[360px] flex flex-col bg-card border-r border-border shadow-2xl"
                : "fixed z-[56] top-0 bottom-0 left-0 w-[320px] flex flex-col bg-card border-r border-border shadow-2xl"
            }
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-sm">Pi</span>
                  <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                    {CONTEXT_LABELS[contextType] || "Global"}
                  </Badge>
                </div>
              </div>
              <button
                onClick={closePanel}
                className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                title="Close Pi"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            </div>

            {/* Chat body */}
            <ConversationGuide
              contextType={contextType}
              contextId={contextId}
              inline
              expanded={isMobile}
              className="flex-1 min-h-0 border-0 rounded-none"
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
