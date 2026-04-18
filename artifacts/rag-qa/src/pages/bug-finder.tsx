import { useState, useRef } from "react";
import {
  Bug, Play, Wand2, Copy, Check, Trash2, ChevronDown,
  AlertTriangle, AlertCircle, Info, Shield, Zap, Code2,
  CheckCircle2, XCircle, Loader2, Lightbulb,
} from "lucide-react";
import { useLang } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

/* ── types ─────────────────────────────────────────────────── */
interface BugItem {
  id: number;
  line: number | null;
  type: "syntax" | "logic" | "runtime" | "security" | "performance" | "style";
  severity: "info" | "warning" | "error" | "critical";
  description: string;
  suggestion: string;
}

interface AnalysisResult {
  hasBugs: boolean;
  bugCount: number;
  severity: "none" | "low" | "medium" | "high" | "critical";
  bugs: BugItem[];
  fixedCode: string;
  explanation: string;
  codeQuality: "poor" | "fair" | "good" | "excellent";
  language: string;
}

/* ── constants ─────────────────────────────────────────────── */
const LANGUAGES = [
  "Auto Detect", "JavaScript", "TypeScript", "Python", "Java",
  "C", "C++", "C#", "Go", "Rust", "Ruby", "PHP",
  "Swift", "Kotlin", "SQL", "HTML", "CSS", "Bash / Shell",
];

const SEV_META: Record<string, { color: string; bg: string; border: string; icon: typeof AlertCircle }> = {
  critical: { color: "text-red-400",    bg: "bg-red-950/50",    border: "border-red-800/60",    icon: XCircle },
  error:    { color: "text-orange-400", bg: "bg-orange-950/50", border: "border-orange-800/60", icon: AlertCircle },
  warning:  { color: "text-yellow-400", bg: "bg-yellow-950/50", border: "border-yellow-700/60", icon: AlertTriangle },
  info:     { color: "text-blue-400",   bg: "bg-blue-950/50",   border: "border-blue-800/60",   icon: Info },
};

const TYPE_META: Record<string, { color: string; label: string }> = {
  syntax:      { color: "text-violet-400", label: "bugTypeSyntax" },
  logic:       { color: "text-cyan-400",   label: "bugTypeLogic" },
  runtime:     { color: "text-orange-400", label: "bugTypeRuntime" },
  security:    { color: "text-red-400",    label: "bugTypeSecurity" },
  performance: { color: "text-yellow-400", label: "bugTypePerformance" },
  style:       { color: "text-slate-400",  label: "bugTypeStyle" },
};

const QUALITY_META: Record<string, { color: string; bg: string; border: string }> = {
  poor:      { color: "text-red-400",    bg: "bg-red-950/40",    border: "border-red-800/50" },
  fair:      { color: "text-yellow-400", bg: "bg-yellow-950/40", border: "border-yellow-700/50" },
  good:      { color: "text-emerald-400",bg: "bg-emerald-950/40",border: "border-emerald-700/50" },
  excellent: { color: "text-cyan-400",   bg: "bg-cyan-950/40",   border: "border-cyan-700/50" },
};

