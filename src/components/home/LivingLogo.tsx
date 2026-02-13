import { useEffect, useRef, useCallback, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import logoSrc from "@/assets/logogamechangers.png";

const SIZE = 42; // px base size
const FLEE_DISTANCE = 140; // cursor must be this close to trigger flee
const FLEE_STRENGTH = 90; // how far it pushes away
const ORBIT_RADIUS = 18; // px radius of self-orbit

// Color hue-rotate keyframes (degrees)
const HUE_CYCLE = [0, 30, -20, 50, -10, 20, 0];

export function LivingLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const rafId = useRef(0);

  // Smooth position for fleeing
  const fleeX = useMotionValue(0);
  const fleeY = useMotionValue(0);
  const smoothX = useSpring(fleeX, { stiffness: 60, damping: 20 });
  const smoothY = useSpring(fleeY, { stiffness: 60, damping: 20 });

  // Track mouse
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Flee loop
  useEffect(() => {
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
          // Gently return
          fleeX.set(fleeX.get() * 0.92);
          fleeY.set(fleeY.get() * 0.92);
        }
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [fleeX, fleeY]);

  return (
    <motion.div
      ref={containerRef}
      className="pointer-events-none absolute z-0"
      style={{
        left: "-1.5rem",
        top: "26%",
        x: smoothX,
        y: smoothY,
        width: SIZE,
        height: SIZE,
      }}
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {/* Wander path — large drift through whitespace */}
      <motion.div
        animate={{
          x: [0, 50, -30, 70, -15, 40, 0],
          y: [0, -60, 25, -90, 50, -30, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1],
        }}
        className="relative"
      >
        {/* Self-orbit — small circular motion around own center */}
        <motion.div
          animate={{
            x: [0, ORBIT_RADIUS, 0, -ORBIT_RADIUS, 0],
            y: [-ORBIT_RADIUS, 0, ORBIT_RADIUS, 0, -ORBIT_RADIUS],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="relative"
        >
          {/* Heartbeat pulse */}
          <motion.div
            animate={{ scale: [1, 1.09, 1, 1.05, 1, 1.11, 1.02, 1] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1],
              times: [0, 0.12, 0.22, 0.32, 0.5, 0.62, 0.72, 1],
            }}
            className="relative"
          >
            {/* Spin + fluid deformation */}
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="relative"
              style={{ width: SIZE, height: SIZE }}
            >
              <motion.div
                animate={{
                  scaleX: [1, 1.14, 0.92, 1.08, 0.95, 1.1, 1],
                  scaleY: [1, 0.9, 1.12, 0.94, 1.07, 0.92, 1],
                  skewX: [0, 4, -3, 5, -2, 2, 0],
                  skewY: [0, -3, 4, -2, 3, -1, 0],
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.14, 0.28, 0.42, 0.58, 0.8, 1],
                }}
                className="relative w-full h-full"
              >
                {/* Colour-shifting hue rotation */}
                <motion.div
                  animate={{
                    filter: HUE_CYCLE.map((h) => `hue-rotate(${h}deg) drop-shadow(0 0 5px hsl(var(--primary) / 0.2))`),
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                  className="w-full h-full"
                >
                  <img
                    src={logoSrc}
                    alt=""
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
