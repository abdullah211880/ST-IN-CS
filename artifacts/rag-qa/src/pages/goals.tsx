import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Target, Plus, Loader2, AlertCircle, CheckCircle2,
  PauseCircle, ChevronRight, Flame, BookOpen, HeartPulse,
  DollarSign, Palette, Users, Sparkles, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalCreateDialog } from "@/components/goal-create-dialog";
import { useToast } from "@/hooks/use-toast";

/* ── category meta ─────────────────────────────────────── */
const CAT_META: Record<string, { color: string; icon: React.ElementType }> = {
  "Health":           { color: "#34d399", icon: HeartPulse },
  "Career":           { color: "#60a5fa", icon: Flame },
  "Education":        { color: "#a78bfa", icon: BookOpen },
  "Finance":          { color: "#fbbf24", icon: DollarSign },
  "Creative":         { color: "#f87171", icon: Palette },
  "Relationships":    { color: "#fb923c", icon: Users },
  "Personal Growth":  { color: "#22d3ee", icon: Sparkles },
};

function catMeta(cat: string) {
  return CAT_META[cat] ?? { color: "#22d3ee", icon: Sparkles };
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active", paused: "Paused", completed: "Completed", abandoned: "Abandoned",
};
const STATUS_COLOR: Record<string, string> = {
  active: "#22d3ee", paused: "#fbbf24", completed: "#34d399", abandoned: "#f87171",
};

interface GoalSummary {
  id: string; title: string; category: string; status: string;
  targetWeeks: number; steps: { id: string; status: string }[];
  todayTasks: number; completedToday: number; totalCompleted: number; totalTasks: number;
  createdAt: string;
}

export default function Goals() {
  const [createOpen, setCreateOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: goals = [], isLoading, error } = useQuery<GoalSummary[]>({
    queryKey: ["goals"],
    queryFn: () => fetch("/api/goals").then(r => r.json()),
  });

  const deleteGoal = async (id: string, title: string) => {
    if (!confirm(`Delete goal "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (res.ok) { qc.invalidateQueries({ queryKey: ["goals"] }); toast({ title: "Goal deleted" }); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-8 py-6 flex items-center justify-between"
        style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            My Goals
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your goals, daily tasks, and progress over time.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"
          style={{ background: "linear-gradient(135deg, hsl(192 70% 32%), hsl(210 70% 36%))", border: "none" }}>
          <Plus className="w-4 h-4" /> New Goal
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400/60" />
            <span className="text-sm">Loading your goals…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> Failed to load goals.
          </div>
        )}

        {!isLoading && !error && goals.length === 0 && (
          <div className="flex flex-col items-center justify-center h-72 gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(192 70% 18%), hsl(260 60% 22%))", boxShadow: "0 0 40px hsl(192 100% 48%/0.15)" }}>
              <Target className="w-10 h-10 text-cyan-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-lg">No goals yet</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                Every great achievement starts with a clear goal. Tell us what you want to accomplish and we'll create a personalised plan.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} size="lg" className="gap-2"
              style={{ background: "linear-gradient(135deg, hsl(192 70% 32%), hsl(260 60% 40%))", border: "none" }}>
              <Plus className="w-4 h-4" /> Set Your First Goal
            </Button>
          </div>
        )}

        {!isLoading && goals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {goals.map(goal => {
              const meta = catMeta(goal.category);
              const CatIcon = meta.icon;
              const completedSteps = goal.steps.filter(s => s.status === "completed").length;
              const totalSteps = goal.steps.length;
              const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
              const taskProgress = goal.todayTasks > 0
                ? Math.round((goal.completedToday / goal.todayTasks) * 100) : 0;

              return (
                <div key={goal.id} className="group rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg"
                  style={{
                    background: "hsl(var(--card))",
                    borderColor: `${meta.color}22`,
                    boxShadow: `0 0 0 1px ${meta.color}10`,
                  }}>
                  {/* Card top accent */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.color}44)` }} />

                  <div className="p-5 flex-1 flex flex-col gap-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
                          <CatIcon className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                        <div>
                          <p className="text-[11px] font-medium" style={{ color: meta.color }}>{goal.category}</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${STATUS_COLOR[goal.status]}20`, color: STATUS_COLOR[goal.status] }}>
                            {STATUS_LABEL[goal.status] ?? goal.status}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => deleteGoal(goal.id, goal.title)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{goal.title}</h3>

                    {/* Step progress */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground/60 mb-1.5">
                        <span>Steps: {completedSteps}/{totalSteps}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)` }} />
                      </div>
                    </div>

                    {/* Today's tasks */}
                    {goal.todayTasks > 0 && (
                      <div className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                        style={{ background: `${meta.color}0c`, border: `1px solid ${meta.color}18` }}>
                        <span className="text-muted-foreground">Today's tasks</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold" style={{ color: meta.color }}>
                            {goal.completedToday}/{goal.todayTasks}
                          </span>
                          {taskProgress === 100 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                      </div>
                    )}

                    {/* Weeks */}
                    <p className="text-[10px] text-muted-foreground/40">
                      {goal.targetWeeks} week plan · {goal.totalCompleted} tasks done total
                    </p>
                  </div>

                  {/* CTA */}
                  <Link href={`/goals/${goal.id}`}
                    className="flex items-center justify-between px-5 py-3 text-xs font-medium transition-all"
                    style={{ borderTop: `1px solid ${meta.color}14`, color: meta.color }}>
                    <span>View plan &amp; tasks</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GoalCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
