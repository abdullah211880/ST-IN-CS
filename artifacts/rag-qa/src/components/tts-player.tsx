import { useRef, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, Square, Loader2, Volume2, AlertCircle, Headphones, RefreshCw
} from "lucide-react";

/* ── helpers ─────────────────────────────────────────── */
function pct(charIndex: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((charIndex / total) * 100)) : 0;
}

function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis
    .getVoices()
    .filter(v => v.lang.startsWith("en"))
    .sort((a, b) => (a.localService ? -1 : 1) - (b.localService ? -1 : 1));
}

/* ── props ───────────────────────────────────────────── */
interface TtsPlayerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  documentId: string;
  filename: string;
}

type Status = "idle" | "loading" | "ready" | "speaking" | "paused" | "done" | "error";

/* ── component ───────────────────────────────────────── */
export function TtsPlayerDialog({ open, onOpenChange, documentId, filename }: TtsPlayerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [progress, setProgress] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const textRef = useRef<string>("");
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* load voices (browser may load them asynchronously) */
  const loadVoices = useCallback(() => {
    const v = getEnglishVoices();
    if (v.length) {
      setVoices(v);
      setSelectedVoice(prev => prev || v[0].name);
    }
  }, []);

  useEffect(() => {
    loadVoices();
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.addEventListener("voiceschanged", loadVoices);
      return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    }
  }, [loadVoices]);

  /* stop speech when dialog closes */
  useEffect(() => {
    if (!open && typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
      setStatus(s => (s === "speaking" || s === "paused") ? "ready" : s);
      setProgress(0);
      setCharIndex(0);
    }
  }, [open]);

  /* cleanup on unmount */
  useEffect(() => {
    return () => { if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); };
  }, []);

  /* fetch document text */
  const loadText = async () => {
    setStatus("loading");
    setError(null);
    setProgress(0);
    setCharIndex(0);
    try {
      const res = await fetch(`/api/documents/${documentId}/content`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      textRef.current = (data.content as string) || "";
      if (!textRef.current.trim()) throw new Error("Document has no readable text.");
      setStatus("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load document text.");
      setStatus("error");
    }
  };

  /* speak */
  const speak = () => {
    if (!textRef.current || typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(textRef.current);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utt.voice = voice;
    utt.rate = rate;
    utt.pitch = pitch;

    utt.onboundary = (e) => {
      setCharIndex(e.charIndex);
      setProgress(pct(e.charIndex, textRef.current.length));
    };
    utt.onend = () => { setStatus("done"); setProgress(100); };
    utt.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      setError(`Speech error: ${e.error}`);
      setStatus("error");
    };

    uttRef.current = utt;
    speechSynthesis.speak(utt);
    setStatus("speaking");
  };

  const pause = () => {
    speechSynthesis.pause();
    setStatus("paused");
  };

  const resume = () => {
    speechSynthesis.resume();
    setStatus("speaking");
  };

  const stop = () => {
    speechSynthesis.cancel();
    setStatus("ready");
    setProgress(0);
    setCharIndex(0);
  };

  const restart = () => { stop(); setTimeout(speak, 100); };

  /* derived */
  const totalChars = textRef.current.length;
  const readChars = charIndex;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Headphones className="w-4 h-4 text-cyan-400" />
            Text to Speech
          </DialogTitle>
          <DialogDescription className="truncate text-xs text-muted-foreground">
            {filename}
          </DialogDescription>
        </DialogHeader>

        {/* Load text step */}
        {status === "idle" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-muted-foreground text-center">
              Click below to load the document text and prepare it for playback.
            </p>
            <Button onClick={loadText}
              style={{ background: "linear-gradient(135deg, hsl(192 100% 38%), hsl(210 100% 42%))", color: "#fff" }}>
              <Volume2 className="w-4 h-4 mr-2" /> Load Document
            </Button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm text-muted-foreground">Loading document text…</p>
          </div>
        )}

        {status === "error" && (
          <>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
            <Button variant="outline" size="sm" onClick={loadText} className="self-start">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
            </Button>
          </>
        )}

        {(status === "ready" || status === "speaking" || status === "paused" || status === "done") && (
          <div className="space-y-5">
            {/* Voice selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Voice</label>
              {voices.length === 0 ? (
                <p className="text-xs text-amber-400/80 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> No voices found — your browser may not support speech synthesis.
                </p>
              ) : (
                <Select value={selectedVoice} onValueChange={setSelectedVoice}
                  disabled={status === "speaking" || status === "paused"}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    {voices.map(v => (
                      <SelectItem key={v.name} value={v.name}>
                        <span className="font-medium">{v.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{v.lang}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Rate & Pitch */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex justify-between">
                  <span>Speed</span>
                  <span className="text-foreground tabular-nums">{rate.toFixed(1)}×</span>
                </label>
                <Slider min={0.5} max={2} step={0.1} value={[rate]}
                  onValueChange={([v]) => setRate(v)}
                  disabled={status === "speaking" || status === "paused"} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex justify-between">
                  <span>Pitch</span>
                  <span className="text-foreground tabular-nums">{pitch.toFixed(1)}</span>
                </label>
                <Slider min={0.5} max={2} step={0.1} value={[pitch]}
                  onValueChange={([v]) => setPitch(v)}
                  disabled={status === "speaking" || status === "paused"} />
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="relative h-2 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, hsl(192 100% 48%), hsl(210 100% 55%))",
                    boxShadow: "0 0 8px hsl(192 100% 48% / 0.5)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{readChars.toLocaleString()} chars read</span>
                <span>{totalChars.toLocaleString()} total · {progress}%</span>
              </div>
            </div>

            {/* Status label */}
            {status === "done" && (
              <p className="text-center text-xs text-emerald-400 font-medium">Finished reading the document.</p>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 pt-1">
              {/* Stop */}
              <Button variant="outline" size="icon" className="h-9 w-9"
                onClick={stop} disabled={status === "ready" || status === "done"} title="Stop">
                <Square className="w-4 h-4" />
              </Button>

              {/* Play / Pause / Resume */}
              {status === "ready" || status === "done" ? (
                <Button size="icon" className="h-14 w-14 rounded-full text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, hsl(192 100% 40%), hsl(210 100% 45%))", boxShadow: "0 0 20px hsl(192 100% 48% / 0.4)" }}
                  onClick={speak} disabled={voices.length === 0} title="Play">
                  <Play className="w-6 h-6 ml-0.5" />
                </Button>
              ) : status === "speaking" ? (
                <Button size="icon" className="h-14 w-14 rounded-full text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, hsl(192 100% 40%), hsl(210 100% 45%))", boxShadow: "0 0 20px hsl(192 100% 48% / 0.4)" }}
                  onClick={pause} title="Pause">
                  <Pause className="w-6 h-6" />
                </Button>
              ) : (
                <Button size="icon" className="h-14 w-14 rounded-full text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, hsl(192 100% 40%), hsl(210 100% 45%))", boxShadow: "0 0 20px hsl(192 100% 48% / 0.4)" }}
                  onClick={resume} title="Resume">
                  <Play className="w-6 h-6 ml-0.5" />
                </Button>
              )}

              {/* Restart */}
              <Button variant="outline" size="icon" className="h-9 w-9"
                onClick={restart} disabled={status === "ready"} title="Restart">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground/50">
              Uses your browser's built-in speech engine · adjust voice & speed above
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
