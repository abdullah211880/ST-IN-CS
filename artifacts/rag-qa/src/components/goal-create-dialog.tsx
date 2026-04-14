import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Target, Loader2, ChevronRight, Sparkles, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface Step { title: string; description: string; durationDays: number; dailyTasks: string[]; }
interface Plan  { category: string; motivation: string; overview: string; targetWeeks: number; steps: Step[]; }
interface GoalResult { id: string; title: string; steps: Step[]; }

const CAT_COLORS: Record<string, string> = {
  "Health": "#34d399", "Career": "#60a5fa", "Education": "#a78bfa",
  "Finance": "#fbbf24", "Creative": "#f87171", "Relationships": "#fb923c", "Personal Growth": "#22d3ee",
};

const EXAMPLES = [
  "I want to learn Spanish fluently within 6 months",
  "I want to run a marathon by end of the year",
  "I want to write and publish my first novel",
  "I want to save $10,000 for an emergency fund",
  "I want to get promoted to senior engineer",
];

export function GoalCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [phase, setPhase] = useState<"input" | "loading" | "review">("input");
  const [rawGoal, setRawGoal] = useState("");
  const [plan, setPlan]       = useState<Plan | null>(null);
  const [result, setResult]   = useState<GoalResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [, navigate]          = useLocation();
  const qc = useQueryClient();

  const reset = () => { setPhase("input"); setRawGoal(""); setPlan(null); setResult(null); setError(null); };

  const analyse = async () => {
    if (!rawGoal.trim()) return;
    setPhase("loading"); setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawGoal: rawGoal.trim() }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || "Failed to generate plan."); }
      const data = await res.json();
      setResult(data);
      // Reconstruct plan from result for display
      setPlan({
        category: data.category,
        motivation: data.motivation,
        overview: data.overview,
        targetWeeks: data.targetWeeks,
        steps: data.steps,
      });
      setPhase("review");
      qc.invalidateQueries({ queryKey: ["goals"] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("input");
    }
  };

  const openGoal = () => {
    if (result) { onOpenChange(false); navigate(`/goals/${result.id}`); reset(); }
  };

  const color = plan ? (CAT_COLORS[plan.category] ?? "#22d3ee") : "#22d3ee";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl w-full p-0 bg-card border-border flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(192 70% 28%), hsl(260 60% 34%))", boxShadow: "0 0 12px hsl(192 100% 48%/0.3)" }}>
                <Target className="w-4 h-4 text-white" />
              </div>
              {phase === "review" ? "Your Personalised Plan" : "Set a New Goal"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {phase === "review"
                ? "AI has built a step-by-step plan with daily tasks to keep you on track."
                : "Describe your goal in detail — the more specific, the better your plan."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── INPUT phase ── */}
        {phase === "input" && (
          <div className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto">
            <Textarea
              value={rawGoal}
              onChange={e => setRawGoal(e.target.value)}
              placeholder="e.g. I want to learn Spanish fluently so I can travel through South America next year…"
              className="bg-background border-border text-sm resize-none min-h-[140px] focus-visible:ring-cyan-500/30"
              maxLength={800}
            />
            <p className="text-[10px] text-muted-foreground/40 text-right -mt-2">{rawGoal.length}/800</p>

            {error && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </div>
            )}

            {/* Example prompts */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">Need inspiration?</p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => setRawGoal(ex)}
                    className="text-[11px] px-2.5 py-1 rounded-full border transition-all hover:border-cyan-400/40 hover:text-cyan-400"
                    style={{ background: "hsl(var(--muted))", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={analyse} disabled={!rawGoal.trim()} className="gap-2 self-end"
              style={{ background: "linear-gradient(135deg, hsl(192 70% 32%), hsl(260 60% 40%))", border: "none" }}>
              <Sparkles className="w-3.5 h-3.5" /> Analyse & Build Plan
            </Button>
          </div>
        )}

        {/* ── LOADING phase ── */}
        {phase === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(192 70% 22%), hsl(260 60% 28%))", boxShadow: "0 0 40px hsl(192 100% 48%/0.25)" }}>
                <Target className="w-10 h-10 text-cyan-300" />
              </div>
              <Loader2 className="w-24 h-24 absolute -top-2 -left-2 text-cyan-500/30 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Building your personalised plan…</p>
              <p className="text-xs text-muted-foreground mt-1">Analysing your goal and creating steps, tasks, and timeline</p>
            </div>
          </div>
        )}

        {/* ── REVIEW phase ── */}
        {phase === "review" && plan && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: "thin" }}>
            {/* Category + motivation */}
            <div className="rounded-xl p-4 border" style={{ background: `${color}0c`, borderColor: `${color}22` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${color}22`, color }}>
                  {plan.category}
                </span>
                <span className="text-xs text-muted-foreground">{plan.targetWeeks} week plan</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed italic">"{plan.motivation}"</p>
            </div>

            {/* Overview */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">Coach's Overview</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{plan.overview}</p>
            </div>

            {/* Steps */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-3">Your Roadmap</p>
              <div className="space-y-2">
                {plan.steps.map((step, i) => (
                  <div key={i} className="rounded-xl border p-3.5 flex gap-3" style={{ background: "hsl(var(--muted)/0.3)", borderColor: "hsl(var(--border))" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-foreground">{step.title}</p>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">{step.durationDays}d</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                      <p className="text-[10px] text-muted-foreground/40 mt-1">{step.dailyTasks.length} daily tasks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 pb-1 sticky bottom-0 bg-card">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { reset(); }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Start over
              </Button>
              <Button className="flex-1 gap-2" onClick={openGoal}
                style={{ background: `linear-gradient(135deg, ${color}cc, ${color}88)`, border: "none" }}>
                <CheckCircle2 className="w-4 h-4" /> Open My Plan
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
