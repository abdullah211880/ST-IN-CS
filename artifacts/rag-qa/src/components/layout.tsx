import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Database, FileText, MessageSquare, Home,
  Bot, Send, X, Loader2, ChevronDown, Sparkles,
  ChevronLeft, ChevronRight, Lightbulb, Sun, Moon, Target, Bug, ShieldCheck,
} from "lucide-react";
import { SuggestFeatureDialog } from "@/components/suggest-feature-dialog";
import { useTheme } from "@/contexts/theme-context";
import { useLang } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

/* ─── types ─────────────────────────────────────────────── */
interface LayoutProps { children: ReactNode; }
interface ChatMessage { role: "user" | "assistant"; content: string; }

const NAV_CONFIG = [
  { key: "navDocuments" as const, href: "/documents",  icon: FileText,      color: "192" },
  { key: "navSessions"  as const, href: "/sessions",   icon: MessageSquare, color: "260" },
  { key: "navGoals"     as const, href: "/goals",      icon: Target,        color: "142" },
  { key: "navBugFinder"       as const, href: "/bug-finder",        icon: Bug,          color: "22"  },
  { key: "navPasswordChecker" as const, href: "/password-checker",  icon: ShieldCheck,  color: "270" },
];

/* ─── animated orb ──────────────────────────────────────── */
function SidebarOrb({ cx, cy, r, hue, delay }: { cx: string; cy: string; r: string; hue: string; delay: string }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: cx, top: cy, width: r, height: r,
        transform: "translate(-50%,-50%)",
        background: `radial-gradient(circle, hsl(${hue} 90% 60% / 0.12) 0%, transparent 70%)`,
        filter: "blur(18px)",
        animation: `orb-float 7s ease-in-out infinite alternate`,
        animationDelay: delay,
      }}
    />
  );
}

