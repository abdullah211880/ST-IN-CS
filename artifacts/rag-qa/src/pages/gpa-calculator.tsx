import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, GraduationCap, RotateCcw, BookOpen } from "lucide-react";
import { useLang } from "@/contexts/language-context";

// testing-gpa-service: scratch branch for verifying GPA calculator behaviour
//   (4.0 / 5.0 scale switching, weighted average, and reset flow).

/* ── grade maps ─────────────────────────────────────────────── */
const LETTER_GRADES_4 = [
  { label: "A+", points: 4.0 },
  { label: "A",  points: 4.0 },
  { label: "A-", points: 3.7 },
  { label: "B+", points: 3.3 },
  { label: "B",  points: 3.0 },
  { label: "B-", points: 2.7 },
  { label: "C+", points: 2.3 },
  { label: "C",  points: 2.0 },
  { label: "C-", points: 1.7 },
  { label: "D+", points: 1.3 },
  { label: "D",  points: 1.0 },
  { label: "D-", points: 0.7 },
  { label: "F",  points: 0.0 },
];

const LETTER_GRADES_5 = [
  { label: "A+", points: 5.0 },
  { label: "A",  points: 5.0 },
  { label: "A-", points: 4.7 },
  { label: "B+", points: 4.3 },
  { label: "B",  points: 4.0 },
  { label: "B-", points: 3.7 },
  { label: "C+", points: 3.3 },
  { label: "C",  points: 3.0 },
  { label: "C-", points: 2.7 },
  { label: "D+", points: 2.3 },
  { label: "D",  points: 2.0 },
  { label: "D-", points: 1.7 },
  { label: "F",  points: 0.0 },
];

/* ── types ─────────────────────────────────────────────────── */
interface Course {
  id: string;
  name: string;
  grade: string;
  credits: number;
}

/* ── helpers ────────────────────────────────────────────────── */
let courseCounter = 0;
function newCourse(): Course {
  return { id: String(++courseCounter), name: "", grade: "A", credits: 3 };
}

function gradePoints(grade: string, scale: "4" | "5"): number {
  const list = scale === "4" ? LETTER_GRADES_4 : LETTER_GRADES_5;
  return list.find(g => g.label === grade)?.points ?? 0;
}

function letterForGpa(gpa: number, scale: "4" | "5"): string {
  const max = scale === "4" ? 4 : 5;
  const ratio = gpa / max;
  if (ratio >= 0.95) return "A+";
  if (ratio >= 0.90) return "A";
  if (ratio >= 0.85) return "A-";
  if (ratio >= 0.80) return "B+";
  if (ratio >= 0.75) return "B";
  if (ratio >= 0.70) return "B-";
  if (ratio >= 0.65) return "C+";
  if (ratio >= 0.60) return "C";
  if (ratio >= 0.55) return "C-";
  if (ratio >= 0.50) return "D+";
  if (ratio >= 0.45) return "D";
  if (ratio >= 0.40) return "D-";
  return "F";
}

