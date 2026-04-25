import { useState } from "react";
import {
  ShieldAlert, ShieldCheck, ShieldX, AlertTriangle,
  Loader2, Trash2, CheckCircle, XCircle, Info,
  TriangleAlert, Lightbulb, Search, Link, ScanLine,
} from "lucide-react";
import { useLang } from "@/contexts/language-context";

/* ── types ─────────────────────────────────────────────────── */
interface ScamResult {
  verdict: "scam" | "suspicious" | "safe";
  confidence: "high" | "medium" | "low";
  riskScore: number;
  scamType: string | null;
  explanation: string;
  redFlags: string[];
  safeIndicators: string[];
  recommendation: string;
}

interface VtResult {
  url: string;
  malicious: number;
  suspicious: number;
  undetected: number;
  harmless: number;
  total: number;
  scanDate?: number | null;
  cached?: boolean;
  status?: string;
  notConfigured?: boolean;
  error?: string;
}

/* ── URL extractor ──────────────────────────────────────────── */
function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s<>"'\]]+/gi;
  const found = text.match(re) ?? [];
  return [...new Set(found.map(u => u.replace(/[.,;)]+$/, "")))];
}

/* ── Risk gauge ─────────────────────────────────────────────── */
function RiskGauge({ score }: { score: number }) {
  const clamp = Math.max(0, Math.min(100, score));
  const color = clamp >= 70 ? "hsl(0 75% 55%)" : clamp >= 35 ? "hsl(35 90% 55%)" : "hsl(142 65% 48%)";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground/60">
        <span>0</span><span>50</span><span>100</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden"
        style={{ background: "hsl(228 30% 14%)", border: "1px solid hsl(228 30% 20%)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clamp}%`, background: `linear-gradient(90deg, hsl(142 60% 45%), ${color})`, boxShadow: `0 0 12px ${color}60` }} />
      </div>
      <div className="text-right">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{clamp}</span>
        <span className="text-xs text-muted-foreground/50 ml-1">/100</span>
      </div>
    </div>
  );
}

/* ── VirusTotal URL panel ──────────────────────────────────── */
function VtPanel({ urls, isRTL }: { urls: string[]; isRTL: boolean }) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults]   = useState<VtResult[]>([]);
  const [done, setDone]         = useState(false);

  const scan = async () => {
    setScanning(true);
    setDone(false);
    const out: VtResult[] = [];
    for (const url of urls) {
      try {
        const r = await fetch("/api/virustotal-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        out.push(await r.json() as VtResult);
      } catch {
        out.push({ url, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, total: 0, error: "Network error" });
      }
    }
    setResults(out);
    setScanning(false);
    setDone(true);
  };

  if (urls.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "hsl(228 25% 9%/0.6)", border: "1px solid hsl(228 30% 22%/0.6)" }}>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "hsl(228 30% 18%/0.6)" }}>
        <div className="flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-blue-400">
            {isRTL ? `فحص الروابط عبر VirusTotal (${urls.length})` : `VirusTotal URL Scan — ${urls.length} link${urls.length > 1 ? "s" : ""} detected`}
          </span>
        </div>
        {!done && (
          <button
            onClick={scan}
            disabled={scanning}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50"
            style={{
              background: scanning ? "hsl(228 30% 14%)" : "linear-gradient(135deg, hsl(210 80% 40%), hsl(240 60% 45%))",
              color: "white",
              border: "1px solid hsl(220 50% 35%/0.4)",
            }}
          >
            {scanning ? <><Loader2 className="w-3 h-3 animate-spin" />{isRTL ? "يفحص…" : "Scanning…"}</> : <><ScanLine className="w-3 h-3" />{isRTL ? "فحص الآن" : "Scan now"}</>}
          </button>
        )}
      </div>

      {/* URL list preview */}
      <div className="px-4 py-3 flex flex-col gap-1.5">
        {urls.map((url, i) => {
          const r = results[i];
          return (
            <div key={url} className="flex items-start gap-2.5">
              <Link className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground/60 break-all flex-1 leading-snug">{url}</span>
              {r && !r.notConfigured && !r.error && (
                <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: r.malicious > 0 ? "hsl(0 55% 18%/0.7)" : r.suspicious > 0 ? "hsl(38 55% 16%/0.7)" : "hsl(142 45% 12%/0.7)",
                    color:      r.malicious > 0 ? "hsl(0 75% 65%)" : r.suspicious > 0 ? "hsl(38 90% 62%)" : "hsl(142 65% 55%)",
                    border:     `1px solid ${r.malicious > 0 ? "hsl(0 55% 28%/0.5)" : r.suspicious > 0 ? "hsl(38 60% 28%/0.5)" : "hsl(142 50% 25%/0.5)"}`,
                  }}>
                  {r.malicious > 0
                    ? `${r.malicious} malicious`
                    : r.suspicious > 0
                    ? `${r.suspicious} suspicious`
                    : `Clean`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Results detail */}
      {done && results.length > 0 && (
        <div className="border-t px-4 pt-3 pb-4 flex flex-col gap-3" style={{ borderColor: "hsl(228 30% 18%/0.6)" }}>
          {results[0]?.notConfigured ? (
            <div className="flex items-start gap-2.5 text-xs text-amber-400/80">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                {isRTL
                  ? "لم يتم تكوين VIRUSTOTAL_API_KEY. أضف مفتاح API المجاني من virustotal.com لتفعيل الفحص."
                  : "VIRUSTOTAL_API_KEY is not configured. Add a free API key from virustotal.com to enable scanning."}
              </p>
            </div>
          ) : (
            results.map((r, i) => (
              <div key={i} className="rounded-lg p-3 flex flex-col gap-2"
                style={{
                  background: r.malicious > 0 ? "hsl(0 45% 9%/0.5)" : r.suspicious > 0 ? "hsl(38 45% 8%/0.5)" : "hsl(142 35% 7%/0.5)",
                  border: `1px solid ${r.malicious > 0 ? "hsl(0 45% 22%/0.4)" : r.suspicious > 0 ? "hsl(38 50% 22%/0.4)" : "hsl(142 40% 18%/0.4)"}`,
                }}>
                {r.error ? (
                  <p className="text-xs text-red-400/70">{r.error}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: isRTL ? "خطير" : "Malicious", value: r.malicious, color: "hsl(0 70% 60%)" },
                        { label: isRTL ? "مشبوه" : "Suspicious", value: r.suspicious, color: "hsl(38 85% 58%)" },
                        { label: isRTL ? "غير ضار" : "Harmless", value: r.harmless, color: "hsl(142 60% 50%)" },
                        { label: isRTL ? "المحركات" : "Engines", value: r.total, color: "hsl(215 20% 55%)" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex flex-col items-center px-3 py-1.5 rounded-lg"
                          style={{ background: "hsl(228 30% 12%/0.5)", border: "1px solid hsl(228 30% 20%/0.3)" }}>
                          <span className="text-base font-bold tabular-nums" style={{ color }}>{value}</span>
                          <span className="text-[10px] text-muted-foreground/50">{label}</span>
                        </div>
                      ))}
                    </div>
                    {r.cached && (
                      <p className="text-[10px] text-muted-foreground/35">
                        {isRTL ? "نتيجة من الذاكرة المؤقتة لـ VirusTotal" : "Cached VirusTotal result"}
                        {r.scanDate ? ` · ${new Date(r.scanDate * 1000).toLocaleDateString()}` : ""}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function ScamChecker() {
  const { t, lang } = useLang();
  const isRTL = lang === "ar";

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<ScamResult | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const urls = extractUrls(message);

  const check = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch("/api/scam-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Analysis failed");
      }
      setResult(await resp.json() as ScamResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setMessage(""); setResult(null); setError(null); };

  const verdictMeta = {
    scam: { label: t("scamVerdictScam"), icon: ShieldX, color: "hsl(0 75% 60%)", bg: "hsl(0 50% 10%/0.7)", border: "hsl(0 55% 30%/0.5)", glow: "hsl(0 75% 50%/0.2)", badgeBg: "hsl(0 65% 18%/0.8)", badgeBorder: "hsl(0 60% 35%/0.5)" },
    suspicious: { label: t("scamVerdictSuspicious"), icon: TriangleAlert, color: "hsl(35 90% 60%)", bg: "hsl(35 60% 9%/0.7)", border: "hsl(35 65% 28%/0.5)", glow: "hsl(35 90% 50%/0.2)", badgeBg: "hsl(35 70% 16%/0.8)", badgeBorder: "hsl(35 70% 32%/0.5)" },
    safe: { label: t("scamVerdictSafe"), icon: ShieldCheck, color: "hsl(142 65% 50%)", bg: "hsl(142 40% 8%/0.7)", border: "hsl(142 50% 28%/0.5)", glow: "hsl(142 65% 45%/0.2)", badgeBg: "hsl(142 50% 13%/0.8)", badgeBorder: "hsl(142 55% 28%/0.5)" },
  };

  const confLabel = (c: string) => c === "high" ? t("scamConfHigh") : c === "medium" ? t("scamConfMedium") : t("scamConfLow");

  const scamTypeLabel = (type: string | null) => {
    const map: Record<string, string> = {
      phishing: t("scamTypePhishing"), lottery: t("scamTypeLottery"),
      romance: t("scamTypeRomance"), advance_fee: t("scamTypeAdvanceFee"),
      impersonation: t("scamTypeImpersonation"), investment: t("scamTypeInvestment"),
      tech_support: t("scamTypeTechSupport"), job_offer: t("scamTypeJobOffer"),
      charity: t("scamTypeCharity"), other: t("scamTypeOther"),
    };
    return type ? (map[type] ?? type) : null;
  };

  const meta = result ? verdictMeta[result.verdict] : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* ── Page header ── */}
      <div className="shrink-0 px-8 pt-8 pb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(35 85% 40%), hsl(0 75% 45%))", boxShadow: "0 0 24px hsl(20 90% 50%/0.35)" }}>
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ direction: isRTL ? "rtl" : "ltr" }}>{t("scamTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5" style={{ direction: isRTL ? "rtl" : "ltr" }}>{t("scamDesc")}</p>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 px-8 pb-8 pt-0 min-h-0">

        {/* ─── LEFT: input ─── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground" style={{ direction: isRTL ? "rtl" : "ltr" }}>{t("scamLabel")}</label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground/40">{message.length} {isRTL ? "حرف" : "chars"}</span>
              {message && (
                <button onClick={clear} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground/50 hover:text-red-400 transition-colors"
                  style={{ border: "1px solid hsl(228 30% 20%/0.6)" }}>
                  <Trash2 className="w-3 h-3" />{t("scamClearBtn")}
                </button>
              )}
            </div>
          </div>

          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t("scamPlaceholder")}
            className="flex-1 resize-none rounded-xl text-sm focus:outline-none leading-relaxed font-mono"
            style={{
              minHeight: 220,
              padding: "16px",
              background: "hsl(228 25% 7%)",
              border: `2px solid ${message ? "hsl(35 60% 35%/0.5)" : "hsl(228 30% 20%/0.7)"}`,
              color: "hsl(215 20% 80%)",
              caretColor: "hsl(35 90% 60%)",
              direction: "ltr",
            }}
          />

          {/* VirusTotal panel (shown when URLs are detected) */}
          <VtPanel urls={urls} isRTL={isRTL} />

          <p className="text-xs text-muted-foreground/35 text-center">{t("scamPlaceholderHint")}</p>

          <button
            onClick={check}
            disabled={!message.trim() || loading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: message.trim() && !loading ? "linear-gradient(135deg, hsl(35 80% 38%), hsl(0 72% 42%))" : "hsl(228 30% 14%)",
              boxShadow: message.trim() && !loading ? "0 0 28px hsl(20 90% 50%/0.25)" : "none",
              color: "white",
              border: "1px solid",
              borderColor: message.trim() && !loading ? "hsl(35 70% 50%/0.3)" : "hsl(228 30% 22%)",
            }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("scamChecking")}</> : <><Search className="w-4 h-4" />{t("scamCheckBtn")}</>}
          </button>
        </div>

        {/* ─── RIGHT: results ─── */}
        <div className="flex flex-col gap-4">

          {!result && !error && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 rounded-xl"
              style={{ minHeight: 300, background: "hsl(228 25% 7%/0.4)", border: "1px dashed hsl(228 30% 22%/0.7)" }}>
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: "hsl(35 60% 20%/0.15)", border: "1px solid hsl(35 55% 30%/0.2)" }}>
                <ShieldAlert className="w-10 h-10 text-amber-500/40" />
              </div>
              <div className="text-center px-8">
                <p className="text-sm font-medium text-muted-foreground/60">
                  {isRTL ? "الصق رسالة مشبوهة وانقر فحص" : "Paste a suspicious message and click Check"}
                </p>
                <p className="text-xs text-muted-foreground/35 mt-1">
                  {isRTL ? "يحلل AI النص ويكشف الأنماط الاحتيالية" : "AI analyzes the text for fraud patterns"}
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 rounded-xl"
              style={{ minHeight: 300, background: "hsl(228 25% 7%/0.5)", border: "1px solid hsl(228 30% 22%/0.5)" }}>
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: "hsl(35 60% 18%/0.3)", border: "2px solid hsl(35 65% 35%/0.4)" }}>
                  <ShieldAlert className="w-9 h-9 text-amber-400" />
                </div>
                <Loader2 className="absolute animate-spin text-amber-500/40" style={{ width: 84, height: 84, top: -6, left: -6 }} />
              </div>
              <p className="text-sm text-muted-foreground/60 animate-pulse">{t("scamChecking")}</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl flex items-start gap-3"
              style={{ background: "hsl(0 50% 14%/0.4)", border: "1px solid hsl(0 50% 28%/0.4)" }}>
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {result && meta && (() => {
            const VerdictIcon = meta.icon;
            return (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl p-5"
                  style={{ background: meta.bg, border: `1px solid ${meta.border}`, boxShadow: `0 0 32px ${meta.glow}` }}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
                      style={{ background: meta.badgeBg, border: `1px solid ${meta.badgeBorder}`, boxShadow: `0 0 16px ${meta.glow}` }}>
                      <VerdictIcon className="w-7 h-7" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-bold" style={{ color: meta.color }}>{meta.label}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: meta.color, background: meta.badgeBg, border: `1px solid ${meta.badgeBorder}` }}>
                          {confLabel(result.confidence)}
                        </span>
                        {result.scamType && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ color: "hsl(35 90% 65%)", background: "hsl(35 60% 14%/0.7)", border: "1px solid hsl(35 60% 28%/0.5)" }}>
                            {scamTypeLabel(result.scamType)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">{t("scamRiskScore")}</p>
                    <RiskGauge score={result.riskScore} />
                  </div>
                </div>

                <div className="p-4 rounded-xl flex items-start gap-3"
                  style={{ background: "hsl(228 25% 9%/0.6)", border: "1px solid hsl(228 30% 22%/0.6)" }}>
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-400 mb-1">{t("scamExplanation")}</p>
                    <p className="text-sm text-muted-foreground/85 leading-relaxed">{result.explanation}</p>
                  </div>
                </div>

                {result.redFlags.length > 0 && (
                  <div className="p-4 rounded-xl"
                    style={{ background: "hsl(0 45% 9%/0.5)", border: "1px solid hsl(0 45% 24%/0.4)" }}>
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />{t("scamRedFlags")}
                    </p>
                    <div className="flex flex-col gap-2">
                      {result.redFlags.map((flag, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-300/85 leading-snug">{flag}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.safeIndicators.length > 0 && (
                  <div className="p-4 rounded-xl"
                    style={{ background: "hsl(142 35% 8%/0.5)", border: "1px solid hsl(142 40% 22%/0.4)" }}>
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />{t("scamSafeIndicators")}
                    </p>
                    <div className="flex flex-col gap-2">
                      {result.safeIndicators.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-emerald-300/80 leading-snug">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.recommendation && (
                  <div className="p-4 rounded-xl flex items-start gap-3"
                    style={{ background: "hsl(260 40% 10%/0.5)", border: "1px solid hsl(260 40% 24%/0.4)" }}>
                    <Lightbulb className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-violet-400 mb-1">{t("scamRecommendation")}</p>
                      <p className="text-sm text-muted-foreground/80 leading-relaxed">{result.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
