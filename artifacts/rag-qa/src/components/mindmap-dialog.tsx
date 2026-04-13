import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2, AlertCircle, RotateCw, Download,
  ZoomIn, ZoomOut, Maximize2, Network,
} from "lucide-react";

/* ── types ────────────────────────────────────────────────── */
interface Subtopic  { label: string; detail?: string; }
interface Branch    { id: string; topic: string; subtopics: Subtopic[]; }
interface MindMapData { centralTopic: string; branches: Branch[]; filename: string; }

/* ── palette ──────────────────────────────────────────────── */
const COLORS = [
  "#22d3ee","#a78bfa","#34d399","#fbbf24",
  "#f87171","#60a5fa","#e879f9","#fb923c",
];

/* ── layout constants ─────────────────────────────────────── */
const VW = 1400, VH = 840;
const CX = VW / 2, CY = VH / 2;
const BRANCH_R  = 240;   // center → branch node distance
const SUB_EXTRA = 185;   // branch node → subtopic node distance
const SUB_SPREAD = 0.22; // radians between adjacent subtopics

/* ── geometry helpers ─────────────────────────────────────── */
function radialPos(angle: number, r: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function cubicPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  return `M${x1},${y1} C${x1 + dx * 0.45},${y1 + dy * 0.1} ${x1 + dx * 0.55},${y1 + dy * 0.9} ${x2},${y2}`;
}

interface ComputedBranch extends Branch {
  color: string; angle: number; x: number; y: number;
  subs: (Subtopic & { x: number; y: number; angle: number })[];
}

function computeLayout(map: MindMapData): ComputedBranch[] {
  const n = map.branches.length;
  const step = (2 * Math.PI) / n;
  const start = -Math.PI / 2;
  return map.branches.map((branch, i) => {
    const angle = start + i * step;
    const { x: bx, y: by } = radialPos(angle, BRANCH_R);
    const subs = branch.subtopics.map((sub, j) => {
      const m = branch.subtopics.length;
      const sa = angle + (j - (m - 1) / 2) * SUB_SPREAD;
      const { x: sx, y: sy } = radialPos(sa, BRANCH_R + SUB_EXTRA);
      return { ...sub, x: sx, y: sy, angle: sa };
    });
    return { ...branch, color: COLORS[i % COLORS.length], angle, x: bx, y: by, subs };
  });
}

/* ── SVG download ─────────────────────────────────────────── */
function downloadSvg(svgEl: SVGSVGElement, filename: string) {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  // Reset transform for clean export
  const g = clone.querySelector("[data-pan]") as SVGGElement | null;
  if (g) g.setAttribute("transform", "translate(0,0) scale(1)");
  const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename.replace(/\.[^.]+$/, "")}-mindmap.svg`;
  a.click();
}

/* ── node components (pure SVG) ──────────────────────────── */
function CenterNode({ label, animate }: { label: string; animate: boolean }) {
  return (
    <g style={{ opacity: animate ? 1 : 0, transition: "opacity 0.5s ease" }}>
      <defs>
        <radialGradient id="cg" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0e7490" stopOpacity="0.15" />
        </radialGradient>
        <filter id="cglow">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* glow halo */}
      <ellipse cx={CX} cy={CY} rx={112} ry={52} fill="#22d3ee" opacity={0.07} />
      <ellipse cx={CX} cy={CY} rx={100} ry={44}
        fill="url(#cg)"
        stroke="#22d3ee" strokeWidth={1.5} strokeOpacity={0.7}
        filter="url(#cglow)" />
      <text x={CX} y={CY - 6}  textAnchor="middle" fill="#e2f8ff" fontSize={14} fontWeight={700}>{label.split(" ").slice(0,3).join(" ")}</text>
      {label.split(" ").length > 3 &&
        <text x={CX} y={CY + 12} textAnchor="middle" fill="#e2f8ff" fontSize={14} fontWeight={700}>{label.split(" ").slice(3).join(" ")}</text>}
    </g>
  );
}

function BranchNode({ b, idx, animate }: { b: ComputedBranch; idx: number; animate: boolean }) {
  const words = b.topic.split(" ");
  const line1 = words.slice(0, 2).join(" ");
  const line2 = words.slice(2).join(" ");
  return (
    <g style={{ opacity: animate ? 1 : 0, transition: `opacity 0.4s ease ${0.12 + idx * 0.08}s` }}>
      <defs>
        <filter id={`bg${idx}`}>
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx={b.x} cy={b.y} rx={84} ry={30}
        fill={`${b.color}18`}
        stroke={b.color} strokeWidth={1.4} strokeOpacity={0.75}
        filter={`url(#bg${idx})`} />
      <text x={b.x} y={b.y - (line2 ? 6 : 0)} textAnchor="middle" fill={b.color} fontSize={12.5} fontWeight={700}>{line1}</text>
      {line2 && <text x={b.x} y={b.y + 11} textAnchor="middle" fill={b.color} fontSize={12.5} fontWeight={700}>{line2}</text>}
    </g>
  );
}