/* ── GPA ring ───────────────────────────────────────────────── */
function GpaRing({ gpa, max }: { gpa: number; max: number }) {
  const ratio = Math.min(gpa / max, 1);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = ratio * circ;

  const color =
    ratio >= 0.85 ? "hsl(142 65% 50%)"
    : ratio >= 0.70 ? "hsl(195 80% 50%)"
    : ratio >= 0.55 ? "hsl(45 90% 55%)"
    : ratio >= 0.40 ? "hsl(25 85% 55%)"
    : "hsl(0 70% 55%)";

  return (
    <div className="relative" style={{ width: 140, height: 140 }}>
      <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={70} cy={70} r={r}
          fill="none"
          stroke="hsl(228 30% 14%)"
          strokeWidth={12}
        />
        <circle
          cx={70} cy={70} r={r}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease",
            filter: `drop-shadow(0 0 8px ${color}80)`,
          }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ gap: 1 }}
      >
        <span className="text-3xl font-bold tabular-nums" style={{ color, lineHeight: 1 }}>
          {gpa.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground/50">/ {max.toFixed(1)}</span>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function GpaCalculator() {
  const { t, lang } = useLang();
  const isRTL = lang === "ar";

  const [courses, setCourses] = useState<Course[]>([newCourse(), newCourse(), newCourse()]);
  const [scale, setScale] = useState<"4" | "5">("4");

  const max = scale === "4" ? 4.0 : 5.0;
  const gradeList = scale === "4" ? LETTER_GRADES_4 : LETTER_GRADES_5;

  const addCourse = useCallback(() => setCourses(c => [...c, newCourse()]), []);
  const removeCourse = useCallback((id: string) =>
    setCourses(c => c.length > 1 ? c.filter(x => x.id !== id) : c), []);
  const updateCourse = useCallback((id: string, field: keyof Course, value: string | number) =>
    setCourses(c => c.map(x => x.id === id ? { ...x, [field]: value } : x)), []);
  const reset = useCallback(() => setCourses([newCourse(), newCourse(), newCourse()]), []);

  /* ── computed ── */
  const computed = useMemo(() => {
    const valid = courses.filter(c => c.credits > 0 && c.grade);
    const totalCredits = valid.reduce((s, c) => s + c.credits, 0);
    const totalQP = valid.reduce((s, c) => s + gradePoints(c.grade, scale) * c.credits, 0);
    const gpa = totalCredits > 0 ? totalQP / totalCredits : 0;
    return { gpa, totalCredits, totalQP, validCount: valid.length };
  }, [courses, scale]);

  const perfLabel = (gpa: number): string => {
    const ratio = gpa / max;
    if (ratio >= 0.90) return t("gpaPerfExcellent");
    if (ratio >= 0.80) return t("gpaPerfVeryGood");
    if (ratio >= 0.70) return t("gpaPerfGood");
    if (ratio >= 0.55) return t("gpaPerfSatisfactory");
    if (ratio >= 0.40) return t("gpaPerfPassable");
    return t("gpaPerfFailing");
  };

  const perfColor = (gpa: number): string => {
    const ratio = gpa / max;
    if (ratio >= 0.90) return "hsl(142 65% 55%)";
    if (ratio >= 0.80) return "hsl(195 80% 55%)";
    if (ratio >= 0.70) return "hsl(45 90% 55%)";
    if (ratio >= 0.55) return "hsl(25 85% 55%)";
    if (ratio >= 0.40) return "hsl(10 80% 55%)";
    return "hsl(0 70% 55%)";
  };

  const gradeColor = (grade: string): string => {
    const pts = gradePoints(grade, scale);
    const ratio = pts / max;
    if (ratio >= 0.90) return "hsl(142 65% 55%)";
    if (ratio >= 0.80) return "hsl(195 80% 55%)";
    if (ratio >= 0.70) return "hsl(45 90% 55%)";
    if (ratio >= 0.50) return "hsl(25 85% 55%)";
    return "hsl(0 70% 55%)";
  };

  const inputStyle = {
    background: "hsl(228 25% 7%)",
    border: "1.5px solid hsl(228 30% 20%/0.8)",
    color: "hsl(215 20% 82%)",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 14,
    outline: "none",
    width: "100%",
  } as React.CSSProperties;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* ── Header ── */}
      <div className="shrink-0 px-8 pt-8 pb-5">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(195 80% 35%), hsl(220 70% 40%))",
              boxShadow: "0 0 24px hsl(195 80% 45%/0.35)",
            }}
          >
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("gpaTitle")}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("gpaDesc")}
                </p>
              </div>
              {/* Scale toggle */}
              <div
                className="flex items-center gap-1 p-1 rounded-xl"
                style={{ background: "hsl(228 25% 9%)", border: "1px solid hsl(228 30% 20%/0.7)" }}
              >
                {(["4", "5"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                    style={scale === s ? {
                      background: "hsl(195 70% 35%/0.5)",
                      color: "hsl(195 80% 70%)",
                      border: "1px solid hsl(195 70% 45%/0.4)",
                    } : {
                      color: "hsl(215 15% 55%)",
                      border: "1px solid transparent",
                    }}
                  >
                    {s === "4" ? t("gpaScale4") : t("gpaScale5")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 px-8 pb-8">

        {/* ─── LEFT: course list ─── */}
        <div className="flex flex-col gap-4">

          {/* Column headers */}
          <div
            className="grid gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 px-1"
            style={{ gridTemplateColumns: "1fr 110px 90px 36px" }}
          >
            <span>{t("gpaCourseName")}</span>
            <span>{t("gpaGrade")}</span>
            <span>{t("gpaCredits")}</span>
            <span />
          </div>

          {/* Course rows */}
          <div className="flex flex-col gap-2.5">
            {courses.map((course, idx) => (
              <div
                key={course.id}
                className="grid gap-3 items-center p-3 rounded-xl group"
                style={{
                  gridTemplateColumns: "1fr 110px 90px 36px",
                  background: "hsl(228 25% 8%/0.6)",
                  border: "1px solid hsl(228 30% 20%/0.5)",
                }}
              >
                {/* Name */}
                <input
                  type="text"
                  value={course.name}
                  onChange={e => updateCourse(course.id, "name", e.target.value)}
                  placeholder={`${t("gpaCourseNamePh")} ${idx + 1}`}
                  style={inputStyle}
                />

                {/* Grade select */}
                <select
                  value={course.grade}
                  onChange={e => updateCourse(course.id, "grade", e.target.value)}
                  style={{
                    ...inputStyle,
                    color: gradeColor(course.grade),
                    fontWeight: 600,
                    cursor: "pointer",
                    appearance: "none" as const,
                    textAlign: "center" as const,
                  }}
                >
                  {gradeList.map(g => (
                    <option key={g.label} value={g.label} style={{ color: "white", background: "#1a1f2e" }}>
                      {g.label} ({g.points.toFixed(1)})
                    </option>
                  ))}
                </select>

                {/* Credits */}
                <input
                  type="number"
                  min={0.5}
                  max={12}
                  step={0.5}
                  value={course.credits}
                  onChange={e => updateCourse(course.id, "credits", Math.max(0.5, parseFloat(e.target.value) || 1))}
                  style={{ ...inputStyle, textAlign: "center" as const }}
                />

                {/* Remove */}
                <button
                  onClick={() => removeCourse(course.id)}
                  disabled={courses.length <= 1}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{ border: "1px solid hsl(228 30% 20%/0.3)" }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={addCourse}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "hsl(195 60% 20%/0.4)",
                border: "1px solid hsl(195 65% 35%/0.4)",
                color: "hsl(195 80% 65%)",
              }}
            >
              <Plus className="w-4 h-4" />
              {t("gpaAddCourse")}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground/50 hover:text-muted-foreground"
              style={{ border: "1px solid hsl(228 30% 22%/0.5)" }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("gpaReset")}
            </button>
          </div>

          {/* ── Breakdown table (bottom of left col on xl) ── */}
          {computed.validCount > 0 && (
            <div
              className="mt-2 rounded-xl overflow-hidden"
              style={{ border: "1px solid hsl(228 30% 20%/0.5)" }}
            >
              <div
                className="px-4 py-2.5 flex items-center gap-2"
                style={{ background: "hsl(228 25% 10%/0.7)", borderBottom: "1px solid hsl(228 30% 20%/0.4)" }}
              >
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {t("gpaBreakdown")}
                </span>
              </div>
              <div className="divide-y" style={{ ["--tw-divide-opacity" as string]: "0.4" }}>
                {courses.filter(c => c.credits > 0).map(c => {
                  const pts = gradePoints(c.grade, scale);
                  const qp = pts * c.credits;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-4 py-2.5 text-sm"
                      style={{ borderBottom: "1px solid hsl(228 30% 18%/0.3)" }}
                    >
                      <span className="text-muted-foreground/70 truncate flex-1">
                        {c.name || `Course ${c.id}`}
                      </span>
                      <div className="flex items-center gap-6 shrink-0">
                        <span className="font-semibold w-8 text-center" style={{ color: gradeColor(c.grade) }}>
                          {c.grade}
                        </span>
                        <span className="text-muted-foreground/50 w-12 text-center tabular-nums">
                          {c.credits} cr
                        </span>
                        <span className="text-muted-foreground/60 w-16 text-right tabular-nums">
                          {qp.toFixed(1)} QP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT: GPA result panel ─── */}
        <div className="flex flex-col gap-4">

          {computed.validCount === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-5 rounded-2xl"
              style={{
                minHeight: 280,
                background: "hsl(228 25% 7%/0.4)",
                border: "1px dashed hsl(228 30% 22%/0.6)",
              }}
            >
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{
                  background: "hsl(195 50% 18%/0.15)",
                  border: "1px solid hsl(195 55% 28%/0.2)",
                }}
              >
                <GraduationCap className="w-10 h-10 text-cyan-500/30" />
              </div>
              <p className="text-sm text-muted-foreground/50 text-center px-6">
                {t("gpaNoCoursesYet")}
              </p>
            </div>
          ) : (
            <>
              {/* GPA hero card */}
              <div
                className="rounded-2xl p-6 flex flex-col items-center gap-5"
                style={{
                  background: "hsl(228 25% 8%/0.8)",
                  border: "1px solid hsl(228 30% 22%/0.6)",
                  boxShadow: `0 0 40px ${perfColor(computed.gpa)}20`,
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {t("gpaYourGpa")}
                </p>

                <GpaRing gpa={computed.gpa} max={max} />

                {/* Letter grade + standing */}
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="text-4xl font-extrabold tracking-tight"
                    style={{ color: perfColor(computed.gpa) }}
                  >
                    {letterForGpa(computed.gpa, scale)}
                  </span>
                  <span
                    className="text-sm font-semibold px-3 py-1 rounded-full"
                    style={{
                      color: perfColor(computed.gpa),
                      background: `${perfColor(computed.gpa)}18`,
                      border: `1px solid ${perfColor(computed.gpa)}35`,
                    }}
                  >
                    {perfLabel(computed.gpa)}
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t("gpaQualityPoints"), value: computed.totalQP.toFixed(1) },
                  { label: t("gpaTotalCredits"),  value: computed.totalCredits.toString() },
                  { label: t("gpaCoursesCount"),  value: computed.validCount.toString() },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-3 flex flex-col items-center gap-1"
                    style={{
                      background: "hsl(228 25% 8%/0.6)",
                      border: "1px solid hsl(228 30% 20%/0.5)",
                    }}
                  >
                    <span className="text-lg font-bold tabular-nums text-foreground">{stat.value}</span>
                    <span className="text-xs text-muted-foreground/45 text-center leading-tight">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Grade distribution bar */}
              <div
                className="p-4 rounded-xl"
                style={{ background: "hsl(228 25% 8%/0.5)", border: "1px solid hsl(228 30% 20%/0.4)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 mb-3">
                  {isRTL ? "توزيع الدرجات" : "Grade Distribution"}
                </p>
                <div className="flex gap-0.5 h-5 rounded-lg overflow-hidden">
                  {courses.filter(c => c.credits > 0).map(c => {
                    const pct = (c.credits / (computed.totalCredits || 1)) * 100;
                    return (
                      <div
                        key={c.id}
                        title={`${c.name || c.grade}: ${c.credits} cr`}
                        style={{
                          width: `${pct}%`,
                          background: gradeColor(c.grade),
                          opacity: 0.75,
                          transition: "width 0.4s ease",
                          minWidth: 4,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {Array.from(new Set(courses.map(c => c.grade))).map(g => (
                    <div key={g} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: gradeColor(g) }}
                      />
                      <span className="text-xs text-muted-foreground/55">{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