/* ── Code block ─────────────────────────────────────────────── */
function CodeBlock({ code, label, copyLabel, copiedLabel }: {
  code: string; label: string; copyLabel: string; copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/70 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-slate-400 font-mono">{label}</span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all duration-200"
          style={{
            background: copied ? "hsl(142 60% 20%/0.5)" : "hsl(228 40% 15%/0.8)",
            border: "1px solid",
            borderColor: copied ? "hsl(142 50% 35%/0.4)" : "hsl(228 40% 25%/0.4)",
            color: copied ? "hsl(142 80% 65%)" : "hsl(215 20% 65%)",
          }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre
        className="overflow-auto text-sm font-mono leading-6 p-4"
        style={{ maxHeight: 360, background: "hsl(228 25% 8%)", color: "hsl(215 30% 82%)" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function BugFinder() {
  const { t, lang } = useLang();
  const isRTL = lang === "ar";
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Auto Detect");
  const [langOpen, setLangOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedBug, setExpandedBug] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const analyze = async () => {
    if (!code.trim() || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setExpandedBug(null);
    try {
      const resp = await fetch("/api/bugfinder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Analysis failed");
      }
      const data = await resp.json() as AnalysisResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAnalyzing(false);
    }
  };

  const clear = () => {
    setCode("");
    setResult(null);
    setError(null);
    setExpandedBug(null);
    textareaRef.current?.focus();
  };

  const lineCount = code.split("\n").length;
  const charCount = code.length;

  const sevLabel = (s: string) => {
    const map: Record<string, string> = {
      critical: t("bugSevCritical"),
      error:    t("bugSevError"),
      warning:  t("bugSevWarning"),
      info:     t("bugSevInfo"),
    };
    return map[s] ?? s;
  };
  const typeLabel = (tp: string) => {
    const map: Record<string, string> = {
      syntax:      t("bugTypeSyntax"),
      logic:       t("bugTypeLogic"),
      runtime:     t("bugTypeRuntime"),
      security:    t("bugTypeSecurity"),
      performance: t("bugTypePerformance"),
      style:       t("bugTypeStyle"),
    };
    return map[tp] ?? tp;
  };
  const qualityLabel = (q: string) => {
    const map: Record<string, string> = {
      poor:      t("bugQualityPoor"),
      fair:      t("bugQualityFair"),
      good:      t("bugQualityGood"),
      excellent: t("bugQualityExcellent"),
    };
    return map[q] ?? q;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* ── Page header ── */}
      <div className="shrink-0 px-8 pt-8 pb-4">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(22 90% 35%), hsl(0 80% 40%))",
              boxShadow: "0 0 20px hsl(22 90% 50%/0.35)",
            }}
          >
            <Bug className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ direction: isRTL ? "rtl" : "ltr" }}
            >
              {t("bugTitle")}
            </h1>
            <p
              className="text-sm text-muted-foreground mt-0.5"
              style={{ direction: isRTL ? "rtl" : "ltr" }}
            >
              {t("bugDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main 2-col layout ── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 px-8 pb-8 pt-2 min-h-0">

        {/* ─── LEFT: input panel ─── */}
        <div className="flex flex-col gap-4">

          {/* Language selector + code stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all"
                style={{
                  background: "hsl(228 40% 12%/0.8)",
                  border: "1px solid hsl(228 40% 25%/0.5)",
                  color: "hsl(215 20% 75%)",
                }}
              >
                <Code2 className="w-3.5 h-3.5 text-orange-400" />
                <span>{language}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", langOpen && "rotate-180")} />
              </button>
              {langOpen && (
                <div
                  className="absolute top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl"
                  style={{
                    [isRTL ? "right" : "left"]: 0,
                    minWidth: 180,
                    background: "hsl(228 30% 10%)",
                    border: "1px solid hsl(228 30% 22%)",
                  }}
                >
                  {LANGUAGES.map(lng => (
                    <button
                      key={lng}
                      onClick={() => { setLanguage(lng); setLangOpen(false); }}
                      className="w-full text-start px-4 py-2 text-sm transition-colors hover:bg-white/5"
                      style={{
                        color: lng === language ? "hsl(22 90% 65%)" : "hsl(215 20% 70%)",
                        fontWeight: lng === language ? 600 : 400,
                      }}
                    >
                      {lng === "Auto Detect" ? t("bugLangAuto") : lng}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-xs text-muted-foreground/50">
              {lineCount} {isRTL ? "سطر" : "lines"} · {charCount} {isRTL ? "حرف" : "chars"}
            </span>

            {code && (
              <button
                onClick={clear}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground/60 hover:text-red-400 transition-colors"
                style={{ border: "1px solid hsl(228 30% 20%/0.6)" }}
              >
                <Trash2 className="w-3 h-3" />
                {t("bugClearBtn")}
              </button>
            )}
          </div>

          {/* Code textarea */}
          <div
            className="relative flex-1 rounded-xl overflow-hidden"
            style={{
              background: "hsl(228 25% 7%)",
              border: "1px solid hsl(228 30% 20%/0.8)",
              boxShadow: "inset 0 2px 12px hsl(0 0% 0%/0.3)",
              minHeight: 340,
            }}
          >
            {/* line numbers gutter */}
            <div
              className="absolute top-0 bottom-0 flex flex-col pt-4 pb-4 text-right select-none pointer-events-none overflow-hidden"
              style={{
                [isRTL ? "right" : "left"]: 0,
                width: 44,
                paddingInlineEnd: 8,
                color: "hsl(228 20% 35%)",
                fontSize: 12,
                fontFamily: "monospace",
                lineHeight: "24px",
                borderInlineEnd: "1px solid hsl(228 30% 18%)",
                background: "hsl(228 25% 6%)",
              }}
            >
              {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={t("bugCodePlaceholder")}
              spellCheck={false}
              className="absolute inset-0 resize-none bg-transparent font-mono text-sm focus:outline-none"
              style={{
                paddingTop: 16, paddingBottom: 16,
                paddingInlineStart: 56, paddingInlineEnd: 16,
                color: "hsl(215 30% 82%)",
                caretColor: "hsl(22 90% 65%)",
                lineHeight: "24px",
                direction: "ltr",
              }}
            />
          </div>

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={!code.trim() || analyzing}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: code.trim() && !analyzing
                ? "linear-gradient(135deg, hsl(22 80% 40%), hsl(0 75% 45%))"
                : "hsl(228 30% 15%)",
              boxShadow: code.trim() && !analyzing ? "0 0 24px hsl(22 90% 50%/0.3)" : "none",
              color: "white",
              border: "1px solid",
              borderColor: code.trim() && !analyzing ? "hsl(22 80% 55%/0.3)" : "hsl(228 30% 22%)",
            }}
          >
            {analyzing
              ? <><Loader2 className="w-4 h-4 animate-spin" />{t("bugAnalyzing")}</>
              : <><Play  className="w-4 h-4" />{t("bugAnalyzeBtn")}</>}
          </button>
        </div>

        {/* ─── RIGHT: results panel ─── */}
        <div className="flex flex-col gap-4">

          {/* Placeholder when no result */}
          {!result && !error && !analyzing && (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-4 rounded-xl"
              style={{
                minHeight: 340,
                background: "hsl(228 25% 7%/0.5)",
                border: "1px dashed hsl(228 30% 22%/0.8)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(22 80% 30%/0.15)", border: "1px solid hsl(22 70% 35%/0.2)" }}
              >
                <Bug className="w-8 h-8 text-orange-500/50" />
              </div>
              <div className="text-center px-8">
                <p className="text-sm font-medium text-muted-foreground/70">
                  {isRTL ? "اكتب أو الصق الكود ثم اضغط تحليل" : "Paste your code and click Analyze"}
                </p>
                <p className="text-xs text-muted-foreground/40 mt-1">
                  {isRTL ? "يدعم أكثر من 15 لغة برمجية" : "Supports 15+ programming languages"}
                </p>
              </div>
            </div>
          )}

          {/* Analyzing spinner */}
          {analyzing && (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-4 rounded-xl"
              style={{
                minHeight: 340,
                background: "hsl(228 25% 7%/0.5)",
                border: "1px solid hsl(228 30% 22%/0.6)",
              }}
            >
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(22 80% 30%/0.2)", border: "2px solid hsl(22 80% 45%/0.4)" }}
                >
                  <Bug className="w-7 h-7 text-orange-400" />
                </div>
                <Loader2
                  className="absolute -inset-1 w-18 h-18 animate-spin text-orange-500/40"
                  style={{ width: 72, height: 72, top: -4, left: -4 }}
                />
              </div>
              <p className="text-sm text-muted-foreground/70 animate-pulse">{t("bugAnalyzing")}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="p-4 rounded-xl flex items-start gap-3"
              style={{
                background: "hsl(0 50% 15%/0.4)",
                border: "1px solid hsl(0 50% 30%/0.4)",
              }}
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="flex flex-col gap-4">

              {/* ── Stats bar ── */}
              <div
                className="grid grid-cols-3 gap-3 p-4 rounded-xl"
                style={{
                  background: "hsl(228 25% 9%/0.7)",
                  border: "1px solid hsl(228 30% 20%/0.6)",
                }}
              >
                {/* Bug count */}
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{
                    color: result.bugCount === 0 ? "hsl(142 70% 55%)" : "hsl(22 90% 65%)"
                  }}>
                    {result.bugCount}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {result.bugCount === 1 ? t("bugFound") : t("bugFoundPlural")}
                  </p>
                </div>

                {/* Code quality */}
                <div className="text-center">
                  {result.codeQuality && (
                    <>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: QUALITY_META[result.codeQuality]?.bg,
                          border: `1px solid`,
                          borderColor: QUALITY_META[result.codeQuality]?.border?.replace("border-", "") || "transparent",
                          color: QUALITY_META[result.codeQuality]?.color?.replace("text-", "hsl(") || "inherit",
                        }}
                      >
                        {qualityLabel(result.codeQuality)}
                      </span>
                      <p className="text-xs text-muted-foreground/60 mt-1">{t("bugQuality")}</p>
                    </>
                  )}
                </div>

                {/* Detected language */}
                <div className="text-center">
                  <p className="text-sm font-semibold text-cyan-400 truncate">{result.language}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{t("bugDetected")}</p>
                </div>
              </div>

              {/* ── No bugs ── */}
              {!result.hasBugs && (
                <div
                  className="p-5 rounded-xl flex items-center gap-4"
                  style={{
                    background: "hsl(142 50% 10%/0.5)",
                    border: "1px solid hsl(142 50% 25%/0.4)",
                  }}
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-400">{t("bugNoBugs")}</p>
                    <p className="text-sm text-muted-foreground/70 mt-0.5">{t("bugNoBugsDesc")}</p>
                  </div>
                </div>
              )}

              {/* ── Bug list ── */}
              {result.bugs.length > 0 && (
                <div className="flex flex-col gap-2">
                  {result.bugs.map(bug => {
                    const sev = SEV_META[bug.severity] ?? SEV_META.info;
                    const SevIcon = sev.icon;
                    const typMeta = TYPE_META[bug.type];
                    const isOpen = expandedBug === bug.id;
                    return (
                      <div
                        key={bug.id}
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid`, borderColor: sev.border.replace("border-", "") || "hsl(228 30% 22%)" }}
                      >
                        <button
                          className="w-full flex items-start gap-3 p-3.5 text-start transition-colors hover:bg-white/3"
                          style={{ background: sev.bg }}
                          onClick={() => setExpandedBug(isOpen ? null : bug.id)}
                        >
                          <SevIcon className={cn("w-4 h-4 shrink-0 mt-0.5", sev.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("text-xs font-semibold uppercase tracking-wide", sev.color)}>
                                {sevLabel(bug.severity)}
                              </span>
                              <span className={cn("text-xs font-medium", typMeta?.color ?? "text-slate-400")}>
                                {typeLabel(bug.type)}
                              </span>
                              {bug.line && (
                                <span className="text-xs text-muted-foreground/50 font-mono">
                                  {t("bugColLine")} {bug.line}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground/85 mt-0.5 leading-snug">{bug.description}</p>
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5 transition-transform", isOpen && "rotate-180")} />
                        </button>

                        {isOpen && (
                          <div
                            className="px-4 pb-4 pt-2"
                            style={{ borderTop: `1px solid`, borderColor: sev.border.replace("border-", "") || "hsl(228 30% 22%)" }}
                          >
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                              <p className="text-sm text-muted-foreground/80 leading-relaxed">{bug.suggestion}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Explanation ── */}
              {result.explanation && (
                <div
                  className="p-4 rounded-xl flex items-start gap-3"
                  style={{
                    background: "hsl(260 40% 12%/0.4)",
                    border: "1px solid hsl(260 40% 25%/0.4)",
                  }}
                >
                  <Wand2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-violet-400 mb-1">{t("bugExplanation")}</p>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed">{result.explanation}</p>
                  </div>
                </div>
              )}

              {/* ── Fixed code ── */}
              {result.hasBugs && result.fixedCode && (
                <CodeBlock
                  code={result.fixedCode}
                  label={t("bugFixed")}
                  copyLabel={t("bugFixedCopy")}
                  copiedLabel={t("bugCopied")}
                />
              )}

            </div>
          )}
        </div>
      </div>

      {/* close lang dropdown on outside click */}
      {langOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
      )}
    </div>
  );
}