function SubtopicNode({
  sub, color, bIdx, sIdx, animate, onHover, isHovered,
}: {
  sub: ComputedBranch["subs"][0]; color: string;
  bIdx: number; sIdx: number; animate: boolean;
  onHover: (v: string | null) => void; isHovered: boolean;
}) {
  const words  = sub.label.split(" ");
  const line1  = words.slice(0, 3).join(" ");
  const line2  = words.slice(3).join(" ");
  const w = Math.max(line1.length, line2.length) * 6.5 + 20;
  const rx = Math.min(Math.max(w / 2, 52), 82);
  const ry = line2 ? 24 : 18;
  return (
    <g
      style={{ opacity: animate ? 1 : 0, transition: `opacity 0.4s ease ${0.25 + bIdx * 0.08 + sIdx * 0.05}s`, cursor: sub.detail ? "pointer" : "default" }}
      onMouseEnter={() => sub.detail && onHover(`${sub.label}||${sub.detail}`)}
      onMouseLeave={() => onHover(null)}
    >
      <ellipse cx={sub.x} cy={sub.y} rx={rx} ry={ry}
        fill={isHovered ? `${color}22` : `${color}0e`}
        stroke={color} strokeWidth={isHovered ? 1.3 : 0.9} strokeOpacity={isHovered ? 0.9 : 0.5}
        style={{ transition: "all 0.15s" }} />
      <text x={sub.x} y={sub.y - (line2 ? 5 : 0)} textAnchor="middle" fill="#cbd5e1" fontSize={11} fontWeight={500}>{line1}</text>
      {line2 && <text x={sub.x} y={sub.y + 10} textAnchor="middle" fill="#cbd5e1" fontSize={11} fontWeight={500}>{line2}</text>}
      {sub.detail && (
        <circle cx={sub.x + rx - 4} cy={sub.y - ry + 4} r={4} fill={color} opacity={0.7} />
      )}
    </g>
  );
}

/* ── main component ───────────────────────────────────────── */
interface MindMapDialogProps {
  open: boolean; onOpenChange: (o: boolean) => void;
  documentId: string; filename: string;
}

