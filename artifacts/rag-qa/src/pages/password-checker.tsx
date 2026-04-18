import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, ShieldX, ShieldAlert, RefreshCw, Copy, Check } from "lucide-react";
import { useLang } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

/* ── strength logic ─────────────────────────────────────────── */
interface Rule {
  key: string;
  labelKey: string;
  whyKey: string;
  test: (p: string) => boolean;
}

const RULES: Rule[] = [
  {
    key: "length",
    labelKey: "pwRuleLength",
    whyKey: "pwWhyLength",
    test: p => p.length >= 8,
  },
  {
    key: "upper",
    labelKey: "pwRuleUpper",
    whyKey: "pwWhyUpper",
    test: p => /[A-Z]/.test(p),
  },
  {
    key: "lower",
    labelKey: "pwRuleLower",
    whyKey: "pwWhyLower",
    test: p => /[a-z]/.test(p),
  },
  {
    key: "number",
    labelKey: "pwRuleNumber",
    whyKey: "pwWhyNumber",
    test: p => /[0-9]/.test(p),
  },
  {
    key: "special",
    labelKey: "pwRuleSpecial",
    whyKey: "pwWhySpecial",
    test: p => /[^A-Za-z0-9]/.test(p),
  },
];

function evaluate(password: string) {
  const results = RULES.map(r => ({ ...r, passed: r.test(password) }));
  const passedCount = results.filter(r => r.passed).length;
  const isStrong = passedCount === RULES.length;
  return { results, passedCount, isStrong };
}

/* ── random strong password generator ─────────────────────── */
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
  for (let i = pw.length; i < len; i++) {
    pw.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pw.sort(() => Math.random() - 0.5).join("");
}

