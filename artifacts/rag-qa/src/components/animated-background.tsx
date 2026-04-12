import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  pulsePhase: number;
  pulseSpeed: number;
}

const PARTICLE_COUNT = 38;
const MAX_LINK_DIST = 140;
const PRIMARY_COLOR = "0, 178, 169";
const DIM_COLOR = "100, 160, 200";

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const init = () => {
      resize();
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: 1.5 + Math.random() * 2,
        opacity: 0.25 + Math.random() * 0.45,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.012 + Math.random() * 0.02,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const ps = particlesRef.current;

      for (let i = 0; i < ps.length; i++) {
        const a = ps[i];
        a.x += a.vx;
        a.y += a.vy;
        a.pulsePhase += a.pulseSpeed;

        if (a.x < -10) a.x = canvas.width + 10;
        if (a.x > canvas.width + 10) a.x = -10;
        if (a.y < -10) a.y = canvas.height + 10;
        if (a.y > canvas.height + 10) a.y = -10;

        const pulseMod = 0.7 + 0.3 * Math.sin(a.pulsePhase);
        const finalOpacity = a.opacity * pulseMod;

        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius * pulseMod, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${PRIMARY_COLOR}, ${finalOpacity})`;
        ctx.fill();

        for (let j = i + 1; j < ps.length; j++) {
          const b = ps[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_LINK_DIST) {
            const linkOpacity = (1 - dist / MAX_LINK_DIST) * 0.18 * pulseMod;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${DIM_COLOR}, ${linkOpacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    init();
    draw();

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
