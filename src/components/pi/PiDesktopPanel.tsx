import { useRef, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { usePiPanel } from "@/hooks/usePiPanel";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { PiModelSelector } from "./PiModelSelector";
import { PiRecentQuests } from "./PiRecentQuests";
import { PiRecentConversations } from "./PiRecentConversations";
import { PiChat } from "./PiChat";
import { cn } from "@/lib/utils";

/**
 * Desktop-only LEFT-side Pi panel that pushes app content right when open.
 * Mobile uses PiPanel (left overlay) instead.
 */
export function PiDesktopPanel() {
  const { session } = useAuth();
  const { t } = useTranslation();
  const {
    isOpen,
    closePiPanel,
    width,
    setWidth,
    isChatActive,
  } = usePiPanel();
  const isMobile = useIsMobile();
  const isResizing = useRef(false);

  const [questsOpen, setQuestsOpen] = useState(true);
  const [convsOpen, setConvsOpen] = useState(true);

  // Close volets when chat becomes active
  useEffect(() => {
    if (isChatActive) {
      setQuestsOpen(false);
      setConvsOpen(false);
    }
  }, [isChatActive]);

  // Reset volets when panel opens fresh
  useEffect(() => {
    if (isOpen && !isChatActive) {
      setQuestsOpen(true);
      setConvsOpen(true);
    }
  }, [isOpen]);

  // Resize logic — drag right edge to widen
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const startX = e.clientX;
      const startWidth = width;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        // Dragging right = larger panel
        const delta = ev.clientX - startX;
        setWidth(startWidth + delta);
      };

      const onMouseUp = () => {
        isResizing.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [width, setWidth]
  );

  // Desktop only
  if (isMobile || !session || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="fixed z-[56] top-0 bottom-0 left-0 flex flex-col bg-card border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.06)]"
          style={{ width: `${width}px` }}
          role="complementary"
          aria-label={t("pi.panelLabel")}
        >
          {/* Resize handle on right edge */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 transition-colors group z-10"
            onMouseDown={handleResizeStart}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-12 w-1 rounded-full bg-border group-hover:bg-primary/50 mx-auto" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-sm">Pi</span>
            </div>
            <div className="flex items-center gap-2">
              <PiModelSelector />
              <button
                onClick={closePiPanel}
                className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                aria-label={t("pi.closePi")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Collapsible: Recent Quests */}
          <div
            className={cn(
              "border-b border-border overflow-hidden transition-all duration-200 ease-out shrink-0",
              questsOpen ? "max-h-[300px]" : "max-h-[36px]"
            )}
          >
            <button
              onClick={() => setQuestsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{t("pi.recentQuests")}</span>
              {questsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {questsOpen && <PiRecentQuests />}
          </div>

          {/* Collapsible: Recent Conversations */}
          <div
            className={cn(
              "border-b border-border overflow-hidden transition-all duration-200 ease-out shrink-0",
              convsOpen ? "max-h-[300px]" : "max-h-[36px]"
            )}
          >
            <button
              onClick={() => setConvsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{t("pi.recentConversations")}</span>
              {convsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {convsOpen && <PiRecentConversations />}
          </div>

          {/* Chat area */}
          <PiChat className="flex-1 min-h-0" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
