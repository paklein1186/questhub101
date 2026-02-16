import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS = [
  "hsl(262, 83%, 58%)",  // primary violet
  "hsl(330, 80%, 60%)",  // rose
  "hsl(45, 93%, 58%)",   // gold
  "hsl(190, 80%, 55%)",  // cyan
  "hsl(140, 60%, 50%)",  // green
  "hsl(20, 90%, 60%)",   // orange
];

/**
 * Full-screen subtle fireworks / confetti sparkle effect.
 * Renders particles on a fixed canvas overlay, then auto-removes.
 */
export function ConfettiSpark({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Create particles from 2-3 burst points
    const particles: Particle[] = [];
    const burstCount = 2 + Math.floor(Math.random() * 2);

    for (let b = 0; b < burstCount; b++) {
      const cx = w * (0.2 + Math.random() * 0.6);
      const cy = h * (0.2 + Math.random() * 0.4);
      const count = 20 + Math.floor(Math.random() * 15);

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        const life = 220 + Math.floor(Math.random() * 30);
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life,
          maxLife: life,
          size: 2 + Math.random() * 3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          gravity: 0.03 + Math.random() * 0.02,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
        });
      }
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.life--;
        p.rotation += p.rotationSpeed;

        const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        // Draw small rectangles (confetti-like)
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (alive > 0) {
        frame = requestAnimationFrame(animate);
      } else {
        onDone();
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      aria-hidden
    />
  );
}
