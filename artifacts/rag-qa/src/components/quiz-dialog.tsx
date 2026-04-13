import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Loader2, AlertCircle, CheckCircle2, XCircle,
  ChevronRight, RotateCw, Download, Trophy, Target, BookOpen,
  Zap, Brain, Layers,
} from "lucide-react";

/* ── types ────────────────────────────────────────────────── */
interface Question {
  id: number;
  type: "mcq" | "true_false";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}
interface Quiz {
  documentId: string;
  filename: string;
  title: string;
  difficulty: string;
  questions: Question[];
}
type Step = "config" | "loading" | "quiz" | "results";

/* ── constants ────────────────────────────────────────────── */
const COUNTS  = [5, 10, 15, 20];
const DIFFS   = [
  { value: "easy",   label: "Easy",   icon: <BookOpen className="w-3.5 h-3.5" />, color: "text-green-400",  ring: "ring-green-500/40" },
  { value: "medium", label: "Medium", icon: <Brain    className="w-3.5 h-3.5" />, color: "text-yellow-400", ring: "ring-yellow-500/40" },
  { value: "hard",   label: "Hard",   icon: <Zap      className="w-3.5 h-3.5" />, color: "text-red-400",    ring: "ring-red-500/40" },
];
const TYPES = [
  { value: "mixed",      label: "Mixed",       desc: "MCQ + True/False",    icon: <Layers className="w-3.5 h-3.5" /> },
  { value: "mcq",        label: "MCQ Only",    desc: "4-option questions",  icon: <Target className="w-3.5 h-3.5" /> },
  { value: "true_false", label: "True / False",desc: "Binary questions",    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

const GRADE = (pct: number) => {
  if (pct >= 90) return { label: "Excellent!", color: "#22c55e", grade: "A" };
  if (pct >= 75) return { label: "Good Job!",  color: "#3b82f6", grade: "B" };
  if (pct >= 60) return { label: "Fair",        color: "#f59e0b", grade: "C" };
  if (pct >= 40) return { label: "Needs Work",  color: "#f97316", grade: "D" };
  return { label: "Keep Studying", color: "#ef4444", grade: "F" };
};

/* ── PDF export ───────────────────────────────────────────── */
function exportQuizPdf(quiz: Quiz, answers: Record<number, string>, withAnswers: boolean) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const qHtml = quiz.questions.map((q, i) => {
    const userAns  = answers[q.id];
    const isCorrect = withAnswers ? userAns === q.correctAnswer : null;
    const borderColor = isCorrect === true ? "#22c55e" : isCorrect === false ? "#ef4444" : "#e2e8f0";

    const optHtml = q.options.map(opt => {
      const letter = opt.split(".")[0];
      const isCorrectOpt = letter === q.correctAnswer;
      const isUserOpt    = letter === userAns;
      let bg = "#f8fafc", border = "#e2e8f0", textC = "#1e293b";
      if (withAnswers) {
        if (isCorrectOpt)              { bg = "#f0fdf4"; border = "#22c55e"; textC = "#15803d"; }
        else if (isUserOpt && !isCorrectOpt) { bg = "#fff5f5"; border = "#ef4444"; textC = "#dc2626"; }
      }
      return `<div class="opt" style="background:${bg};border-color:${border};color:${textC}">${opt}</div>`;
    }).join("");

    const badge = withAnswers && userAns
      ? `<span class="badge" style="background:${isCorrect ? "#dcfce7" : "#fee2e2"};color:${isCorrect ? "#166534" : "#991b1b"}">${isCorrect ? "✓ Correct" : "✗ Incorrect"}</span>`
      : "";
    const expHtml = withAnswers && q.explanation
      ? `<div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>` : "";

    return `<div class="question" style="border-left:3px solid ${borderColor}">
      <div class="q-header">
        <span class="q-num">Q${i + 1}</span>
        <span class="q-type">${q.type === "mcq" ? "MCQ" : "True/False"}</span>
        ${badge}
      </div>
      <p class="q-text">${q.question}</p>
      <div class="opts">${optHtml}</div>
      ${expHtml}
    </div>`;
  }).join("");

  let scoreHtml = "";
  if (withAnswers && Object.keys(answers).length > 0) {
    const correct = quiz.questions.filter(q => answers[q.id] === q.correctAnswer).length;
    const pct = Math.round((correct / quiz.questions.length) * 100);
    const g = GRADE(pct);
    scoreHtml = `<div class="score-box" style="border-color:${g.color}">
      <span class="grade" style="color:${g.color}">${g.grade}</span>
      <div><strong>${correct}/${quiz.questions.length} correct (${pct}%)</strong> — ${g.label}</div>
    </div>`;
  }

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>${withAnswers ? "Results" : "Exam"} – ${quiz.filename}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.6;color:#1a1a2e;background:#fff;padding:40px 48px}
.header{border-bottom:3px solid #8b5cf6;padding-bottom:18px;margin-bottom:20px}
.header h1{font-size:19px;font-weight:700;color:#1e1b4b;margin-bottom:3px}
.header .sub{font-size:12px;color:#64748b;margin-top:4px}
.badges{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.chip{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd}
.score-box{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:14px 20px;border-radius:10px;border:2px solid;background:#fafafa}
.grade{font-size:42px;font-weight:800}
.question{margin-bottom:18px;padding:14px 16px;border-radius:8px;border:1px solid #e2e8f0;background:#fafafa;page-break-inside:avoid}
.q-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.q-num{font-weight:700;font-size:14px;color:#1e1b4b}
.q-type{font-size:10px;padding:2px 8px;border-radius:20px;background:#ede9fe;color:#5b21b6;font-weight:600;text-transform:uppercase}
.badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;margin-left:auto}
.q-text{font-size:13px;color:#1e293b;font-weight:500;margin-bottom:10px}
.opts{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.opt{padding:7px 10px;border-radius:6px;border:1px solid;font-size:12px}
.explanation{margin-top:10px;padding:8px 12px;border-radius:6px;background:#f0fdf4;border-left:3px solid #22c55e;font-size:12px;color:#166534}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
@media print{body{padding:24px 32px}}
</style></head><body>
<div class="header">
  <div class="sub">RAG Engine · ${withAnswers ? "Quiz Results" : "Exam Paper"} · ${date}</div>
  <h1>${quiz.title || quiz.filename}</h1>
  <div class="sub">${quiz.filename}</div>
  <div class="badges">
    <span class="chip">${quiz.difficulty} difficulty</span>
    <span class="chip">${quiz.questions.length} questions</span>
    ${withAnswers ? "" : '<span class="chip">Name: ________________________</span><span class="chip">Date: ____________</span>'}
  </div>
</div>
${scoreHtml}
${qHtml}
<div class="footer"><span>Generated by RAG Engine · Document Intelligence Platform</span><span>${date}</span></div>
</body></html>`;

  const win = window.open("", "_blank", "width=1000,height=750");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

/* ── props ────────────────────────────────────────────────── */
interface QuizDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  documentId: string;
  filename: string;
}

/* ── component ────────────────────────────────────────────── */
export function QuizDialog({ open, onOpenChange, documentId, filename }: QuizDialogProps) {
  const [step, setStep]         = useState<Step>("config");
  const [quiz, setQuiz]         = useState<Quiz | null>(null);
  const [answers, setAnswers]   = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  /* config state */
  const [count,      setCount]      = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [types,      setTypes]      = useState("mixed");

  const reset = () => {
    setStep("config"); setQuiz(null); setAnswers({});
    setSubmitted(false); setError(null);
  };

  const generate = async () => {
    setStep("loading"); setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/quiz?count=${count}&difficulty=${difficulty}&types=${types}`);
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `Error ${res.status}`); }
      const data: Quiz = await res.json();
      if (!data.questions?.length) throw new Error("No questions were generated.");
      setQuiz(data); setAnswers({}); setSubmitted(false);
      setStep("quiz");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate quiz.");
      setStep("config");
    }
  };

  const submit = () => setSubmitted(true);

  const score    = quiz ? quiz.questions.filter(q => answers[q.id] === q.correctAnswer).length : 0;
  const total    = quiz?.questions.length ?? 0;
  const pct      = total ? Math.round((score / total) * 100) : 0;
  const gradeInfo = GRADE(pct);
  const answered  = Object.keys(answers).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[740px] bg-card border-border max-h-[92vh] flex flex-col p-0 overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(260 80% 45%), hsl(280 70% 50%))", boxShadow: "0 0 12px hsl(260 80% 50%/0.35)" }}>
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              Quiz / Exam Generator
            </DialogTitle>
            <DialogDescription className="truncate text-xs">{filename}</DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Config ─────────────────────────────────────── */}
        {step === "config" && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
              </div>
            )}

            {/* Question count */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Number of Questions</p>
              <div className="flex gap-2 flex-wrap">
                {COUNTS.map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={cn("px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200", count === n
                      ? "text-white border-violet-500/50"
                      : "text-muted-foreground border-border/50 hover:border-violet-500/30 hover:text-foreground bg-muted/20")}
                    style={count === n ? {
                      background: "linear-gradient(135deg, hsl(260 80% 35%), hsl(280 70% 40%))",
                      boxShadow: "0 0 10px hsl(260 80% 50%/0.3)",
                    } : {}}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Difficulty</p>
              <div className="flex gap-2 flex-wrap">
                {DIFFS.map(d => (
                  <button key={d.value} onClick={() => setDifficulty(d.value)}
                    className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200",
                      difficulty === d.value
                        ? `${d.color} border-current`
                        : "text-muted-foreground border-border/50 hover:border-border bg-muted/20 hover:text-foreground")}
                    style={difficulty === d.value ? { background: "hsl(var(--muted)/0.4)", boxShadow: `0 0 10px currentColor` } : {}}>
                    {d.icon}{d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question type */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Question Type</p>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setTypes(t.value)}
                    className={cn("flex flex-col items-start gap-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-all duration-200",
                      types === t.value ? "text-white" : "text-muted-foreground border-border/50 hover:border-violet-500/30 hover:text-foreground bg-muted/20")}
                    style={types === t.value ? {
                      background: "linear-gradient(135deg, hsl(260 70% 30%), hsl(280 60% 35%))",
                      border: "1px solid hsl(260 70% 50%/0.4)",
                      boxShadow: "0 0 10px hsl(260 80% 50%/0.2)",
                    } : {}}>
                    <span className="flex items-center gap-1.5">{t.icon}{t.label}</span>
                    <span className={cn("text-[11px] font-normal", types === t.value ? "text-violet-200" : "text-muted-foreground/60")}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full h-11 text-sm font-semibold gap-2" onClick={generate}
              style={{ background: "linear-gradient(135deg, hsl(260 80% 38%), hsl(280 70% 42%))", boxShadow: "0 0 18px hsl(260 80% 50%/0.3)" }}>
              <GraduationCap className="w-4 h-4" /> Generate {count}-Question Quiz
            </Button>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────── */}
        {step === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 py-16 px-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(260 80% 35%), hsl(280 70% 40%))", boxShadow: "0 0 28px hsl(260 80% 50%/0.4)" }}>
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <Loader2 className="w-20 h-20 absolute -top-2 -left-2 text-violet-500/40 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">Generating your quiz…</p>
              <p className="text-sm text-muted-foreground mt-1">AI is crafting {count} {difficulty} questions from your document</p>
            </div>
          </div>
        )}

        {/* ── Quiz ─────────────────────────────────────────── */}
        {step === "quiz" && quiz && !submitted && (
          <>
            {/* Progress bar */}
            <div className="shrink-0 px-6 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid hsl(var(--border)/0.4)" }}>
              <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${total ? (answered / total) * 100 : 0}%`,
                    background: "linear-gradient(90deg, hsl(260 80% 55%), hsl(280 70% 60%))",
                  }} />
              </div>
              <span className="text-xs font-mono text-muted-foreground shrink-0">{answered}/{total} answered</span>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-5 pb-4">
                {quiz.questions.map((q, idx) => {
                  const userAns = answers[q.id];
                  return (
                    <div key={q.id} className="rounded-xl border p-4 transition-all duration-200"
                      style={{
                        borderColor: userAns ? "hsl(260 60% 40%/0.4)" : "hsl(var(--border)/0.5)",
                        background: userAns ? "hsl(260 60% 15%/0.3)" : "hsl(var(--muted)/0.1)",
                      }}>
                      <div className="flex items-start gap-3 mb-3">
                        <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: userAns ? "linear-gradient(135deg,hsl(260 80% 45%),hsl(280 70% 50%))" : "hsl(var(--muted))" }}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
                          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-0.5 inline-block">
                            {q.type === "mcq" ? "Multiple Choice" : "True / False"}
                          </span>
                        </div>
                      </div>
                      <RadioGroup value={userAns ?? ""} onValueChange={val => setAnswers(a => ({ ...a, [q.id]: val }))}>
                        <div className={cn("grid gap-2", q.type === "true_false" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
                          {q.options.map(opt => {
                            const letter = q.type === "true_false" ? opt : opt.split(".")[0];
                            const selected = userAns === letter;
                            return (
                              <div key={opt}
                                className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150",
                                  selected ? "border-violet-500/50 text-white" : "border-border/40 text-muted-foreground hover:border-violet-500/25 hover:text-foreground")}
                                style={selected ? { background: "hsl(260 70% 25%/0.6)" } : { background: "hsl(var(--muted)/0.15)" }}
                                onClick={() => setAnswers(a => ({ ...a, [q.id]: letter }))}>
                                <RadioGroupItem value={letter} id={`${q.id}-${letter}`} className="shrink-0" />
                                <Label htmlFor={`${q.id}-${letter}`} className="text-sm cursor-pointer leading-snug">{opt}</Label>
                              </div>
                            );
                          })}
                        </div>
                      </RadioGroup>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="shrink-0 px-6 py-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid hsl(var(--border)/0.4)" }}>
              <span className="text-xs text-muted-foreground">
                {answered < total ? `${total - answered} question${total - answered !== 1 ? "s" : ""} remaining` : "All answered!"}
              </span>
              <Button onClick={submit} disabled={answered === 0}
                className="gap-2 px-6"
                style={{ background: "linear-gradient(135deg, hsl(260 80% 38%), hsl(280 70% 42%))", boxShadow: "0 0 14px hsl(260 80% 50%/0.25)" }}>
                Submit Quiz <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* ── Results ──────────────────────────────────────── */}
        {step === "quiz" && quiz && submitted && (
          <>
            <ScrollArea className="flex-1 px-6 py-5">
              <div className="space-y-5 pb-4">
                {/* Score card */}
                <div className="rounded-2xl p-5 text-center border"
                  style={{
                    background: "linear-gradient(135deg, hsl(260 50% 12%), hsl(280 45% 10%))",
                    borderColor: `${gradeInfo.color}40`,
                    boxShadow: `0 0 30px ${gradeInfo.color}20`,
                  }}>
                  <div className="text-6xl font-black mb-1" style={{ color: gradeInfo.color }}>{gradeInfo.grade}</div>
                  <div className="text-4xl font-bold text-foreground mb-1">{pct}%</div>
                  <div className="text-sm text-muted-foreground">{score} out of {total} correct</div>
                  <Badge className="mt-3 text-sm font-semibold px-4 py-1" style={{ background: `${gradeInfo.color}20`, color: gradeInfo.color, border: `1px solid ${gradeInfo.color}40` }}>
                    <Trophy className="w-3.5 h-3.5 mr-1.5" />{gradeInfo.label}
                  </Badge>
                </div>

                {/* Question review */}
                {quiz.questions.map((q, idx) => {
                  const userAns   = answers[q.id];
                  const isCorrect = userAns === q.correctAnswer;
                  const wasAnswered = !!userAns;
                  return (
                    <div key={q.id} className="rounded-xl border p-4 space-y-3"
                      style={{
                        borderColor: !wasAnswered ? "hsl(var(--border)/0.5)" : isCorrect ? "#22c55e40" : "#ef444440",
                        background:  !wasAnswered ? "hsl(var(--muted)/0.1)" : isCorrect ? "hsl(142 70% 10%/0.4)" : "hsl(0 70% 10%/0.4)",
                      }}>
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: !wasAnswered ? "hsl(var(--muted))" : isCorrect ? "#22c55e30" : "#ef444430",
                                   color: !wasAnswered ? "white" : isCorrect ? "#22c55e" : "#ef4444" }}>
                          {idx + 1}
                        </span>
                        <p className="flex-1 text-sm font-medium text-foreground leading-snug">{q.question}</p>
                        {wasAnswered ? (
                          isCorrect
                            ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                            : <XCircle      className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">Skipped</span>
                        )}
                      </div>

                      <div className={cn("grid gap-1.5", q.type === "true_false" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
                        {q.options.map(opt => {
                          const letter     = q.type === "true_false" ? opt : opt.split(".")[0];
                          const isCorrectO = letter === q.correctAnswer;
                          const isUserO    = letter === userAns;
                          return (
                            <div key={opt}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border"
                              style={{
                                background:   isCorrectO ? "hsl(142 60% 18%/0.6)" : isUserO && !isCorrectO ? "hsl(0 60% 18%/0.6)" : "hsl(var(--muted)/0.1)",
                                borderColor:  isCorrectO ? "#22c55e50"              : isUserO && !isCorrectO ? "#ef444450" : "hsl(var(--border)/0.3)",
                                color:        isCorrectO ? "#4ade80"                : isUserO && !isCorrectO ? "#f87171" : "hsl(var(--muted-foreground))",
                              }}>
                              {isCorrectO  ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> :
                               isUserO     ? <XCircle      className="w-3.5 h-3.5 shrink-0" /> :
                               <span className="w-3.5 h-3.5 shrink-0" />}
                              <span>{opt}</span>
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs text-foreground/80"
                          style={{ background: "hsl(var(--muted)/0.25)", borderLeft: "2px solid hsl(260 60% 50%/0.5)" }}>
                          <Brain className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="shrink-0 px-6 py-3 flex items-center justify-between gap-2" style={{ borderTop: "1px solid hsl(var(--border)/0.4)" }}>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => exportQuizPdf(quiz, answers, true)}>
                  <Download className="w-3.5 h-3.5" /> Results PDF
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => exportQuizPdf(quiz, {}, false)}>
                  <Download className="w-3.5 h-3.5" /> Blank Exam
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-xs h-8 gap-1" onClick={() => { setAnswers({}); setSubmitted(false); }}>
                  <RotateCw className="w-3 h-3" /> Retry
                </Button>
                <Button size="sm" className="text-xs h-8 gap-1"
                  onClick={reset}
                  style={{ background: "linear-gradient(135deg, hsl(260 80% 38%), hsl(280 70% 42%))" }}>
                  New Quiz
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
