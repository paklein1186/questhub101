import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, useSpring, useAnimationControls } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

const FLEE_DISTANCE = 120;
const FLEE_STRENGTH = 50;

const COLORS = ["#2742C8", "#E63621", "#1B3AAF", "#D42B16"];

const PATHS = [
  "M 50 -2 C 82 -8, 108 20, 102 50 C 108 82, 78 108, 50 102 C 18 108, -8 78, -2 50 C -8 18, 20 -8, 50 -2 Z",
  "M 62 -4 C 90 10, 106 38, 94 62 C 106 88, 64 108, 38 100 C 10 108, -6 64, 8 38 C -6 10, 34 -8, 62 -4 Z",
  "M 36 0 C 64 -10, 110 14, 104 40 C 112 68, 72 110, 44 104 C 14 112, -10 68, -4 44 C -10 16, 10 8, 36 0 Z",
  "M 56 -3 C 86 6, 104 34, 98 56 C 106 84, 68 106, 42 100 C 14 106, -6 68, 2 42 C -6 14, 28 -8, 56 -3 Z",
  "M 44 1 C 76 -6, 107 20, 100 48 C 108 78, 76 107, 48 102 C 18 108, -6 78, 0 48 C -6 18, 14 6, 44 1 Z",
  "M 52 -5 C 84 0, 108 26, 100 52 C 110 80, 70 110, 46 102 C 16 110, -8 72, 0 46 C -8 20, 22 -8, 52 -5 Z",
];

export function BauhausShape() {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const rafId = useRef(0);
  const [clicked, setClicked] = useState(false);
  const scaleControls = useAnimationControls();

  const fleeX = useMotionValue(0);
  const fleeY = useMotionValue(0);
  const smoothX = useSpring(fleeX, { stiffness: 30, damping: 25 });
  const smoothY = useSpring(fleeY, { stiffness: 30, damping: 25 });

  const handleClick = useCallback(() => {
    if (clicked) return;
    setClicked(true);
    scaleControls.stop();
    scaleControls.start({
      scale: 0.5,
      transition: { duration: 0.12, ease: "easeOut" },
    }).then(() =>
      scaleControls.start({
        scale: 1,
        transition: { duration: 5, ease: [0.22, 1, 0.36, 1] },
      })
    ).then(() => setClicked(false));
  }, [clicked, scaleControls]);

  // Track mouse (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const onMove = (e: MouseEvent) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [isMobile]);

  // Gentle repulsion (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const tick = () => {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cx - mouseX.current;
        const dy = cy - mouseY.current;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < FLEE_DISTANCE && dist > 1) {
          const factor = (1 - dist / FLEE_DISTANCE) * FLEE_STRENGTH;
          fleeX.set((dx / dist) * factor);
          fleeY.set((dy / dist) * factor);
        } else {
          fleeX.set(fleeX.get() * 0.95);
          fleeY.set(fleeY.get() * 0.95);
        }
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [isMobile, fleeX, fleeY]);

  const wanderDuration = isMobile ? 55 : 35;
  // Mobile: smaller, repositioned to stay visible
  const sizeStyle = isMobile
    ? { width: "34vw", height: "34vw", maxWidth: 200, maxHeight: 200, minWidth: 90, minHeight: 90 }
    : { width: "20vw", height: "20vw", maxWidth: 380, maxHeight: 380, minWidth: 120, minHeight: 120 };

  const positionStyle = isMobile
    ? { right: "4%", top: "8%" }
    : { right: "6%", top: "12%" };

  return createPortal(
    <div
      ref={containerRef}
      className="pointer-events-auto fixed z-0 cursor-pointer"
      style={{
        ...positionStyle,
        ...sizeStyle,
      }}
    >
      <motion.div
        className="w-full h-full"
        style={{
          x: isMobile ? 0 : smoothX,
          y: isMobile ? 0 : smoothY,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        onClick={handleClick}
      >
      {/* Wide wandering orbit */}
      <motion.div
        animate={{
          x: isMobile
            ? [0, 20, -15, 25, -10, 15, 0]
            : [0, 60, -40, 80, -30, 50, -20, 40, 0],
          y: isMobile
            ? [0, -20, 15, -25, 20, -10, 0]
            : [0, -50, 30, -70, 60, -40, 20, -30, 0],
        }}
        transition={{
          duration: wanderDuration,
          repeat: Infinity,
          ease: "easeInOut",
          times: isMobile
            ? [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1]
            : [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1],
        }}
        className="w-full h-full"
      >
        {/* Click scale reaction */}
        <motion.div animate={scaleControls} className="w-full h-full">
          {/* Soft breathing scale */}
          <motion.div
            animate={{ scale: [1, 1.3, 0.45, 0.9, 1.15, 0.6, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", times: [0, 0.15, 0.35, 0.5, 0.7, 0.85, 1] }}
            className="w-full h-full"
          >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="w-full h-full"
          >
            <svg
              viewBox="-10 -10 120 120"
              className="w-full h-full overflow-visible"
              style={{ willChange: "transform" }}
            >
              <defs>
                <linearGradient id="bauhaus-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <motion.stop
                    offset="0%"
                    animate={{ stopColor: [COLORS[0], COLORS[1], COLORS[2], COLORS[3], COLORS[0]] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.stop
                    offset="100%"
                    animate={{ stopColor: [COLORS[1], COLORS[3], COLORS[0], COLORS[2], COLORS[1]] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  />
                </linearGradient>
                {/* Soft shadow filter — light from center of page (top-left of shape) */}
                <filter id="bauhaus-shadow" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="-6" dy="4" stdDeviation="5" floodColor="#1E1E1E" floodOpacity="0.32" />
                  <feDropShadow dx="-3" dy="2" stdDeviation="2" floodColor="#1E1E1E" floodOpacity="0.18" />
                </filter>
              </defs>
              <motion.path
                fill="url(#bauhaus-grad)"
                opacity={0.45}
                filter="url(#bauhaus-shadow)"
                animate={{ d: PATHS }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.18, 0.36, 0.54, 0.72, 1],
                }}
              />
            </svg>
           </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
      </motion.div>
    </div>,
    document.body
  );
}
