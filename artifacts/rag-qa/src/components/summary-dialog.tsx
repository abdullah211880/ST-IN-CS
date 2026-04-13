import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, FileText, AlertCircle, RotateCw, BookOpen,
  Tag, CheckCircle2, Clock, AlignLeft, Hash,
} from "lucide-react";

/* ── types ────────────────────────────────────────────────── */
interface Summary {
  documentId: string;
  filename: string;
  totalChars: number;
  overview: string;
  keyPoints: string[];
  entities: string[];
  documentType: string;
  wordCount: number;
  readingTimeMinutes: number;
}

type Status = "loading" | "ready" | "error";

/* ── helpers ──────────────────────────────────────────────── */
const DOC_TYPE_COLOR: Record<string, string> = {
  contract:      "bg-blue-500/15 text-blue-300 border-blue-500/30",
  policy:        "bg-violet-500/15 text-violet-300 border-violet-500/30",
  report:        "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  agreement:     "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  article:       "bg-amber-500/15 text-amber-300 border-amber-500/30",
  manual:        "bg-orange-500/15 text-orange-300 border-orange-500/30",
  specification: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  other:         "bg-muted/40 text-muted-foreground border-border",
};

function typeClass(t: string) {
  return DOC_TYPE_COLOR[t] ?? DOC_TYPE_COLOR.other;
}

/* ── stat pill ────────────────────────────────────────────── */
function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/20">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  );
}

/* ── props ────────────────────────────────────────────────── */
interface SummaryDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  documentId: string;
  filename: string;
}

/* ── component ────────────────────────────────────────────── */
export function SummaryDialog({ open, onOpenChange, documentId, filename }: SummaryDialogProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setStatus("loading");
    setError(null);
    setSummary(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/summary`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }
      const data: Summary = await res.json();
      setSummary(data);
      setStatus("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate summary.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (open) fetchSummary();
  }, [open, documentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlignLeft className="w-4 h-4 text-emerald-400" />
            Document Summary
          </DialogTitle>
          <DialogDescription className="truncate text-xs">
            {filename}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-5 pr-1">

          {/* Loading */}
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-14">
              <div className="relative">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
                <FileText className="w-4 h-4 text-cyan-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Summarizing document…</p>
                <p className="text-xs text-muted-foreground mt-1">AI is reading and extracting key information</p>
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
              <Button variant="outline" size="sm" onClick={fetchSummary}>
                <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
              </Button>
            </div>
          )}

          {/* Ready */}
          {status === "ready" && summary && (
            <>
              {/* Header row: type badge + stats */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={`capitalize font-semibold text-xs px-2.5 py-1 ${typeClass(summary.documentType)}`}
                >
                  {summary.documentType}
                </Badge>
                <div className="flex flex-wrap gap-2 ml-auto">
                  <StatPill
                    icon={<Hash className="w-3.5 h-3.5" />}
                    label="Words"
                    value={summary.wordCount?.toLocaleString() ?? "—"}
                  />
                  <StatPill
                    icon={<Clock className="w-3.5 h-3.5" />}
                    label="Read time"
                    value={`~${summary.readingTimeMinutes ?? 1} min`}
                  />
                  <StatPill
                    icon={<BookOpen className="w-3.5 h-3.5" />}
                    label="Characters"
                    value={summary.totalChars?.toLocaleString() ?? "—"}
                  />
                </div>
              </div>

              {/* Overview */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" /> Overview
                </h3>
                <p className="text-sm text-foreground leading-relaxed bg-muted/20 rounded-xl px-4 py-3 border border-border/40">
                  {summary.overview}
                </p>
              </section>

              {/* Key Points */}
              {summary.keyPoints?.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Key Points
                  </h3>
                  <ul className="space-y-2">
                    {summary.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                        <span
                          className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                          style={{
                            background: `hsl(${160 + i * 22} 70% 55%)`,
                            boxShadow: `0 0 5px hsl(${160 + i * 22} 70% 55% / 0.5)`,
                          }}
                        />
                        <span className="leading-snug">{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Entities */}
              {summary.entities?.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Key Entities & Terms
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {summary.entities.map((entity, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                        style={{
                          borderColor: `hsl(${180 + i * 28} 60% 50% / 0.3)`,
                          background: `hsl(${180 + i * 28} 60% 50% / 0.08)`,
                          color: `hsl(${180 + i * 28} 70% 70%)`,
                        }}
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {status === "ready" && (
          <div className="shrink-0 pt-3 border-t border-border/40 flex justify-end">
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={fetchSummary}>
              <RotateCw className="w-3 h-3" /> Regenerate
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
