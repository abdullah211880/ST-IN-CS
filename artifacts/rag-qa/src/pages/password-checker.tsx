import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, ShieldCheck, ShieldX, ShieldAlert, RefreshCw, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useLang } from "@/contexts/language-context";

/* ── HIBP k-anonymity check ───────────────────────────────── */
async function sha1Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function hibpBreachCount(password: string): Promise<number> {
  if (!password) return 0;
  const hash   = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });
  if (!res.ok) throw new Error("HIBP request failed");
  const lines = (await res.text()).split("\n");
  for (const line of lines) {
    const [h, c] = line.trim().split(":");
    if (h === suffix) return parseInt(c ?? "0", 10);
  }
  return 0;
}

/* ── strength logic ─────────────────────────────────────────── */
interface Rule { key: string; labelKey: string; whyKey: string; test: (p: string) => boolean; }

const RULES: Rule[] = [
  { key: "length",  labelKey: "pwRuleLength",  whyKey: "pwWhyLength",  test: p => p.length >= 8 },
  { key: "upper",   labelKey: "pwRuleUpper",   whyKey: "pwWhyUpper",   test: p => /[A-Z]/.test(p) },
  { key: "lower",   labelKey: "pwRuleLower",   whyKey: "pwWhyLower",   test: p => /[a-z]/.test(p) },
  { key: "number",  labelKey: "pwRuleNumber",  whyKey: "pwWhyNumber",  test: p => /[0-9]/.test(p) },
  { key: "special", labelKey: "pwRuleSpecial", whyKey: "pwWhySpecial", test: p => /[^A-Za-z0-9]/.test(p) },
];

function evaluate(password: string) {
  const results = RULES.map(r => ({ ...r, passed: r.test(password) }));
  const passedCount = results.filter(r => r.passed).length;
  return { results, passedCount, isStrong: passedCount === RULES.length };
}

function generatePassword(len = 16) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums  = "23456789";
  const special = "!@#$%^&*_-+=?";
  const all = upper + lower + nums + special;
  let pw = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = pw.length; i < len; i++) pw.push(all[Math.floor(Math.random() * all.length)]);
  return pw.sort(() => Math.random() - 0.5).join("");
}

function StrengthBar({ passedCount }: { passedCount: number }) {
  const colors = ["hsl(0 75% 50%)","hsl(20 90% 50%)","hsl(38 90% 50%)","hsl(80 70% 45%)","hsl(142 65% 45%)"];
  const activeColor = passedCount > 0 ? colors[passedCount - 1] : "transparent";
  return (
    <div className="flex gap-1.5 mt-3">
      {RULES.map((_, i) => (
        <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-500"
          style={{ background: i < passedCount ? activeColor : "hsl(228 30% 18%)" }} />
      ))}
    </div>
  );
}

/* ── HIBP breach banner ──────────────────────────────────────── */
type HibpState = "idle" | "loading" | "clean" | "breached" | "error";

