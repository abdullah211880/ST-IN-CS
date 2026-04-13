import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Play, Pause, Download, Loader2, Volume2, AlertCircle,
  SkipBack, SkipForward, Headphones
} from "lucide-react";
import { cn } from "@/lib/utils";

const VOICES = [
  { id: "alloy",   label: "Alloy",   desc: "Neutral, balanced" },
  { id: "echo",    label: "Echo",    desc: "Clear, male" },
  { id: "fable",   label: "Fable",   desc: "British, expressive" },
  { id: "onyx",    label: "Onyx",    desc: "Deep, authoritative" },
  { id: "nova",    label: "Nova",    desc: "Energetic, female" },
  { id: "shimmer", label: "Shimmer", desc: "Soft, female" },
] as const;

function formatTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface TtsPlayerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  documentId: string;
  filename: string;
}

export function TtsPlayerDialog({ open, onOpenChange, documentId, filename }: TtsPlayerProps) {
  const [voice, setVoice] = useState<string>("alloy");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [charCount, setCharCount] = useState<number | null>(null);
  const [totalChars, setTotalChars] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setPlaying(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
    };
  }, []);

  const generate = async () => {
    setStatus("loading");
    setError(null);
    setAudioUrl(null);
    setBlob(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    try {
      const res = await fetch(`/api/documents/${documentId}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      setTruncated(res.headers.get("X-Truncated") === "true");
      const cc = res.headers.get("X-Char-Count");
      const tc = res.headers.get("X-Total-Chars");
      if (cc) setCharCount(parseInt(cc));
      if (tc) setTotalChars(parseInt(tc));

      const audioBlob = await res.blob();
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
      const url = URL.createObjectURL(audioBlob);
      prevObjectUrl.current = url;
      setBlob(audioBlob);
      setAudioUrl(url);
      setStatus("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate audio");
      setStatus("error");
    }
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    a.currentTime = ratio * duration;
  };

  const skip = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(duration, a.currentTime + delta));
  };

  const download = () => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.mp3`;
    a.click();
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Headphones className="w-4 h-4 text-cyan-400" />
            Text to Speech
          </DialogTitle>
        </DialogHeader>

        {/* Document name */}
        <div className="px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-muted-foreground truncate">
          {filename}
        </div>

        {/* Voice selector + generate */}
        <div className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Voice</label>
              <Select value={voice} onValueChange={setVoice} disabled={status === "loading"}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="font-medium">{v.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{v.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generate}
              disabled={status === "loading"}
              className="h-9 px-4"
              style={{ background: "linear-gradient(135deg, hsl(192 100% 38%), hsl(210 100% 42%))", color: "#fff" }}
            >
              {status === "loading" ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Generating…</>
              ) : (
                <><Volume2 className="w-3.5 h-3.5 mr-2" />{status === "ready" ? "Re-generate" : "Generate Audio"}</>
              )}
            </Button>
          </div>

          {/* Truncation notice */}
          {truncated && charCount && totalChars && (
            <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Playing first {charCount.toLocaleString()} of {totalChars.toLocaleString()} characters (24 k limit).
            </p>
          )}
        </div>

        {/* Error */}
        {status === "error" && error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Audio player */}
        {audioUrl && (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
              onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
              onEnded={() => setPlaying(false)}
            />

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
              {/* Progress bar */}
              <div
                className="relative h-2 rounded-full bg-muted/60 cursor-pointer group"
                onClick={seek}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, hsl(192 100% 48%), hsl(210 100% 55%))",
                    boxShadow: "0 0 8px hsl(192 100% 48% / 0.5)",
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-300 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${progress}% - 6px)` }}
                />
              </div>

              {/* Time */}
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => skip(-10)}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full text-white shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, hsl(192 100% 40%), hsl(210 100% 45%))",
                    boxShadow: "0 0 20px hsl(192 100% 48% / 0.4)",
                  }}
                  onClick={togglePlay}
                >
                  {playing
                    ? <Pause className="w-5 h-5" />
                    : <Play className="w-5 h-5 ml-0.5" />
                  }
                </Button>

                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => skip(10)}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              {/* Download */}
              <div className="flex justify-center pt-1">
                <Button
                  variant="outline" size="sm"
                  className="text-xs gap-1.5 h-8 border-border/60"
                  onClick={download}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download MP3
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Idle state hint */}
        {status === "idle" && (
          <p className="text-center text-xs text-muted-foreground/60 py-2">
            Select a voice and click Generate Audio to convert this document to speech.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
