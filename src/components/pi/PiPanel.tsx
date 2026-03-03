import { useRef, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import { usePiPanel } from "@/hooks/usePiPanel";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { PiModelSelector } from "./PiModelSelector";
import { PiRecentQuests } from "./PiRecentQuests";
import { PiRecentConversations } from "./PiRecentConversations";
import { PiChat } from "./PiChat";
import { cn } from "@/lib/utils";

const BREAKPOINT_OVERLAY = 1280;

export function PiPanel() {
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
  const panelRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const [questsOpen, setQuestsOpen] = useState(true);
  const [convsOpen, setConvsOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1400);

  // Track window width for responsive
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Resize logic
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

  if (!session || !isOpen) return null;

  const isFullscreen = isMobile || windowWidth < 768;
  const isOverlay = windowWidth < BREAKPOINT_OVERLAY;
  const panelWidth = isFullscreen ? "100vw" : `${width}px`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for overlay mode */}
          {isOverlay && !isFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closePiPanel}
              className="fixed inset-0 z-[55] bg-background/50 backdrop-blur-sm"
            />
          )}

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className={cn(
              "fixed z-[56] top-0 bottom-0 left-0 flex flex-col bg-card border-r border-border",
              isFullscreen ? "w-screen" : "",
              !isFullscreen && "shadow-[4px_0_12px_rgba(0,0,0,0.06)]"
            )}
            style={{ width: isFullscreen ? undefined : panelWidth }}
            role="complementary"
            aria-label={t("pi.panelLabel")}
          >
            {/* Resize handle on right edge (desktop only) */}
            {!isFullscreen && (
              <div
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 transition-colors group z-10"
                onMouseDown={handleResizeStart}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-12 w-1 rounded-full bg-border group-hover:bg-primary/50 mx-auto" />
              </div>
            )}

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
        </>
      )}
    </AnimatePresence>
  );
}