export function MindMapDialog({ open, onOpenChange, documentId, filename }: MindMapDialogProps) {
  const [status,   setStatus]   = useState<"loading"|"ready"|"error">("loading");
  const [mapData,  setMapData]  = useState<MindMapData | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [animate,  setAnimate]  = useState(false);
  const [tooltip,  setTooltip]  = useState<string | null>(null);

  /* pan / zoom */
  const [scale, setScale]   = useState(1);
  const [tx, setTx]         = useState(0);
  const [ty, setTy]         = useState(0);
  const dragging            = useRef(false);
  const dragStart           = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const svgRef              = useRef<SVGSVGElement>(null);

  const fetchMap = useCallback(async () => {
    setStatus("loading"); setError(null); setMapData(null); setAnimate(false);
    setScale(1); setTx(0); setTy(0);
    try {
      const res = await fetch(`/api/documents/${documentId}/mindmap`);
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `Error ${res.status}`); }
      const data: MindMapData = await res.json();
      if (!data.branches?.length) throw new Error("No mind map data returned.");
      setMapData(data);
      setStatus("ready");
      setTimeout(() => setAnimate(true), 80);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate mind map.");
      setStatus("error");
    }
  }, [documentId]);

  useEffect(() => { if (open) fetchMap(); }, [open, fetchMap]);

  /* zoom handlers */
  const zoom = (factor: number) => setScale(s => Math.min(Math.max(s * factor, 0.3), 2.5));
  const resetView = () => { setScale(1); setTx(0); setTy(0); };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.1 : 0.91);
  };
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setTx(dragStart.current.tx + (e.clientX - dragStart.current.x));
    setTy(dragStart.current.ty + (e.clientY - dragStart.current.y));
  };
  const onMouseUp = () => { dragging.current = false; };

  const layout = mapData ? computeLayout(mapData) : [];

  const [tipLabel, tipDetail] = tooltip?.split("||") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1100px] p-0 bg-card border-border overflow-hidden flex flex-col"
        style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 flex items-start justify-between gap-4"
          style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}>
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(192 80% 30%), hsl(210 80% 36%))", boxShadow: "0 0 12px hsl(192 100% 48%/0.3)" }}>
                  <Network className="w-4 h-4 text-white" />
                </div>
                Knowledge Mind Map
              </DialogTitle>
              <DialogDescription className="text-xs truncate">{filename}</DialogDescription>
            </DialogHeader>
          </div>

          {/* Controls */}
          {status === "ready" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => zoom(1.15)}><ZoomIn  className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => zoom(0.87)}><ZoomOut className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="w-8 h-8" onClick={resetView}><Maximize2 className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 ml-1"
                onClick={() => svgRef.current && downloadSvg(svgRef.current, filename)}>
                <Download className="w-3.5 h-3.5" /> SVG
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-xs h-8" onClick={fetchMap}>
                <RotateCw className="w-3 h-3" /> Regenerate
              </Button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(228 80% 3%), hsl(225 70% 4%))", minHeight: 480 }}>

          {/* Loading */}
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(192 80% 28%), hsl(210 80% 34%))", boxShadow: "0 0 28px hsl(192 100% 48%/0.4)" }}>
                  <Network className="w-8 h-8 text-white" />
                </div>
                <Loader2 className="w-20 h-20 absolute -top-2 -left-2 text-cyan-500/40 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Mapping document knowledge…</p>
                <p className="text-xs text-muted-foreground mt-1">AI is extracting concepts and relationships</p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
              <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive max-w-md w-full">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
              </div>
              <Button variant="outline" size="sm" onClick={fetchMap}><RotateCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button>
            </div>
          )}

          {/* Mind map SVG */}
          {status === "ready" && mapData && (
            <>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${VW} ${VH}`}
                className="w-full h-full select-none"
                style={{ cursor: dragging.current ? "grabbing" : "grab" }}
                onWheel={onWheel}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              >
                <defs>
                  {/* subtle dot grid */}
                  <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="#ffffff" opacity="0.025" />
                  </pattern>
                </defs>

                <rect width={VW} height={VH} fill="hsl(228 80% 3%)" />
                <rect width={VW} height={VH} fill="url(#dots)" />

                <g data-pan transform={`translate(${tx},${ty}) scale(${scale})`}
                  style={{ transformOrigin: `${VW/2}px ${VH/2}px` }}>

                  {/* ── connection lines ── */}
                  {layout.map((b, bi) => (
                    <g key={`paths-${bi}`}>
                      {/* center → branch */}
                      <path d={cubicPath(CX, CY, b.x, b.y)}
                        fill="none" stroke={b.color} strokeWidth={2} strokeOpacity={0.45}
                        style={{ opacity: animate ? 1 : 0, transition: `opacity 0.5s ease ${0.05 + bi * 0.07}s` }}
                      />
                      {/* branch → subtopics */}
                      {b.subs.map((s, si) => (
                        <path key={si} d={cubicPath(b.x, b.y, s.x, s.y)}
                          fill="none" stroke={b.color} strokeWidth={1.2} strokeOpacity={0.3}
                          style={{ opacity: animate ? 1 : 0, transition: `opacity 0.4s ease ${0.18 + bi * 0.07 + si * 0.04}s` }}
                        />
                      ))}
                    </g>
                  ))}

                  {/* ── subtopic nodes ── */}
                  {layout.map((b, bi) =>
                    b.subs.map((sub, si) => (
                      <SubtopicNode key={`${bi}-${si}`}
                        sub={sub} color={b.color}
                        bIdx={bi} sIdx={si} animate={animate}
                        onHover={setTooltip}
                        isHovered={tooltip?.startsWith(sub.label + "||") ?? false}
                      />
                    ))
                  )}

                  {/* ── branch nodes ── */}
                  {layout.map((b, bi) => (
                    <BranchNode key={`branch-${bi}`} b={b} idx={bi} animate={animate} />
                  ))}

                  {/* ── center node ── */}
                  <CenterNode label={mapData.centralTopic} animate={animate} />
                </g>

                {/* Legend */}
                <g style={{ opacity: animate ? 1 : 0, transition: "opacity 0.6s ease 0.8s" }}>
                  {layout.map((b, i) => (
                    <g key={`legend-${i}`} transform={`translate(${16}, ${16 + i * 19})`}>
                      <circle cx={6} cy={6} r={5} fill={b.color} opacity={0.8} />
                      <text x={16} y={10} fill="#94a3b8" fontSize={10.5}>{b.topic}</text>
                    </g>
                  ))}
                </g>

                {/* Zoom indicator */}
                <text x={VW - 8} y={VH - 8} textAnchor="end" fill="#475569" fontSize={10}>
                  {Math.round(scale * 100)}% · scroll to zoom · drag to pan
                </text>
              </svg>

              {/* Tooltip */}
              {tooltip && tipLabel && tipDetail && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-md w-full px-4 py-2.5 rounded-xl text-xs text-foreground pointer-events-none"
                  style={{
                    background: "hsl(228 70% 8%/0.95)",
                    border: "1px solid hsl(192 60% 30%/0.4)",
                    boxShadow: "0 0 20px hsl(192 100% 48%/0.1)",
                    backdropFilter: "blur(12px)",
                  }}>
                  <p className="font-semibold text-cyan-300 mb-0.5">{tipLabel}</p>
                  <p className="text-muted-foreground leading-relaxed">{tipDetail}</p>
                </div>
              )}

              {/* Hint bar */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] text-muted-foreground/50 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
                Hover subtopics with dots for details
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
