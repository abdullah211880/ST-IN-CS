import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Target, ChevronLeft, Loader2, AlertCircle, CheckCircle2,
  Circle, Clock, Sparkles, RefreshCw, BellRing, BellOff,
  ChevronDown, ChevronUp, Play, Pause, Flag, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/* ── types ─────────────────────────────────────────────── */
interface GoalStep {
  id: string; goalId: string; stepNumber: number; title: string;
  description: string; durationDays: number; status: string; taskPool: string[];
}
interface DailyTask {
  id: string; goalId: string; stepId: string | null; title: string;
  dueDate: string; completed: boolean; completedAt: string | null; reminderTime: string | null;
}
interface Goal {
  id: string; title: string; rawGoal: string; category: string;
  motivation: string; overview: string; status: string; targetWeeks: number;
  steps: GoalStep[]; tasks: DailyTask[]; createdAt: string;
}

/* ── category colors ────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  "Health": "#34d399", "Career": "#60a5fa", "Education": "#a78bfa",
  "Finance": "#fbbf24", "Creative": "#f87171", "Relationships": "#fb923c",
  "Personal Growth": "#22d3ee",
};
function catColor(cat: string) { return CAT_COLORS[cat] ?? "#22d3ee"; }

/* ── date helpers ───────────────────────────────────────── */
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function isOverdue(d: string) { return d < todayStr(); }
function isFuture(d: string)  { return d > todayStr(); }

/* ── reminder checker ───────────────────────────────────── */
function useReminders(tasks: DailyTask[]) {
  const firedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!("Notification" in window)) return;
    const check = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const timeStr = `${hh}:${mm}`;
      const today = todayStr();
      tasks.forEach(t => {
        if (t.completed || t.dueDate !== today || !t.reminderTime) return;
        if (t.reminderTime === timeStr && !firedRef.current.has(t.id)) {
          firedRef.current.add(t.id);
          if (Notification.permission === "granted") {
            new Notification("Goal Reminder 🎯", { body: t.title, icon: "/favicon.ico" });
          }
        }
      });
    };
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [tasks]);
}

