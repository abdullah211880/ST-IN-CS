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

const PARTICLE_COUNT = 55;
const MAX_LINK_DIST = 160;
const CYAN = "0, 212, 255";
const BLUE = "30, 120, 220";

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
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1.2 + Math.random() * 2.2,
        opacity: 0.3 + Math.random() * 0.55,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.016,
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

        if (a.x < -15) a.x = canvas.width + 15;
        if (a.x > canvas.width + 15) a.x = -15;
        if (a.y < -15) a.y = canvas.height + 15;
        if (a.y > canvas.height + 15) a.y = -15;

        const pulse = 0.65 + 0.35 * Math.sin(a.pulsePhase);
        const opacity = a.opacity * pulse;

        const grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.radius * 2.5 * pulse);
        grad.addColorStop(0, `rgba(${CYAN}, ${opacity})`);
        grad.addColorStop(1, `rgba(${CYAN}, 0)`);
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius * 2.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius * pulse * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${CYAN}, ${Math.min(opacity * 1.4, 1)})`;
        ctx.fill();

        for (let j = i + 1; j < ps.length; j++) {
          const b = ps[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_LINK_DIST) {
            const t = 1 - dist / MAX_LINK_DIST;
            const linkOpacity = t * t * 0.22;

            const lineGrad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            lineGrad.addColorStop(0, `rgba(${CYAN}, ${linkOpacity})`);
            lineGrad.addColorStop(0.5, `rgba(${BLUE}, ${linkOpacity * 0.7})`);
            lineGrad.addColorStop(1, `rgba(${CYAN}, ${linkOpacity})`);

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = lineGrad;
            ctx.lineWidth = t * 1.2;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    init();
    draw();

    const ro = new ResizeObserver(resize);
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
