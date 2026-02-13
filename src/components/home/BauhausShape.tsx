import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

const SIZE_VW = 15; // ~15% viewport width
const FLEE_DISTANCE = 120;
const FLEE_STRENGTH = 50;

// Muted ultramarine & vermillion
const COLORS = ["#3B4B96", "#C0392B"];

// SVG morph paths — controlled geometric forms
const PATHS = [
  "M 50 5 C 75 0, 100 25, 95 50 C 100 75, 75 100, 50 95 C 25 100, 0 75, 5 50 C 0 25, 25 0, 50 5 Z",
  "M 55 2 C 80 5, 98 30, 93 55 C 98 78, 70 98, 48 93 C 22 98, 2 72, 7 48 C 2 22, 28 2, 55 2 Z",
  "M 48 3 C 72 -2, 97 22, 96 47 C 102 70, 78 97, 52 96 C 28 102, 3 78, 4 52 C -2 28, 22 5, 48 3 Z",
  "M 52 4 C 78 2, 99 28, 94 52 C 99 76, 74 99, 50 94 C 26 99, 1 74, 6 50 C 1 26, 26 4, 52 4 Z",
];

export function BauhausShape() {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const rafId = useRef(0);

  const fleeX = useMotionValue(0);
  const fleeY = useMotionValue(0);
  const smoothX = useSpring(fleeX, { stiffness: 30, damping: 25 });
  const smoothY = useSpring(fleeY, { stiffness: 30, damping: 25 });

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

  // Gentle repulsion loop (desktop only)
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

  const duration = isMobile ? 50 : 40;

  return (
    <motion.div
      ref={containerRef}
      className="pointer-events-none fixed z-0"
      style={{
        right: "6%",
        top: "12%",
        width: `${SIZE_VW}vw`,
        height: `${SIZE_VW}vw`,
        maxWidth: 280,
        maxHeight: 280,
        minWidth: 100,
        minHeight: 100,
        x: smoothX,
        y: smoothY,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, ease: "easeOut" }}
    >
      {/* Structured orbital drift */}
      <motion.div
        animate={{
          x: [0, 20, -10, 15, -5, 10, 0],
          y: [0, -15, 10, -20, 8, -10, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
        }}
        className="w-full h-full"
      >
        {/* Slow rotation */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="w-full h-full"
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ willChange: "transform" }}
          >
            <defs>
              <linearGradient id="bauhaus-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <motion.stop
                  offset="0%"
                  animate={{ stopColor: [COLORS[0], COLORS[1], COLORS[0]] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.stop
                  offset="100%"
                  animate={{ stopColor: [COLORS[1], COLORS[0], COLORS[1]] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
              </linearGradient>
            </defs>
            <motion.path
              fill="url(#bauhaus-grad)"
              opacity={0.18}
              animate={{ d: PATHS }}
              transition={{
                duration: 16,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.33, 0.66, 1],
              }}
            />
          </svg>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