function BreachBanner({ state, count, isRTL }: { state: HibpState; count: number; isRTL: boolean }) {
  if (state === "idle") return null;

  if (state === "loading") return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs text-muted-foreground/60"
      style={{ background: "hsl(228 25% 9%/0.5)", border: "1px solid hsl(228 30% 20%/0.4)" }}>
      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      <span>{isRTL ? "يتحقق من قواعد بيانات الاختراق…" : "Checking breach databases…"}</span>
    </div>
  );

  if (state === "error") return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs text-amber-400/70"
      style={{ background: "hsl(38 40% 9%/0.4)", border: "1px solid hsl(38 50% 25%/0.3)" }}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>{isRTL ? "تعذّر الاتصال بخدمة HIBP" : "Could not reach breach database — check your connection"}</span>
    </div>
  );

  if (state === "clean") return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{ background: "hsl(142 35% 8%/0.5)", border: "1px solid hsl(142 45% 22%/0.4)" }}>
      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-emerald-400">
          {isRTL ? "لم يُعثر على تسريب" : "Not found in any breach"}
        </p>
        <p className="text-xs text-emerald-400/60 mt-0.5">
          {isRTL
            ? "كلمة المرور هذه لم تظهر في أي قاعدة بيانات مُسرَّبة معروفة لدى Have I Been Pwned."
            : "This password has never appeared in any known data breach tracked by Have I Been Pwned."}
        </p>
      </div>
    </div>
  );

  const fmtCount = count.toLocaleString();
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{ background: "hsl(0 45% 9%/0.6)", border: "1px solid hsl(0 55% 28%/0.5)" }}>
      <ShieldX className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-red-400">
          {isRTL ? `ظهرت ${fmtCount} مرة في تسريبات البيانات` : `Exposed ${fmtCount}× in data breaches`}
        </p>
        <p className="text-xs text-red-400/60 mt-0.5">
          {isRTL
            ? "وجِدت هذه الكلمة في قواعد بيانات مُسرَّبة — لا تستخدمها أبداً."
            : "This exact password appeared in leaked credential databases. Do not use it."}
        </p>
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────── */
export default function PasswordChecker() {
  const { t, lang } = useLang();
  const isRTL = lang === "ar";

  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [copied, setCopied]     = useState(false);

  const [hibpState, setHibpState]   = useState<HibpState>("idle");
  const [hibpCount, setHibpCount]   = useState(0);
  const hibpTimer = useRef<ReturnType<typeof setTimeout>>();

  const { results, passedCount, isStrong } = evaluate(password);
  const hasInput = password.length > 0;
  const failedRules = results.filter(r => !r.passed);

  /* Debounced HIBP check on password change */
  useEffect(() => {
    clearTimeout(hibpTimer.current);
    if (!password) { setHibpState("idle"); setHibpCount(0); return; }
    setHibpState("loading");
    hibpTimer.current = setTimeout(async () => {
      try {
        const count = await hibpBreachCount(password);
        setHibpCount(count);
        setHibpState(count > 0 ? "breached" : "clean");
      } catch {
        setHibpState("error");
      }
    }, 700);
    return () => clearTimeout(hibpTimer.current);
  }, [password]);

  const generate = () => { setPassword(generatePassword()); setShow(true); };

  const copy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const borderColor = !hasInput ? "hsl(228 30% 22%)"
    : isStrong ? "hsl(142 60% 40%/0.7)"
    : passedCount >= 3 ? "hsl(38 80% 45%/0.7)"
    : "hsl(0 65% 45%/0.7)";

  const strengthLabel = !hasInput ? ""
    : isStrong ? t("pwStrong")
    : passedCount >= 3 ? t("pwModerate")
    : t("pwWeak");

  const strengthColor = !hasInput ? ""
    : isStrong ? "hsl(142 65% 55%)"
    : passedCount >= 3 ? "hsl(38 90% 60%)"
    : "hsl(0 75% 60%)";

  return (
    <div className="flex-1 flex flex-col items-center justify-start min-h-0 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-lg flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, hsl(260 70% 40%), hsl(280 65% 50%))", boxShadow: "0 0 28px hsl(270 80% 55%/0.35)" }}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("pwTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{t("pwDesc")}</p>
        </div>

        {/* ── Password input card ── */}
        <div className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: "hsl(228 25% 9%/0.8)", border: "1px solid hsl(228 30% 20%/0.6)" }}>
          <label className="text-sm font-medium text-muted-foreground" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            {t("pwLabel")}
          </label>

          <div className="flex items-center gap-2 rounded-xl px-4 py-3 transition-all duration-300"
            style={{
              background: "hsl(228 30% 7%)",
              border: `2px solid ${borderColor}`,
              boxShadow: hasInput ? `0 0 20px ${borderColor.replace("0.7)", "0.15)")}` : "none",
            }}>
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t("pwPlaceholder")}
              className="flex-1 bg-transparent text-sm font-mono focus:outline-none text-foreground placeholder:text-muted-foreground/40"
              style={{ direction: "ltr", letterSpacing: show ? "normal" : password ? "0.15em" : "normal" }}
              autoComplete="new-password"
            />
            <div className="flex items-center gap-1">
              <button onClick={() => setShow(s => !s)}
                className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-muted-foreground/50 hover:text-muted-foreground"
                title={show ? t("pwHide") : t("pwShow")}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={copy} disabled={!password}
                className="p-1.5 rounded-lg hover:bg-white/8 transition-colors disabled:opacity-30"
                style={{ color: copied ? "hsl(142 65% 55%)" : "hsl(215 20% 55%)" }}
                title={t("pwCopy")}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={generate}
                className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-muted-foreground/50 hover:text-violet-400"
                title={t("pwGenerate")}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <StrengthBar passedCount={passedCount} />

          {hasInput && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  color: strengthColor,
                  background: `${strengthColor.replace(")", "/0.12)")}`,
                  border: `1px solid ${strengthColor.replace(")", "/0.25)")}`,
                }}>
                {strengthLabel}
              </span>
              <span className="text-xs text-muted-foreground/50">
                {passedCount}/{RULES.length} {isRTL ? "معيار" : "criteria"}
              </span>
            </div>
          )}
        </div>

        {/* ── HIBP Breach Check ── */}
        <BreachBanner state={hibpState} count={hibpCount} isRTL={isRTL} />

        {/* ── Result card ── */}
        {hasInput && (
          <>
            {isStrong ? (
              <div className="rounded-2xl p-6 flex items-start gap-4"
                style={{ background: "hsl(142 40% 8%/0.6)", border: "1px solid hsl(142 50% 28%/0.5)" }}>
                <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: "hsl(142 60% 15%/0.7)", border: "1px solid hsl(142 55% 30%/0.4)", boxShadow: "0 0 16px hsl(142 70% 45%/0.2)" }}>
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-emerald-400 text-lg">{t("pwStrongTitle")}</p>
                  <p className="text-sm text-emerald-400/70 mt-0.5">{t("pwStrongDesc")}</p>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {RULES.map(r => (
                      <div key={r.key} className="flex items-center gap-2 text-xs text-emerald-400/80">
                        <span className="text-emerald-500">✓</span>
                        {t(r.labelKey as any)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  background: passedCount >= 3 ? "hsl(38 50% 8%/0.6)" : "hsl(0 50% 8%/0.6)",
                  border: passedCount >= 3 ? "1px solid hsl(38 60% 30%/0.5)" : "1px solid hsl(0 55% 30%/0.5)",
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                    style={{
                      background: passedCount >= 3 ? "hsl(38 60% 15%/0.7)" : "hsl(0 55% 12%/0.7)",
                      border: passedCount >= 3 ? "1px solid hsl(38 60% 30%/0.4)" : "1px solid hsl(0 55% 28%/0.4)",
                    }}>
                    {passedCount >= 3
                      ? <ShieldAlert className="w-6 h-6 text-amber-400" />
                      : <ShieldX className="w-6 h-6 text-red-400" />}
                  </div>
                  <div>
                    <p className="font-bold text-lg" style={{ color: passedCount >= 3 ? "hsl(38 90% 65%)" : "hsl(0 75% 65%)" }}>
                      {passedCount >= 3 ? t("pwModerateTitle") : t("pwWeakTitle")}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: passedCount >= 3 ? "hsl(38 70% 55%/0.7)" : "hsl(0 60% 60%/0.7)" }}>
                      {t("pwWeakDesc")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">{t("pwWhyTitle")}</p>
                  {failedRules.map(r => (
                    <div key={r.key} className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: "hsl(0 40% 12%/0.4)", border: "1px solid hsl(0 40% 25%/0.3)" }}>
                      <span className="text-red-400 text-base leading-none mt-0.5">✗</span>
                      <div>
                        <p className="text-sm font-medium text-red-300/90">{t(r.labelKey as any)}</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{t(r.whyKey as any)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {results.filter(r => r.passed).length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 mb-0.5">{t("pwPassedTitle")}</p>
                    {results.filter(r => r.passed).map(r => (
                      <div key={r.key} className="flex items-center gap-2 text-xs text-emerald-400/70">
                        <span className="text-emerald-500">✓</span>
                        {t(r.labelKey as any)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* HIBP credit */}
        {hasInput && (
          <p className="text-center text-xs text-muted-foreground/30">
            {isRTL ? "فحص الاختراق مدعوم من" : "Breach data powered by"}{" "}
            <a href="https://haveibeenpwned.com" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-muted-foreground/50 transition-colors">
              Have I Been Pwned
            </a>
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground/40">
          {isRTL
            ? "اضغط على أيقونة التحديث لتوليد كلمة مرور قوية تلقائياً"
            : "Click the refresh icon to generate a strong password automatically"}
        </p>
      </div>
    </div>
  );
}