/* ─── AI assistant panel ─────────────────────────────────── */
function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your RAG Engine assistant. Ask me anything about the system's features — uploads, summaries, Q&A sessions, TTS, and more." },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: next.slice(-6) }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", content: data.reply ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Connection error — please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shrink-0">
      {/* Collapsed trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-2.5 px-4 py-3 transition-all duration-300 group",
          open ? "border-t border-b border-cyan-400/15" : "border-t border-sidebar-border hover:bg-white/4"
        )}
        style={open ? {
          background: "linear-gradient(135deg, hsl(192 60% 8%/1), hsl(230 60% 7%/1))",
        } : {}}
      >
        {/* Bot icon with pulse ring */}
        <div className="relative shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(192 100% 35%), hsl(260 80% 45%))",
              boxShadow: "0 0 10px hsl(192 100% 48%/0.4)",
            }}>
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-sidebar"
            style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-semibold text-foreground leading-none">AI Assistant</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
            {open ? "Ask about any feature" : "Click to get help"}
          </p>
        </div>
        {/* ← AiAssistant has no access to t(), handled in Layout below via CSS classes */}

        <ChevronDown className={cn(
          "w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-300 shrink-0",
          open && "rotate-180"
        )} />
      </button>

      {/* Chat panel */}
      <div
        className="overflow-hidden transition-all duration-400"
        style={{ maxHeight: open ? "320px" : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="flex flex-col"
          style={{ background: "linear-gradient(180deg, hsl(225 60% 6%/1), hsl(228 70% 5%/1))", height: 320 }}>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="w-5 h-5 rounded-full shrink-0 mr-1.5 mt-0.5 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, hsl(192 100% 35%), hsl(260 80% 45%))", flexShrink: 0 }}>
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed",
                    m.role === "user"
                      ? "text-cyan-50 rounded-tr-sm"
                      : "text-foreground/90 rounded-tl-sm border border-white/6"
                  )}
                  style={m.role === "user" ? {
                    background: "linear-gradient(135deg, hsl(192 80% 30%), hsl(210 80% 35%))",
                  } : {
                    background: "hsl(228 50% 10%/1)",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1.5 px-1">
                <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(192 100% 35%), hsl(260 80% 45%))" }}>
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="flex gap-1 py-2">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"
                      style={{ animation: `bounce-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-2 py-2 border-t border-white/6">
            <div className="flex gap-1.5 items-center rounded-lg px-2 py-1"
              style={{ background: "hsl(228 50% 9%/1)", border: "1px solid hsl(192 60% 30%/0.2)" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask about features…"
                className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                style={{
                  background: input.trim() && !loading
                    ? "linear-gradient(135deg, hsl(192 100% 38%), hsl(210 100% 42%))"
                    : "hsl(228 40% 15%)",
                }}
              >
                {loading ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Send className="w-3 h-3 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── main layout ────────────────────────────────────────── */
export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { lang, dir, toggleLang, t } = useLang();
  const isRTL = lang === "ar";

  useEffect(() => { const tid = setTimeout(() => setMounted(true), 50); return () => clearTimeout(tid); }, []);

  return (
    <div
      className="layout-root flex h-screen w-full bg-background overflow-hidden"
      dir={dir}
    >

      {/* Persistent open-tab (visible only when sidebar is closed) */}
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
        className="fixed top-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-center gap-1 transition-all duration-300"
        style={{
          [isRTL ? "right" : "left"]: 0,
          width: 20,
          height: 72,
          borderRadius: isRTL ? "10px 0 0 10px" : "0 10px 10px 0",
          background: "linear-gradient(180deg, var(--open-tab-from), var(--open-tab-to))",
          borderTop: "1px solid hsl(192 60% 40%/0.3)",
          borderBottom: "1px solid hsl(192 60% 40%/0.3)",
          [isRTL ? "borderLeft" : "borderRight"]: "1px solid hsl(192 60% 40%/0.3)",
          [isRTL ? "borderRight" : "borderLeft"]: "none",
          boxShadow: isRTL ? "-4px 0 16px hsl(192 100% 48%/0.2)" : "4px 0 16px hsl(192 100% 48%/0.2)",
          opacity: sidebarOpen ? 0 : 1,
          pointerEvents: sidebarOpen ? "none" : "auto",
          transform: `translateY(-50%) translateX(${sidebarOpen ? (isRTL ? "100%" : "-100%") : "0"})`,
        }}
      >
        {isRTL
          ? <ChevronLeft  className="w-3 h-3 text-cyan-600 dark:text-cyan-300" />
          : <ChevronRight className="w-3 h-3 text-cyan-600 dark:text-cyan-300" />}
      </button>

      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col relative overflow-hidden"
        style={{
          order: isRTL ? 2 : 0,
          width: sidebarOpen ? 256 : 0,
          minWidth: 0,
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), background 0.3s ease",
          background: `linear-gradient(180deg, var(--sidebar-grad-from) 0%, var(--sidebar-grad-to) 100%)`,
          ...(sidebarOpen
            ? isRTL
              ? { borderLeft: `1px solid var(--sidebar-border-c)` }
              : { borderRight: `1px solid var(--sidebar-border-c)` }
            : {}),
        }}
      >
        {/* Animated background orbs */}
        <div style={{ opacity: "var(--sidebar-orb-op)" }}>
          <SidebarOrb cx="20%"  cy="15%"  r="180px" hue="192" delay="0s" />
          <SidebarOrb cx="80%"  cy="40%"  r="140px" hue="260" delay="2.5s" />
          <SidebarOrb cx="30%"  cy="75%"  r="160px" hue="210" delay="1.2s" />
        </div>

        {/* Animated top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(192 100% 50%), hsl(260 80% 60%), hsl(192 100% 50%), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer-line 3s linear infinite",
          }}
        />

        {/* Logo / home link */}
        <div
          className="relative z-10 h-16 flex items-center px-4 shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-divider)" }}
        >
          <Link href="/" className="flex items-center flex-1 min-w-0 group transition-all duration-300">
            {/* Animated icon */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
              style={{
                marginInlineEnd: "0.75rem",
                background: "linear-gradient(135deg, hsl(192 100% 35%), hsl(210 90% 40%))",
                boxShadow: "0 0 14px hsl(192 100% 48%/0.5)",
                animation: "logo-pulse 3s ease-in-out infinite",
              }}>
              <Database className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-foreground group-hover:text-cyan-300 transition-colors">
                RAG Engine
              </span>
              <span className="text-[10px] text-muted-foreground/50 group-hover:text-cyan-400/60 transition-colors">
                Document Intelligence
              </span>
            </div>
          </Link>
          {/* Collapse button */}
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              marginInlineStart: "0.5rem",
              background: "hsl(228 50% 12%/0.8)",
              border: "1px solid hsl(192 40% 25%/0.25)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "hsl(192 60% 20%/0.4)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 8px hsl(192 100% 48%/0.25)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "hsl(228 50% 12%/0.8)";
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            {isRTL
              ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              : <ChevronLeft  className="w-3.5 h-3.5 text-muted-foreground/60" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground/40 px-2 mb-3 tracking-[0.12em] uppercase">
            {t("navLabel")}
          </p>

          {NAV_CONFIG.map(({ key, href, icon: Icon, color }, idx) => {
            const name = t(key);
            const isActive = location === href || location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground/70 hover:text-foreground"
                )}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateX(0)" : "translateX(-12px)",
                  transition: `opacity 0.4s ease ${idx * 0.08 + 0.1}s, transform 0.4s ease ${idx * 0.08 + 0.1}s, background 0.2s, box-shadow 0.2s`,
                  ...(isActive ? {
                    background: `linear-gradient(135deg, hsl(${color} 80% 25%/0.8), hsl(${color} 70% 20%/0.5))`,
                    boxShadow: `0 0 0 1px hsl(${color} 80% 50%/0.25), 0 0 16px hsl(${color} 90% 50%/0.2)`,
                  } : {}),
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = `hsl(${color} 60% 20%/0.15)`;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px hsl(${color} 80% 50%/0.12)`;
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "";
                    (e.currentTarget as HTMLElement).style.boxShadow = "";
                  }
                }}
              >
                {/* Active side bar indicator – left in LTR, right in RTL */}
                {isActive && (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{
                      [isRTL ? "right" : "left"]: 0,
                      background: `linear-gradient(180deg, hsl(${color} 100% 65%), hsl(${color} 80% 45%))`,
                      boxShadow: `0 0 8px hsl(${color} 100% 60%/0.7)`,
                    }}
                  />
                )}

                {/* Icon container */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
                  style={{
                    marginInlineEnd: "0.75rem",
                    ...(isActive ? {
                      background: `hsl(${color} 80% 50%/0.2)`,
                      border: `1px solid hsl(${color} 80% 50%/0.3)`,
                    } : {
                      background: "hsl(228 40% 15%/0.6)",
                      border: "1px solid hsl(228 40% 25%/0.4)",
                    }),
                  }}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: isActive ? `hsl(${color} 90% 70%)` : undefined }}
                  />
                </div>

                <span className="flex-1">{name}</span>

                {/* Active glow dot */}
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: `hsl(${color} 100% 65%)`,
                      boxShadow: `0 0 6px hsl(${color} 100% 60%)`,
                      animation: "pulse-dot 2s ease-in-out infinite",
                    }}
                  />
                )}
              </Link>
            );
          })}

          {/* Suggest a Feature button */}
          <div className="pt-3 pb-1">
            <button
              onClick={() => setSuggestOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateX(0)" : "translateX(-10px)",
                transition: "opacity 0.4s ease 0.28s, transform 0.4s ease 0.28s, background 0.2s, box-shadow 0.2s",
                background: theme === "dark" ? "hsl(38 80% 12%/0.5)" : "hsl(38 90% 92%)",
                border: theme === "dark" ? "1px solid hsl(38 80% 40%/0.2)" : "1px solid hsl(38 80% 75%/0.5)",
                color: theme === "dark" ? "#fbbf24" : "#92400e",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = theme === "dark" ? "hsl(38 80% 16%/0.7)" : "hsl(38 90% 88%)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px hsl(38 100% 50%/0.15)";
                (e.currentTarget as HTMLElement).style.borderColor = theme === "dark" ? "hsl(38 80% 50%/0.35)" : "hsl(38 80% 65%/0.6)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = theme === "dark" ? "hsl(38 80% 12%/0.5)" : "hsl(38 90% 92%)";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
                (e.currentTarget as HTMLElement).style.borderColor = theme === "dark" ? "hsl(38 80% 40%/0.2)" : "hsl(38 80% 75%/0.5)";
              }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
                style={{
                  background: "linear-gradient(135deg, hsl(38 90% 30%/0.9), hsl(30 80% 26%/0.8))",
                  border: "1px solid hsl(38 80% 50%/0.3)",
                  boxShadow: "0 0 8px hsl(38 100% 50%/0.2)",
                }}>
                <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <span className="flex-1 text-left text-amber-300/90">{t("suggestBtn")}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: "hsl(38 80% 30%/0.5)", color: "#fbbf24" }}>
                {t("newBadge")}
              </span>
            </button>
          </div>

          {/* Feature cards */}
          <div className="pt-2 pb-1">
            <p className="text-[10px] font-semibold text-muted-foreground/40 px-2 mb-2.5 tracking-[0.12em] uppercase">
              {t("featuresLabel")}
            </p>
            <div className="space-y-1.5">
              {([
                { labelKey: "featSummarize"  as const, descKey: "featSummarizeDesc"  as const, color: "#34d399" },
                { labelKey: "featQuestionAI" as const, descKey: "featQuestionAIDesc" as const, color: "#fbbf24" },
                { labelKey: "featMindMap"    as const, descKey: "featMindMapDesc"    as const, color: "#22d3ee" },
                { labelKey: "featQuiz"       as const, descKey: "featQuizDesc"       as const, color: "#a78bfa" },
                { labelKey: "featTTS"        as const, descKey: "featTTSDesc"        as const, color: "#f87171" },
              ] as const).map((f, i) => (
                <div
                  key={f.labelKey}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{
                    background: "var(--feature-card-bg)",
                    border: `1px solid ${f.color}22`,
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateX(0)" : "translateX(-8px)",
                    transition: `opacity 0.4s ease ${0.3 + i * 0.07}s, transform 0.4s ease ${0.3 + i * 0.07}s`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.color, boxShadow: `0 0 4px ${f.color}` }} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-foreground/80 leading-none">{t(f.labelKey)}</p>
                    <p className="text-[9px] text-muted-foreground/50 mt-0.5">{t(f.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* AI Assistant */}
        <div className="relative z-10 shrink-0">
          <AiAssistant />
        </div>

        {/* User footer */}
        <div
          className="relative z-10 shrink-0 px-4 py-3 flex items-center gap-3"
          style={{ borderTop: "1px solid var(--sidebar-divider)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(192 80% 30%), hsl(260 70% 40%))" }}
          >
            AK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground leading-none">{t("analystMode")}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ animation: "pulse-dot 2.5s ease-in-out infinite" }} />
              <span className="text-[10px] text-muted-foreground/50">{t("ready")}</span>
            </div>
          </div>

        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* ── Global top bar ── */}
        <div
          className="shrink-0 h-11 flex items-center justify-end px-5 gap-2"
          style={{ borderBottom: "1px solid var(--sidebar-divider)" }}
        >
          {/* Language pill */}
          <div className="flex items-center gap-1 rounded-full px-1 py-1"
            style={{ background: "hsl(var(--muted)/0.6)", border: "1px solid hsl(var(--border)/0.8)" }}>
            {(["en", "ar"] as const).map(l => (
              <button
                key={l}
                onClick={() => { if (l !== lang) toggleLang(); }}
                className="text-[11px] font-bold px-3 py-0.5 rounded-full transition-all duration-200"
                style={{
                  background: lang === l
                    ? l === "ar"
                      ? "linear-gradient(135deg, hsl(192 70% 30%), hsl(210 70% 35%))"
                      : "linear-gradient(135deg, hsl(260 60% 35%), hsl(280 60% 40%))"
                    : "transparent",
                  color: lang === l ? "#fff" : "hsl(var(--muted-foreground))",
                  boxShadow: lang === l ? "0 1px 6px rgba(0,0,0,0.25)" : "none",
                }}
              >
                {l === "en" ? "English" : "العربية"}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: theme === "dark" ? "hsl(50 80% 20%/0.5)" : "hsl(222 60% 20%/0.12)",
              border: theme === "dark" ? "1px solid hsl(50 80% 50%/0.25)" : "1px solid hsl(222 60% 50%/0.2)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            {theme === "dark"
              ? <Sun  className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
              : <Moon className="w-3.5 h-3.5" style={{ color: "#6366f1" }} />}
          </button>
        </div>

        {children}
      </main>

      <SuggestFeatureDialog open={suggestOpen} onOpenChange={setSuggestOpen} />
    </div>
  );
}
