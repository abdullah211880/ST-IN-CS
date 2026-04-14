import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb, Send, ThumbsUp, Loader2, CheckCircle2,
  AlertCircle, Flame, Puzzle, Bug, Zap, LayoutList,
} from "lucide-react";

/* ── types ─────────────────────────────────────────────────── */
interface Suggestion {
  id: string; title: string; category: string; description: string;
  status: string; votes: number; createdAt: string;
}

/* ── category meta ──────────────────────────────────────────── */
const CATEGORIES = [
  { value: "Feature",     label: "New Feature",    icon: Zap,     color: "#22d3ee" },
  { value: "Integration", label: "Integration",    icon: Puzzle,  color: "#a78bfa" },
  { value: "Improvement", label: "Improvement",    icon: Flame,   color: "#fbbf24" },
  { value: "Bug Report",  label: "Bug Report",     icon: Bug,     color: "#f87171" },
];

function catMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[0];
}

const STATUS_COLORS: Record<string, string> = {
  pending:  "#64748b",
  reviewed: "#fbbf24",
  planned:  "#22d3ee",
  shipped:  "#34d399",
};
const STATUS_LABELS: Record<string, string> = {
  pending:  "Submitted",
  reviewed: "Reviewed",
  planned:  "Planned",
  shipped:  "Shipped",
};

