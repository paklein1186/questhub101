import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

const SIZE_VW = 15; // ~15% viewport width
const FLEE_DISTANCE = 120;
const FLEE_STRENGTH = 50;

// Vivid ultramarine & vermillion
const COLORS = ["#2742C8", "#E63621", "#1B3AAF", "#D42B16"];

// SVG morph paths — more fluid organic membrane forms
const PATHS = [
  "M 50 2 C 78 -4, 104 22, 98 50 C 104 78, 78 104, 50 98 C 22 104, -4 78, 2 50 C -4 22, 22 -4, 50 2 Z",
  "M 58 0 C 85 8, 100 35, 92 58 C 100 82, 68 102, 44 96 C 18 102, -2 68, 6 44 C -2 18, 30 -4, 58 0 Z",
  "M 42 1 C 68 -6, 103 18, 99 44 C 106 72, 76 103, 48 99 C 20 106, -6 76, 1 48 C -6 20, 16 6, 42 1 Z",
  "M 54 -1 C 82 4, 102 30, 96 54 C 102 80, 72 102, 46 97 C 20 102, -2 72, 4 46 C -2 20, 26 -4, 54 -1 Z",
  "M 46 3 C 74 -3, 101 24, 97 50 C 103 76, 74 101, 50 96 C 24 101, -1 76, 3 50 C -1 24, 20 6, 46 3 Z",
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
                  animate={{ stopColor: [COLORS[0], COLORS[1], COLORS[2], COLORS[3], COLORS[0]] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
                <motion.stop
                  offset="100%"
                  animate={{ stopColor: [COLORS[1], COLORS[3], COLORS[0], COLORS[2], COLORS[1]] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
              </linearGradient>
            </defs>
            <motion.path
              fill="url(#bauhaus-grad)"
              opacity={0.45}
              animate={{ d: PATHS }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.2, 0.45, 0.7, 1],
              }}
            />
          </svg>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