/* ── strength bar segment ───────────────────────────────────── */
function StrengthBar({ passedCount }: { passedCount: number }) {
  const colors = [
    "hsl(0 75% 50%)",    // 1 - red
    "hsl(20 90% 50%)",   // 2 - orange
    "hsl(38 90% 50%)",   // 3 - amber
    "hsl(80 70% 45%)",   // 4 - yellow-green
    "hsl(142 65% 45%)",  // 5 - green
  ];
  const activeColor = passedCount > 0 ? colors[passedCount - 1] : "transparent";

  return (
    <div className="flex gap-1.5 mt-3">
      {RULES.map((_, i) => (
        <div
          key={i}
          className="flex-1 h-1.5 rounded-full transition-all duration-500"
          style={{
            background: i < passedCount ? activeColor : "hsl(228 30% 18%)",
          }}
        />
      ))}
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────── */
export default function PasswordChecker() {
  const { t, lang } = useLang();
  const isRTL = lang === "ar";

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const { results, passedCount, isStrong } = evaluate(password);
  const hasInput = password.length > 0;

  const failedRules = results.filter(r => !r.passed);

  const generate = () => {
    setPassword(generatePassword());
    setShow(true);
  };

  const copy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* border color based on strength */
  const borderColor = !hasInput
    ? "hsl(228 30% 22%)"
    : isStrong
    ? "hsl(142 60% 40%/0.7)"
    : passedCount >= 3
    ? "hsl(38 80% 45%/0.7)"
    : "hsl(0 65% 45%/0.7)";

  const strengthLabel = !hasInput
    ? ""
    : isStrong
    ? t("pwStrong")
    : passedCount >= 3
    ? t("pwModerate")
    : t("pwWeak");

  const strengthColor = !hasInput
    ? ""
    : isStrong
    ? "hsl(142 65% 55%)"
    : passedCount >= 3
    ? "hsl(38 90% 60%)"
    : "hsl(0 75% 60%)";

  return (
    <div className="flex-1 flex flex-col items-center justify-start min-h-0 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-lg flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="text-center">
          <div
            className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, hsl(260 70% 40%), hsl(280 65% 50%))",
              boxShadow: "0 0 28px hsl(270 80% 55%/0.35)",
            }}
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("pwTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{t("pwDesc")}</p>
        </div>

        {/* ── Password input card ── */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: "hsl(228 25% 9%/0.8)",
            border: "1px solid hsl(228 30% 20%/0.6)",
          }}
        >
          <label className="text-sm font-medium text-muted-foreground" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            {t("pwLabel")}
          </label>

          {/* Input row */}
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 transition-all duration-300"
            style={{
              background: "hsl(228 30% 7%)",
              border: `2px solid ${borderColor}`,
              boxShadow: hasInput ? `0 0 20px ${borderColor.replace("0.7)", "0.15)")}` : "none",
            }}
          >
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
              <button
                onClick={() => setShow(s => !s)}
                className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-muted-foreground/50 hover:text-muted-foreground"
                title={show ? t("pwHide") : t("pwShow")}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={copy}
                disabled={!password}
                className="p-1.5 rounded-lg hover:bg-white/8 transition-colors disabled:opacity-30"
                style={{ color: copied ? "hsl(142 65% 55%)" : "hsl(215 20% 55%)" }}
                title={t("pwCopy")}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={generate}
                className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-muted-foreground/50 hover:text-violet-400"
                title={t("pwGenerate")}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Strength bar */}
          <StrengthBar passedCount={passedCount} />

          {/* Strength badge */}
          {hasInput && (
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  color: strengthColor,
                  background: `${strengthColor.replace(")", "/0.12)")}`,
                  border: `1px solid ${strengthColor.replace(")", "/0.25)")}`,
                }}
              >
                {strengthLabel}
              </span>
              <span className="text-xs text-muted-foreground/50">
                {passedCount}/{RULES.length} {isRTL ? "معيار" : "criteria"}
              </span>
            </div>
          )}
        </div>

        {/* ── Result card ── */}
        {hasInput && (
          <>
            {/* Strong */}
            {isStrong ? (
              <div
                className="rounded-2xl p-6 flex items-start gap-4"
                style={{
                  background: "hsl(142 40% 8%/0.6)",
                  border: "1px solid hsl(142 50% 28%/0.5)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                  style={{
                    background: "hsl(142 60% 15%/0.7)",
                    border: "1px solid hsl(142 55% 30%/0.4)",
                    boxShadow: "0 0 16px hsl(142 70% 45%/0.2)",
                  }}
                >
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
              /* Weak / Moderate */
              <div
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  background: passedCount >= 3
                    ? "hsl(38 50% 8%/0.6)"
                    : "hsl(0 50% 8%/0.6)",
                  border: passedCount >= 3
                    ? "1px solid hsl(38 60% 30%/0.5)"
                    : "1px solid hsl(0 55% 30%/0.5)",
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                    style={{
                      background: passedCount >= 3 ? "hsl(38 60% 15%/0.7)" : "hsl(0 55% 12%/0.7)",
                      border: passedCount >= 3
                        ? "1px solid hsl(38 60% 30%/0.4)"
                        : "1px solid hsl(0 55% 28%/0.4)",
                    }}
                  >
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

                {/* Why it's weak: failed rules */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">
                    {t("pwWhyTitle")}
                  </p>
                  {failedRules.map(r => (
                    <div
                      key={r.key}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{
                        background: "hsl(0 40% 12%/0.4)",
                        border: "1px solid hsl(0 40% 25%/0.3)",
                      }}
                    >
                      <span className="text-red-400 text-base leading-none mt-0.5">✗</span>
                      <div>
                        <p className="text-sm font-medium text-red-300/90">
                          {t(r.labelKey as any)}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {t(r.whyKey as any)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Passed rules */}
                {results.filter(r => r.passed).length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 mb-0.5">
                      {t("pwPassedTitle")}
                    </p>
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

        {/* ── Generate tip ── */}
        <p className="text-center text-xs text-muted-foreground/40">
          {isRTL
            ? "اضغط على أيقونة التحديث لتوليد كلمة مرور قوية تلقائياً"
            : "Click the refresh icon to generate a strong password automatically"}
        </p>

      </div>
    </div>
  );
}