/* ── vote button ─────────────────────────────────────────────── */
function VoteBtn({ suggestion, onVoted }: { suggestion: Suggestion; onVoted: (s: Suggestion) => void }) {
  const [voting, setVoting] = useState(false);
  const [voted,  setVoted]  = useState(false);
  const handle = async () => {
    if (voting || voted) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/suggestions/${suggestion.id}/vote`, { method: "POST" });
      if (res.ok) { const updated = await res.json(); onVoted(updated); setVoted(true); }
    } finally { setVoting(false); }
  };
  return (
    <button
      onClick={handle}
      disabled={voting || voted}
      className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-lg border transition-all"
      style={{
        background:   voted ? "hsl(192 60% 20%/0.4)" : "hsl(228 50% 8%)",
        borderColor:  voted ? "hsl(192 60% 40%/0.5)" : "hsl(228 40% 18%)",
        color:        voted ? "#22d3ee" : "#64748b",
        minWidth: 44,
      }}
    >
      {voting
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <ThumbsUp className="w-3.5 h-3.5" />}
      <span className="text-[10px] font-semibold leading-none">{suggestion.votes}</span>
    </button>
  );
}

/* ── community board ─────────────────────────────────────────── */
function CommunityBoard() {
  const [items,   setItems]   = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/suggestions");
      if (!res.ok) throw new Error("Failed to load suggestions.");
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading ideas.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onVoted = (updated: Suggestion) =>
    setItems(prev => prev.map(s => s.id === updated.id ? updated : s).sort((a, b) => b.votes - a.votes));

  const shown = filter === "all" ? items : items.filter(i => i.category === filter);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin text-cyan-400/60" />
      <p className="text-xs">Loading community ideas…</p>
    </div>
  );
  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-destructive text-sm">
      <AlertCircle className="w-5 h-5" />{error}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden">
      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        {[{ value: "all", label: "All" }, ...CATEGORIES.map(c => ({ value: c.value, label: c.label }))].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border"
            style={{
              background:  filter === f.value ? "hsl(192 70% 20%/0.5)" : "hsl(228 50% 8%)",
              borderColor: filter === f.value ? "hsl(192 60% 40%/0.5)" : "hsl(228 40% 16%)",
              color:       filter === f.value ? "#22d3ee" : "#64748b",
            }}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground/40">{shown.length} idea{shown.length !== 1 ? "s" : ""}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(228 40% 18%) transparent" }}>
        {shown.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground/50">
            <LayoutList className="w-8 h-8 opacity-30" />
            <p className="text-xs">No ideas yet{filter !== "all" ? " in this category" : ""}. Be the first!</p>
          </div>
        )}
        {shown.map(s => {
          const meta = catMeta(s.category);
          const CatIcon = meta.icon;
          return (
            <div key={s.id}
              className="flex gap-3 p-3 rounded-xl border"
              style={{ background: "hsl(228 50% 5%)", borderColor: "hsl(228 40% 14%)" }}>
              {/* Vote */}
              <VoteBtn suggestion={s} onVoted={onVoted} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{s.title}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: `${STATUS_COLORS[s.status]}22`, color: STATUS_COLORS[s.status] }}>
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-2 mb-1.5">{s.description}</p>
                <div className="flex items-center gap-1.5">
                  <CatIcon className="w-3 h-3 shrink-0" style={{ color: meta.color }} />
                  <span className="text-[10px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground/35">·</span>
                  <span className="text-[10px] text-muted-foreground/40">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── submit form ─────────────────────────────────────────────── */
function SubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [title,       setTitle]       = useState("");
  const [category,    setCategory]    = useState("Feature");
  const [description, setDescription] = useState("");
  const [email,       setEmail]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [done,        setDone]        = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Please fill in the title and description."); return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, description, email: email || undefined }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || "Submission failed."); }
      setDone(true);
      setTimeout(onSuccess, 1800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed.");
    } finally { setSubmitting(false); }
  };

  if (done) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
      <div className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "hsl(160 60% 20%/0.5)", border: "1px solid hsl(160 60% 40%/0.4)" }}>
        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">Idea submitted!</p>
        <p className="text-xs text-muted-foreground mt-1">Thanks for helping shape the system.</p>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="flex-1 flex flex-col gap-4">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Title <span className="text-destructive">*</span></label>
        <Input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Summarize your idea in a few words…"
          className="bg-card border-border text-sm h-9" maxLength={120} />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-card border-border h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>
                <div className="flex items-center gap-2">
                  <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                  {c.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5 flex-1">
        <label className="text-xs font-medium text-muted-foreground">Description <span className="text-destructive">*</span></label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe your idea in detail — what problem it solves, how it would work, who benefits…"
          className="bg-card border-border text-sm resize-none h-28" maxLength={1000} />
        <p className="text-[10px] text-muted-foreground/40 text-right">{description.length}/1000</p>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Email <span className="text-muted-foreground/40 font-normal">(optional — for follow-up)</span></label>
        <Input value={email} onChange={e => setEmail(e.target.value)}
          type="email" placeholder="you@company.com"
          className="bg-card border-border text-sm h-9" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      <Button type="submit" disabled={submitting} className="gap-2 h-9"
        style={{ background: "linear-gradient(135deg, hsl(192 70% 32%), hsl(210 70% 36%))", border: "none" }}>
        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        {submitting ? "Submitting…" : "Submit Idea"}
      </Button>
    </form>
  );
}

/* ── main dialog ─────────────────────────────────────────────── */
interface SuggestFeatureDialogProps {
  open: boolean; onOpenChange: (o: boolean) => void;
}

export function SuggestFeatureDialog({ open, onOpenChange }: SuggestFeatureDialogProps) {
  const [tab, setTab] = useState<"submit" | "board">("submit");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-0 bg-card border-border flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}>

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(38 90% 36%), hsl(30 80% 32%))",
                  boxShadow: "0 0 12px hsl(38 100% 50%/0.3)",
                }}>
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              Suggest a Feature
            </DialogTitle>
            <DialogDescription className="text-xs mt-1">
              Shape the roadmap — share ideas, integrations, or improvements you'd like to see.
            </DialogDescription>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex mt-4 gap-0 rounded-lg p-0.5 text-sm"
            style={{ background: "hsl(228 50% 6%)", border: "1px solid hsl(228 40% 14%)" }}>
            {([["submit", "Submit Idea"], ["board", "Community Board"]] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-1.5 rounded-md font-medium text-xs transition-all"
                style={{
                  background: tab === t ? "hsl(228 50% 14%)" : "transparent",
                  color:      tab === t ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  boxShadow:  tab === t ? "0 1px 4px hsl(0 0% 0%/0.3)" : "none",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
          {tab === "submit"
            ? <SubmitForm onSuccess={() => setTab("board")} />
            : <CommunityBoard />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
