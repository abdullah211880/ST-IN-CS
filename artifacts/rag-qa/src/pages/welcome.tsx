import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetOverviewStats, getGetOverviewStatsQueryKey } from "@workspace/api-client-react";
import { ArrowRight, Brain, Search, FileText, Sparkles, Database, Zap, ShieldCheck } from "lucide-react";

/* ─── Particle canvas ─── */
interface Particle { x: number; y: number; vx: number; vy: number; r: number; op: number; phase: number; speed: number; }

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const anim = useRef(0);
  const pts = useRef<Particle[]>([]);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;

    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize();
    pts.current = Array.from({ length: 70 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
      r: 1 + Math.random() * 2.2, op: 0.25 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2, speed: 0.007 + Math.random() * 0.014,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < pts.current.length; i++) {
        const a = pts.current[i];
        a.x += a.vx; a.y += a.vy; a.phase += a.speed;
        if (a.x < -15) a.x = c.width + 15; if (a.x > c.width + 15) a.x = -15;
        if (a.y < -15) a.y = c.height + 15; if (a.y > c.height + 15) a.y = -15;
        const p = 0.6 + 0.4 * Math.sin(a.phase), op = a.op * p;
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 3 * p);
        g.addColorStop(0, `rgba(0,212,255,${op})`); g.addColorStop(1, `rgba(0,212,255,0)`);
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 3 * p, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r * p * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${Math.min(op * 1.6, 1)})`; ctx.fill();
        for (let j = i + 1; j < pts.current.length; j++) {
          const b = pts.current[j], dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const t = (1 - dist / 160) * 0.2;
            const lg = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            lg.addColorStop(0, `rgba(0,212,255,${t})`); lg.addColorStop(1, `rgba(30,120,220,${t * 0.6})`);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = lg; ctx.lineWidth = (1 - dist / 160) * 1.2; ctx.stroke();
          }
        }
      }
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    const ro = new ResizeObserver(resize); ro.observe(c);
    return () => { cancelAnimationFrame(anim.current); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ─── Animated orb ─── */
function Orb() {
  return (
    <div className="relative w-64 h-64 mx-auto mb-10">
      {/* Outer glow rings */}
      <div className="absolute inset-0 rounded-full animate-[ping_3s_ease-in-out_infinite] bg-cyan-400/5" />
      <div className="absolute inset-4 rounded-full animate-[ping_3s_ease-in-out_infinite_0.5s] bg-cyan-400/8" />
      {/* Main orb */}
      <div className="absolute inset-8 rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 35%, hsl(192 100% 75% / 0.9), hsl(210 100% 50% / 0.7) 40%, hsl(230 80% 20% / 0.9) 75%, hsl(225 71% 8%/1))",
          boxShadow: "0 0 40px hsl(192 100% 50% / 0.5), 0 0 100px hsl(192 100% 40% / 0.25), inset 0 0 40px hsl(210 100% 70% / 0.15)",
        }}
      />
      {/* Shine */}
      <div className="absolute inset-8 rounded-full overflow-hidden">
        <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-lg" />
      </div>
      {/* Orbit ring */}
      <div className="absolute inset-2 rounded-full border border-cyan-400/20 animate-[spin_12s_linear_infinite]"
        style={{ borderStyle: "dashed" }}
      />
      <div className="absolute inset-0 rounded-full border border-cyan-300/10 animate-[spin_20s_linear_infinite_reverse]" />
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Brain className="w-12 h-12 text-cyan-200 drop-shadow-[0_0_12px_hsl(192_100%_80%/0.8)]" />
      </div>
    </div>
  );
}

/* ─── Agent feature card ─── */
interface AgentCardProps { icon: React.ReactNode; name: string; role: string; color: string; delay: string; }
function AgentCard({ icon, name, role, color, delay }: AgentCardProps) {
  return (
    <div
      className="relative p-5 rounded-xl border bg-card/40 backdrop-blur-md group hover:scale-105 transition-all duration-300"
      style={{
        borderColor: `${color}30`,
        boxShadow: `0 0 0 1px ${color}10, 0 4px 24px ${color}0a`,
        animationDelay: delay,
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 0 1px ${color}50, 0 8px 32px ${color}25`)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 1px ${color}10, 0 4px 24px ${color}0a`)}
    >
      <div className="mb-3 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <h3 className="font-semibold text-sm text-foreground mb-1">{name}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{role}</p>
    </div>
  );
}

/* ─── Stat pill ─── */
function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center px-6 py-3 rounded-xl border border-white/8 bg-white/4 backdrop-blur-sm">
      <span className="text-2xl font-bold text-cyan-300 tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

/* ─── Main welcome page ─── */
export default function Welcome() {
  const [, setLocation] = useLocation();
  const [show, setShow] = useState(false);
  const { data: stats } = useGetOverviewStats({ query: { queryKey: getGetOverviewStatsQueryKey() } });

  useEffect(() => { const t = setTimeout(() => setShow(true), 80); return () => clearTimeout(t); }, []);

  const agents = [
    { icon: <FileText className="w-5 h-5" />, name: "TextAgent", role: "Chunks raw documents into semantic passages for precise retrieval", color: "#00d4ff", delay: "0ms" },
    { icon: <Sparkles className="w-5 h-5" />, name: "TopicModelingAgent", role: "Infers latent topics with GPT for intelligent routing", color: "#a78bfa", delay: "80ms" },
    { icon: <Search className="w-5 h-5" />, name: "RetrievalAgent", role: "Performs cosine-similarity search across the knowledge base", color: "#34d399", delay: "160ms" },
    { icon: <ShieldCheck className="w-5 h-5" />, name: "AnswerSynthesisAgent", role: "Synthesizes cited, structured answers from retrieved evidence", color: "#fb923c", delay: "240ms" },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-background">
      <ParticleCanvas />

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-cyan-400/6 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] rounded-full bg-blue-600/6 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-cyan-400" />
          <span className="font-bold text-lg tracking-tight text-foreground">RAG Engine</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Instagram */}
          <a
            href="https://www.instagram.com/ragsystem"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="@ragsystem on Instagram"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{ background: "hsl(228 50% 12%/0.8)", border: "1px solid hsl(320 50% 30%/0.3)" }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "linear-gradient(135deg, hsl(285 80% 30%/0.7), hsl(340 85% 35%/0.7), hsl(35 90% 35%/0.7))";
              el.style.borderColor = "hsl(320 70% 55%/0.6)";
              el.style.boxShadow = "0 0 12px hsl(320 80% 50%/0.35)";
              el.style.transform = "scale(1.1)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "hsl(228 50% 12%/0.8)";
              el.style.borderColor = "hsl(320 50% 30%/0.3)";
              el.style.boxShadow = "";
              el.style.transform = "scale(1)";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "hsl(320 70% 75%)" }}>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4.5" />
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </a>

          <button
            onClick={() => setLocation("/overview")}
            className="text-sm text-muted-foreground hover:text-cyan-300 transition-colors flex items-center gap-1.5 group"
          >
            Skip to dashboard
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <main
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-4 pb-16 text-center"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        <Orb />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/8 text-cyan-300 text-xs font-medium mb-6 backdrop-blur-sm">
          <Zap className="w-3 h-3" />
          MCP-Powered · Agent-Oriented Retrieval
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-[1.1]">
          <span className="text-foreground">Document</span>
          <br />
          <span style={{
            background: "linear-gradient(135deg, hsl(192 100% 70%) 0%, hsl(210 100% 65%) 40%, hsl(260 80% 70%) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Intelligence
          </span>
          <span className="text-foreground"> Platform</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-xl text-base text-muted-foreground mb-10 leading-relaxed">
          Upload enterprise documents and ask natural-language questions. Four specialized AI agents
          orchestrate retrieval, topic modeling, and answer synthesis — with full source citations.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <button
            onClick={() => setLocation("/sessions")}
            className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(192 100% 40%), hsl(210 100% 45%))",
              color: "#fff",
              boxShadow: "0 0 24px hsl(192 100% 48% / 0.45), 0 4px 16px hsl(192 100% 30% / 0.3)",
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 36px hsl(192 100% 48% / 0.65), 0 8px 24px hsl(192 100% 30% / 0.4)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 24px hsl(192 100% 48% / 0.45), 0 4px 16px hsl(192 100% 30% / 0.3)")}
          >
            <span>Start Analyzing</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => setLocation("/documents")}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm border border-white/12 bg-white/5 text-foreground hover:bg-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-sm"
          >
            <FileText className="w-4 h-4" />
            Upload Documents
          </button>
        </div>

        {/* Agent cards grid */}
        <div className="w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
          {agents.map(a => <AgentCard key={a.name} {...a} />)}
        </div>

        {/* Stats row */}
        {stats && (
          <div className="flex flex-wrap justify-center gap-3">
            <StatPill label="Documents Indexed" value={stats.totalDocuments ?? 0} />
            <StatPill label="Knowledge Chunks" value={stats.totalChunks ?? 0} />
            <StatPill label="Questions Answered" value={stats.totalQuestions ?? 0} />
            {stats.avgAnswerTimeMs != null && (
              <StatPill label="Avg Answer Time" value={`${(stats.avgAnswerTimeMs / 1000).toFixed(1)}s`} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
