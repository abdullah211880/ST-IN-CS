import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, AlertCircle, ArrowRight, RotateCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedQuestionsProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  documentId: string;
  filename: string;
}

type Status = "loading" | "ready" | "error";

const QUESTION_COLORS = [
  { border: "border-cyan-500/20", bg: "hover:bg-cyan-500/6", dot: "bg-cyan-400", num: "text-cyan-400" },
  { border: "border-violet-500/20", bg: "hover:bg-violet-500/6", dot: "bg-violet-400", num: "text-violet-400" },
  { border: "border-emerald-500/20", bg: "hover:bg-emerald-500/6", dot: "bg-emerald-400", num: "text-emerald-400" },
  { border: "border-amber-500/20", bg: "hover:bg-amber-500/6", dot: "bg-amber-400", num: "text-amber-400" },
  { border: "border-pink-500/20", bg: "hover:bg-pink-500/6", dot: "bg-pink-400", num: "text-pink-400" },
  { border: "border-blue-500/20", bg: "hover:bg-blue-500/6", dot: "bg-blue-400", num: "text-blue-400" },
  { border: "border-orange-500/20", bg: "hover:bg-orange-500/6", dot: "bg-orange-400", num: "text-orange-400" },
  { border: "border-teal-500/20", bg: "hover:bg-teal-500/6", dot: "bg-teal-400", num: "text-teal-400" },
];

export function SuggestedQuestionsDialog({ open, onOpenChange, documentId, filename }: SuggestedQuestionsProps) {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [launchingIdx, setLaunchingIdx] = useState<number | null>(null);

  const fetchQuestions = async () => {
    setStatus("loading");
    setError(null);
    setQuestions([]);
    try {
      const res = await fetch(`/api/documents/${documentId}/suggest-questions`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No questions were generated. Please try again.");
      }
      setQuestions(data.questions);
      setStatus("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate questions.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (open) fetchQuestions();
  }, [open, documentId]);

  const askQuestion = async (question: string, idx: number) => {
    setLaunchingIdx(idx);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${filename.replace(/\.[^.]+$/, "")} — Questions`,
          documentIds: [documentId],
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const session = await res.json();
      onOpenChange(false);
      setLocation(`/sessions/${session.id}?autoask=${encodeURIComponent(question)}`);
    } catch {
      setLaunchingIdx(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] bg-card border-border max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Suggested Questions
          </DialogTitle>
          <DialogDescription className="truncate text-xs">
            AI-generated questions for: <span className="text-foreground font-medium">{filename}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
          {/* Loading */}
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="relative">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
                <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Analyzing document…</p>
                <p className="text-xs text-muted-foreground mt-1">AI is reading your document and crafting insightful questions</p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex items-start gap-2 w-full px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
              <Button variant="outline" size="sm" onClick={fetchQuestions}>
                <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
              </Button>
            </div>
          )}

          {/* Questions */}
          {status === "ready" && questions.map((q, i) => {
            const color = QUESTION_COLORS[i % QUESTION_COLORS.length];
            const isLaunching = launchingIdx === i;
            return (
              <div
                key={i}
                className={cn(
                  "group flex items-start gap-3 p-3.5 rounded-xl border bg-muted/20 transition-all duration-150",
                  color.border, color.bg,
                  launchingIdx !== null && launchingIdx !== i && "opacity-50"
                )}
              >
                {/* Number badge */}
                <div className={cn("shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5", color.num)}
                  style={{ background: "hsl(var(--muted)/0.4)" }}>
                  {i + 1}
                </div>

                {/* Question text */}
                <p className="flex-1 text-sm text-foreground leading-snug">{q}</p>

                {/* Ask button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 px-2.5 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                  disabled={launchingIdx !== null}
                  onClick={() => askQuestion(q, i)}
                >
                  {isLaunching ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>Ask <ArrowRight className="w-3 h-3" /></>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {status === "ready" && (
          <div className="shrink-0 pt-3 border-t border-border/40 flex items-center justify-between">
            <p className="text-xs text-muted-foreground/60">Click "Ask →" on any question to open it in a new session</p>
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={fetchQuestions}>
              <RotateCw className="w-3 h-3" /> Regenerate
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