/* ── task card ──────────────────────────────────────────── */
function TaskCard({ task, color, onToggle, onReminderChange }: {
  task: DailyTask; color: string;
  onToggle: (id: string) => void;
  onReminderChange: (id: string, time: string | null) => void;
}) {
  const [editingReminder, setEditingReminder] = useState(false);
  const [reminderVal, setReminderVal] = useState(task.reminderTime ?? "09:00");
  const overdue = isOverdue(task.dueDate) && !task.completed;
  const future  = isFuture(task.dueDate);

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${task.completed ? "opacity-60" : ""}`}
      style={{
        background: task.completed ? "hsl(var(--muted)/0.3)" : "hsl(var(--card))",
        borderColor: task.completed ? "hsl(var(--border)/0.4)" : overdue ? "#f87171 30" : `${color}22`,
      }}>
      {/* Checkbox */}
      <button onClick={() => onToggle(task.id)} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
        {task.completed
          ? <CheckCircle2 className="w-5 h-5" style={{ color }} />
          : <Circle className="w-5 h-5 text-muted-foreground/30" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${task.completed ? "line-through text-muted-foreground/50" : "text-foreground"}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[10px] flex items-center gap-1 ${overdue ? "text-red-400" : future ? "text-muted-foreground/40" : "text-muted-foreground/60"}`}>
            <Calendar className="w-3 h-3" />
            {fmtDate(task.dueDate)}
            {overdue && " · overdue"}
            {task.dueDate === todayStr() && " · today"}
          </span>
          {!task.completed && !future && (
            <>
              {editingReminder ? (
                <div className="flex items-center gap-1">
                  <input type="time" value={reminderVal} onChange={e => setReminderVal(e.target.value)}
                    className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 text-foreground w-24" />
                  <button onClick={() => { onReminderChange(task.id, reminderVal); setEditingReminder(false); }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">Set</button>
                  <button onClick={() => { onReminderChange(task.id, null); setEditingReminder(false); }}
                    className="text-[10px] text-muted-foreground/50 hover:text-foreground">Clear</button>
                </div>
              ) : (
                <button onClick={() => setEditingReminder(true)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors">
                  {task.reminderTime
                    ? <><BellRing className="w-3 h-3 text-amber-400" /><span className="text-amber-400/80">{task.reminderTime}</span></>
                    : <><BellOff className="w-3 h-3" />Remind me</>}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────── */
export default function GoalDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"today" | "all" | "upcoming">("today");

  const { data: goal, isLoading, error } = useQuery<Goal>({
    queryKey: ["goal", id],
    queryFn: () => fetch(`/api/goals/${id}`).then(r => r.json()),
    refetchInterval: false,
  });

  useReminders(goal?.tasks ?? []);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const toggleTask = useCallback(async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}/toggle`, { method: "PATCH" });
    qc.invalidateQueries({ queryKey: ["goal", id] });
    qc.invalidateQueries({ queryKey: ["goals"] });
  }, [id, qc]);

  const setReminder = useCallback(async (taskId: string, reminderTime: string | null) => {
    await fetch(`/api/tasks/${taskId}/reminder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderTime }),
    });
    qc.invalidateQueries({ queryKey: ["goal", id] });
    toast({ title: reminderTime ? `Reminder set for ${reminderTime}` : "Reminder cleared" });
  }, [id, qc, toast]);

  const generateMoreTasks = async (stepId?: string) => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/goals/${id}/tasks/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error); }
      const tasks = await res.json();
      qc.invalidateQueries({ queryKey: ["goal", id] });
      toast({ title: `${tasks.length} new daily tasks generated` });
    } catch (e: unknown) {
      toast({ title: "Failed to generate tasks", variant: "destructive", description: e instanceof Error ? e.message : "" });
    } finally { setGenerating(false); }
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/goals/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    qc.invalidateQueries({ queryKey: ["goal", id] });
    qc.invalidateQueries({ queryKey: ["goals"] });
    toast({ title: `Goal marked as ${status}` });
  };

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/goals/${id}/summary`);
      const data = await res.json();
      setSummaryText(data.summary ?? "");
    } finally { setSummaryLoading(false); }
  };

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin text-cyan-400/60" />
      <span className="text-sm">Loading goal…</span>
    </div>
  );

  if (error || !goal) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <AlertCircle className="w-8 h-8 text-destructive/60" />
      <p className="text-sm text-muted-foreground">Goal not found or failed to load.</p>
      <Link href="/goals"><Button variant="outline" size="sm" className="gap-1.5"><ChevronLeft className="w-3.5 h-3.5" />Back to Goals</Button></Link>
    </div>
  );

  const color = catColor(goal.category);
  const today = todayStr();
  const today_tasks  = goal.tasks.filter(t => t.dueDate === today);
  const all_tasks    = goal.tasks;
  const upcoming     = goal.tasks.filter(t => t.dueDate > today).slice(0, 14);
  const shownTasks   = activeFilter === "today" ? today_tasks : activeFilter === "upcoming" ? upcoming : all_tasks;

  const completedSteps = goal.steps.filter(s => s.status === "completed").length;
  const totalSteps = goal.steps.length;
  const totalTasks = goal.tasks.length;
  const doneTasks  = goal.tasks.filter(t => t.completed).length;
  const todayDone  = today_tasks.filter(t => t.completed).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 flex items-start gap-4"
        style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}>
        <Link href="/goals">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0 w-8 h-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
              {goal.category}
            </span>
            <span className="text-[10px] text-muted-foreground/40">{goal.targetWeeks} week plan</span>
          </div>
          <h1 className="text-lg font-bold text-foreground leading-snug">{goal.title}</h1>
        </div>
        {/* Status controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {goal.status === "active"
            ? <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10" onClick={() => updateStatus("paused")}>
                <Pause className="w-3 h-3" /> Pause
              </Button>
            : goal.status === "paused"
            ? <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10" onClick={() => updateStatus("active")}>
                <Play className="w-3 h-3" /> Resume
              </Button>
            : null}
          {goal.status !== "completed" &&
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10" onClick={() => updateStatus("completed")}>
              <Flag className="w-3 h-3" /> Complete
            </Button>}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: Steps + overview ── */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden border-r border-border/40">
          {/* Progress bar */}
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid hsl(var(--border)/0.4)" }}>
            <div className="flex justify-between text-[10px] text-muted-foreground/60 mb-1.5">
              <span>Overall Progress</span>
              <span>{doneTasks}/{totalTasks} tasks · {completedSteps}/{totalSteps} phases</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${totalTasks ? Math.round((doneTasks/totalTasks)*100) : 0}%`, background: `linear-gradient(90deg, ${color}, ${color}66)` }} />
            </div>
          </div>

          {/* Motivation */}
          <div className="px-4 py-3 shrink-0 text-xs text-muted-foreground/70 italic leading-relaxed"
            style={{ borderBottom: "1px solid hsl(var(--border)/0.4)", background: `${color}06` }}>
            "{goal.motivation}"
          </div>

          {/* Overview */}
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid hsl(var(--border)/0.4)" }}>
            <button onClick={() => setOverviewExpanded(e => !e)}
              className="flex items-center justify-between w-full text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest hover:text-foreground transition-colors">
              Coach's Overview
              {overviewExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {overviewExpanded && <p className="text-xs text-muted-foreground leading-relaxed mt-2">{goal.overview}</p>}
          </div>

          {/* Steps timeline */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ scrollbarWidth: "thin" }}>
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-3">Your Roadmap</p>
            {goal.steps.map((step, i) => {
              const isActive = step.status === "active";
              const isDone   = step.status === "completed";
              return (
                <div key={step.id} className="flex gap-2.5">
                  {/* Connector */}
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                      style={{
                        background: isDone ? color : isActive ? `${color}33` : "hsl(var(--muted))",
                        border: `1.5px solid ${isDone || isActive ? color : "hsl(var(--border))"}`,
                        color: isDone ? "#fff" : isActive ? color : "hsl(var(--muted-foreground))",
                      }}>
                      {isDone ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                    </div>
                    {i < goal.steps.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: isDone ? color : "hsl(var(--border))", minHeight: 12 }} />}
                  </div>
                  {/* Step card */}
                  <div className="flex-1 pb-2">
                    <div className="rounded-lg border p-2.5 transition-all"
                      style={{
                        background: isActive ? `${color}0c` : "hsl(var(--card))",
                        borderColor: isActive ? `${color}30` : "hsl(var(--border)/0.6)",
                      }}>
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-foreground leading-snug">{step.title}</p>
                        {isActive && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${color}25`, color }}>Active</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 leading-relaxed line-clamp-2">{step.description}</p>
                      <p className="text-[9px] text-muted-foreground/35 mt-1">{step.durationDays} days · {step.taskPool.length} task types</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress summary */}
          <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid hsl(var(--border)/0.4)" }}>
            {summaryText ? (
              <div className="rounded-xl p-3 text-xs text-muted-foreground leading-relaxed"
                style={{ background: `${color}0a`, border: `1px solid ${color}18` }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color }}>AI Progress Summary</p>
                {summaryText}
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8" onClick={loadSummary} disabled={summaryLoading}>
                {summaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {summaryLoading ? "Generating…" : "Get Progress Summary"}
              </Button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Daily tasks ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tasks header */}
          <div className="shrink-0 px-5 py-3 flex items-center justify-between gap-3"
            style={{ borderBottom: "1px solid hsl(var(--border)/0.4)" }}>
            <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "hsl(var(--muted))" }}>
              {(["today", "upcoming", "all"] as const).map(f => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className="px-3 py-1 rounded-md text-xs font-medium capitalize transition-all"
                  style={{
                    background: activeFilter === f ? "hsl(var(--card))" : "transparent",
                    color: activeFilter === f ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    boxShadow: activeFilter === f ? "0 1px 3px hsl(0 0% 0%/0.1)" : "none",
                  }}>
                  {f === "today" ? `Today (${today_tasks.length})` : f === "upcoming" ? "Upcoming" : "All"}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 shrink-0" onClick={() => generateMoreTasks()} disabled={generating}>
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {generating ? "Generating…" : "Load more tasks"}
            </Button>
          </div>

          {/* Today's stats strip */}
          {activeFilter === "today" && today_tasks.length > 0 && (
            <div className="shrink-0 px-5 py-2.5 flex items-center gap-4"
              style={{ borderBottom: "1px solid hsl(var(--border)/0.3)", background: `${color}06` }}>
              <div>
                <p className="text-xs font-semibold text-foreground">{todayDone}/{today_tasks.length} done today</p>
                <div className="h-1 w-32 rounded-full bg-muted mt-1 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${today_tasks.length ? (todayDone/today_tasks.length)*100 : 0}%`, background: color }} />
                </div>
              </div>
              {todayDone === today_tasks.length && today_tasks.length > 0 && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All done for today! 🎉
                </div>
              )}
            </div>
          )}

          {/* Tasks list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" style={{ scrollbarWidth: "thin" }}>
            {shownTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground/50">
                {activeFilter === "today"
                  ? <>
                      <Clock className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No tasks for today yet.</p>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => generateMoreTasks()} disabled={generating}>
                        {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Generate today's tasks
                      </Button>
                    </>
                  : <>
                      <Target className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No tasks found.</p>
                    </>}
              </div>
            )}
            {shownTasks.map(task => (
              <TaskCard key={task.id} task={task} color={color} onToggle={toggleTask} onReminderChange={setReminder} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
