import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, FileText, AlertCircle, RotateCw, BookOpen,
  Tag, CheckCircle2, Clock, AlignLeft, Hash, Download,
  Users, TrendingUp, CalendarDays, ShieldAlert, Lightbulb,
  Layers, BarChart2, Smile, Meh, Frown, GitMerge,
} from "lucide-react";

/* ── types ────────────────────────────────────────────────── */
interface Summary {
  documentId: string;
  filename: string;
  totalChars: number;
  overview: string;
  executiveSummary: string;
  keyPoints: string[];
  mainTopics: string[];
  targetAudience: string;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  criticalDates: string[];
  recommendations: string[];
  riskFactors: string[];
  entities: string[];
  documentType: string;
  complexity: "basic" | "intermediate" | "advanced" | "expert";
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
const COMPLEXITY_COLOR: Record<string, string> = {
  basic:        "bg-green-500/15 text-green-300 border-green-500/30",
  intermediate: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  advanced:     "bg-orange-500/15 text-orange-300 border-orange-500/30",
  expert:       "bg-red-500/15 text-red-300 border-red-500/30",
};
const SENTIMENT_ICON: Record<string, React.ReactNode> = {
  positive: <Smile className="w-3.5 h-3.5 text-green-400" />,
  neutral:  <Meh  className="w-3.5 h-3.5 text-yellow-400" />,
  negative: <Frown className="w-3.5 h-3.5 text-red-400" />,
  mixed:    <GitMerge className="w-3.5 h-3.5 text-blue-400" />,
};

function typeClass(t: string) { return DOC_TYPE_COLOR[t] ?? DOC_TYPE_COLOR.other; }
function complexityClass(c: string) { return COMPLEXITY_COLOR[c] ?? COMPLEXITY_COLOR.intermediate; }

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

/* ── section heading ──────────────────────────────────────── */
function SectionHead({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
      {icon} {label}
    </h3>
  );
}

/* ── bullet list ──────────────────────────────────────────── */
function BulletList({ items, hueStart = 160, hueStep = 22 }: { items: string[]; hueStart?: number; hueStep?: number }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
          <span
            className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
            style={{
              background: `hsl(${hueStart + i * hueStep} 70% 55%)`,
              boxShadow: `0 0 5px hsl(${hueStart + i * hueStep} 70% 55% / 0.5)`,
            }}
          />
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── PDF export ───────────────────────────────────────────── */
function exportToPdf(s: Summary) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const section = (title: string, content: string) =>
    content ? `<div class="section"><h2>${title}</h2>${content}</div>` : "";

  const ul = (items: string[], color = "#22d3ee") =>
    items.length
      ? `<ul>${items.map(i => `<li><span class="dot" style="background:${color}"></span>${i}</li>`).join("")}</ul>`
      : "";

  const tags = (items: string[]) =>
    items.length
      ? `<div class="tags">${items.map(i => `<span class="tag">${i}</span>`).join("")}</div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Summary – ${s.filename}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.6;color:#1a1a2e;background:#fff;padding:40px 48px}
  .header{border-bottom:3px solid #0ea5e9;padding-bottom:18px;margin-bottom:24px}
  .header h1{font-size:20px;font-weight:700;color:#0c1a3a;margin-bottom:4px;word-break:break-word}
  .header .meta{font-size:11px;color:#64748b;margin-top:6px}
  .badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;border:1px solid #cbd5e1;background:#f1f5f9;color:#334155}
  .badge.type{background:#e0f2fe;color:#0369a1;border-color:#7dd3fc}
  .badge.complexity{background:#fef9c3;color:#713f12;border-color:#fde68a}
  .badge.sentiment{background:#f0fdf4;color:#15803d;border-color:#86efac}
  .stats{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
  .stat{padding:10px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;min-width:100px}
  .stat .label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .stat .value{font-size:16px;font-weight:700;color:#1e293b}
  .section{margin-bottom:22px}
  .section h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #e2e8f0}
  .section p{font-size:13px;color:#1e293b;line-height:1.7;background:#f8fafc;border-left:3px solid #0ea5e9;padding:10px 14px;border-radius:0 6px 6px 0}
  ul{list-style:none;padding:0}
  ul li{display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-size:13px;color:#1e293b;border-bottom:1px solid #f1f5f9}
  ul li:last-child{border-bottom:none}
  .dot{display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  .tag{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd}
  .warn-section h2{color:#b45309}
  .warn-section ul li{background:#fffbeb}
  .risk-section h2{color:#dc2626}
  .risk-section ul li{background:#fff5f5}
  .rec-section h2{color:#059669}
  .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
  @media print{body{padding:24px 32px}}
</style>
</head>
<body>
<div class="header">
  <div class="meta">RAG Engine · Document Summary Report · ${date}</div>
  <h1>${s.filename}</h1>
  <div class="badges">
    <span class="badge type">${s.documentType}</span>
    <span class="badge complexity">Complexity: ${s.complexity}</span>
    <span class="badge sentiment">Tone: ${s.sentiment}</span>
  </div>
</div>

<div class="stats">
  <div class="stat"><div class="label">Words</div><div class="value">${s.wordCount?.toLocaleString() ?? "—"}</div></div>
  <div class="stat"><div class="label">Characters</div><div class="value">${s.totalChars?.toLocaleString() ?? "—"}</div></div>
  <div class="stat"><div class="label">Reading Time</div><div class="value">~${s.readingTimeMinutes ?? 1} min</div></div>
  ${s.targetAudience ? `<div class="stat" style="flex:1;min-width:200px"><div class="label">Target Audience</div><div class="value" style="font-size:12px">${s.targetAudience}</div></div>` : ""}
</div>

${section("Overview", `<p>${s.overview}</p>`)}
${s.executiveSummary ? section("Executive Summary", `<p>${s.executiveSummary}</p>`) : ""}
${s.mainTopics?.length ? section("Main Topics Covered", tags(s.mainTopics)) : ""}
${s.keyPoints?.length ? section("Key Points", ul(s.keyPoints, "#0ea5e9")) : ""}
${s.criticalDates?.length ? `<div class="section warn-section">${`<h2>Critical Dates &amp; Deadlines</h2>` + ul(s.criticalDates, "#f59e0b")}</div>` : ""}
${s.recommendations?.length ? `<div class="section rec-section">${`<h2>Recommendations &amp; Actions</h2>` + ul(s.recommendations, "#10b981")}</div>` : ""}
${s.riskFactors?.length ? `<div class="section risk-section">${`<h2>Risk Factors &amp; Concerns</h2>` + ul(s.riskFactors, "#ef4444")}</div>` : ""}
${s.entities?.length ? section("Key Entities &amp; Terms", tags(s.entities)) : ""}

<div class="footer">
  <span>Generated by RAG Engine · Document Intelligence Platform</span>
  <span>${date}</span>
</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
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

  useEffect(() => { if (open) fetchSummary(); }, [open, documentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] bg-card border-border max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlignLeft className="w-4 h-4 text-emerald-400" />
            Document Summary
          </DialogTitle>
          <DialogDescription className="truncate text-xs">{filename}</DialogDescription>
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
                <p className="text-sm font-medium text-foreground">Analysing document…</p>
                <p className="text-xs text-muted-foreground mt-1">AI is extracting detailed insights</p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex items-start gap-2 w-full px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
              </div>
              <Button variant="outline" size="sm" onClick={fetchSummary}>
                <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
              </Button>
            </div>
          )}

          {/* Ready */}
          {status === "ready" && summary && (
            <>
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`capitalize font-semibold text-xs px-2.5 py-1 ${typeClass(summary.documentType)}`}>
                  {summary.documentType}
                </Badge>
                <Badge variant="outline" className={`capitalize font-semibold text-xs px-2.5 py-1 ${complexityClass(summary.complexity)}`}>
                  {summary.complexity}
                </Badge>
                {summary.sentiment && (
                  <Badge variant="outline" className="capitalize font-semibold text-xs px-2.5 py-1 flex items-center gap-1.5 bg-muted/30 border-border/60">
                    {SENTIMENT_ICON[summary.sentiment]}
                    {summary.sentiment} tone
                  </Badge>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatPill icon={<Hash className="w-3.5 h-3.5" />} label="Words" value={summary.wordCount?.toLocaleString() ?? "—"} />
                <StatPill icon={<Clock className="w-3.5 h-3.5" />} label="Read time" value={`~${summary.readingTimeMinutes ?? 1} min`} />
                <StatPill icon={<BookOpen className="w-3.5 h-3.5" />} label="Characters" value={summary.totalChars?.toLocaleString() ?? "—"} />
                <StatPill icon={<BarChart2 className="w-3.5 h-3.5" />} label="Complexity" value={summary.complexity ?? "—"} />
              </div>

              {/* Target audience */}
              {summary.targetAudience && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-border/40 bg-muted/15">
                  <Users className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Target Audience</p>
                    <p className="text-sm text-foreground">{summary.targetAudience}</p>
                  </div>
                </div>
              )}

              {/* Overview */}
              <section>
                <SectionHead icon={<AlignLeft className="w-3.5 h-3.5" />} label="Overview" />
                <p className="text-sm text-foreground leading-relaxed bg-muted/20 rounded-xl px-4 py-3 border border-border/40">
                  {summary.overview}
                </p>
              </section>

              {/* Executive Summary */}
              {summary.executiveSummary && (
                <section>
                  <SectionHead icon={<TrendingUp className="w-3.5 h-3.5" />} label="Executive Summary" />
                  <p className="text-sm text-foreground leading-relaxed bg-muted/20 rounded-xl px-4 py-3 border border-cyan-500/20">
                    {summary.executiveSummary}
                  </p>
                </section>
              )}

              {/* Main Topics */}
              {summary.mainTopics?.length > 0 && (
                <section>
                  <SectionHead icon={<Layers className="w-3.5 h-3.5" />} label="Main Topics Covered" />
                  <div className="flex flex-wrap gap-2">
                    {summary.mainTopics.map((topic, i) => (
                      <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border"
                        style={{
                          borderColor: `hsl(${200 + i * 30} 60% 50% / 0.3)`,
                          background: `hsl(${200 + i * 30} 60% 50% / 0.1)`,
                          color: `hsl(${200 + i * 30} 80% 72%)`,
                        }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Key Points */}
              {summary.keyPoints?.length > 0 && (
                <section>
                  <SectionHead icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Key Points" />
                  <BulletList items={summary.keyPoints} hueStart={160} hueStep={18} />
                </section>
              )}

              {/* Critical Dates */}
              {summary.criticalDates?.length > 0 && (
                <section>
                  <SectionHead icon={<CalendarDays className="w-3.5 h-3.5 text-amber-400" />} label="Critical Dates & Deadlines" />
                  <div className="space-y-2">
                    {summary.criticalDates.map((d, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground border border-amber-500/20 bg-amber-500/5">
                        <CalendarDays className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        {d}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recommendations */}
              {summary.recommendations?.length > 0 && (
                <section>
                  <SectionHead icon={<Lightbulb className="w-3.5 h-3.5 text-emerald-400" />} label="Recommendations & Actions" />
                  <BulletList items={summary.recommendations} hueStart={140} hueStep={15} />
                </section>
              )}

              {/* Risk Factors */}
              {summary.riskFactors?.length > 0 && (
                <section>
                  <SectionHead icon={<ShieldAlert className="w-3.5 h-3.5 text-red-400" />} label="Risk Factors & Concerns" />
                  <div className="space-y-2">
                    {summary.riskFactors.map((r, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground border border-red-500/20 bg-red-500/5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        {r}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Entities */}
              {summary.entities?.length > 0 && (
                <section>
                  <SectionHead icon={<Tag className="w-3.5 h-3.5" />} label="Key Entities & Terms" />
                  <div className="flex flex-wrap gap-2">
                    {summary.entities.map((entity, i) => (
                      <span key={i}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                        style={{
                          borderColor: `hsl(${180 + i * 28} 60% 50% / 0.3)`,
                          background: `hsl(${180 + i * 28} 60% 50% / 0.08)`,
                          color: `hsl(${180 + i * 28} 70% 70%)`,
                        }}>
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
        {status === "ready" && summary && (
          <div className="shrink-0 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => exportToPdf(summary)}
              style={{
                background: "linear-gradient(135deg, hsl(192 80% 28%), hsl(210 80% 32%))",
                boxShadow: "0 0 12px hsl(192 100% 48%/0.25)",
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={fetchSummary}>
              <RotateCw className="w-3 h-3" /> Regenerate
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
