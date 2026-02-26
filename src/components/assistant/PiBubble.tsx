import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConversationGuide from "@/components/assistant/ConversationGuide";
import type { ConversationGuideProps } from "@/components/assistant/ConversationGuide";

/**
 * Pi Bubble — a small floating circle that opens a centered overlay chat.
 * Used on entity pages (guild, quest, territory). Homepage uses inline mode instead.
 */
export function PiBubble({
  contextType,
  contextId,
}: Pick<ConversationGuideProps, "contextType" | "contextId">) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating bubble trigger */}
      {!open && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center"
          title="Talk to Pi"
        >
          <Sparkles className="h-5 w-5" />
        </motion.button>
      )}

      {/* Centered overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[55] bg-background/60 backdrop-blur-sm"
            />

            {/* Chat panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed z-[56] inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-[10vh] sm:top-[12vh] sm:w-[520px] max-h-[76vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Pi</span>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {contextType}
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Guide body */}
              <ConversationGuide
                contextType={contextType}
                contextId={contextId}
                inline
                className="flex-1 min-h-0 border-0 rounded-none"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
