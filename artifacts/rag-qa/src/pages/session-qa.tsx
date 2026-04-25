import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSession, getGetSessionQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Send, Terminal, ChevronDown, ChevronRight, FileText, Loader2, ArrowLeft, BrainCircuit, AlignLeft, Layers, Globe, BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import AnimatedBackground from "@/components/animated-background";
import { useLang } from "@/contexts/language-context";

/* ── Wikipedia summary card ──────────────────────────────────── */
interface WikiSummary { title: string; extract: string; pageUrl: string; thumbnail?: string; }

async function fetchWikiSummary(query: string): Promise<WikiSummary | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json() as [string, string[], string[], string[]];
    const title = searchData[1]?.[0];
    if (!title) return null;

    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { "Api-User-Agent": "RAGEngine/1.0" } }
    );
    if (!summaryRes.ok) return null;
    const d = await summaryRes.json() as any;
    return {
      title: d.title,
      extract: d.extract_html
        ? d.extract_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : (d.extract ?? ""),
      pageUrl: d.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      thumbnail: d.thumbnail?.source,
    };
  } catch {
    return null;
  }
}

function WikipediaCard({ question }: { question: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "none">("idle");
  const [wiki, setWiki]   = useState<WikiSummary | null>(null);
  const [open, setOpen]   = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    setState("loading");
    fetchWikiSummary(question).then(result => {
      if (result && result.extract.length > 80) {
        setWiki(result);
        setState("done");
      } else {
        setState("none");
      }
    });
  }, [question]);

  if (state === "idle" || state === "loading" || state === "none") return null;
  if (!wiki) return null;

  return (
    <div className="mt-2 rounded-lg overflow-hidden"
      style={{ border: "1px solid hsl(220 30% 20%/0.5)", background: "hsl(228 25% 8%/0.5)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/4"
      >
        <BookOpen className="w-3.5 h-3.5 text-blue-400/70 shrink-0" />
        <span className="text-xs font-medium text-blue-400/80 flex-1 truncate">Wikipedia: {wiki.title}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2.5 border-t" style={{ borderColor: "hsl(220 30% 18%/0.5)" }}>
          {wiki.thumbnail && (
            <img src={wiki.thumbnail} alt={wiki.title} className="w-full max-h-28 object-cover rounded-md mt-2 opacity-80" />
          )}
          <p className="text-xs text-muted-foreground/70 leading-relaxed mt-2 line-clamp-5">
            {wiki.extract}
          </p>
          <a href={wiki.pageUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
            <ExternalLink className="w-3 h-3" />
            Read on Wikipedia
          </a>
        </div>
      )}
    </div>
  );
}

export default function SessionQA() {
  const params = useParams();
  const id = params.id!;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoAsked = useRef(false);
  const { t, lang } = useLang();

  const [question, setQuestion]       = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openTraces, setOpenTraces]   = useState<Record<string, boolean>>({});
  const [answerLang, setAnswerLang]   = useState<"en" | "ar">("en");

  const { data: session, isLoading } = useGetSession(id, {
    query: { queryKey: getGetSessionQueryKey(id) }
  });

  // Custom mutation that passes language to the API
  const askMutation = useMutation({
    mutationFn: async ({ sessionId, q, language }: { sessionId: string; q: string; language: string }) => {
      const res = await fetch(`/api/sessions/${sessionId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, language }),
      });
      if (!res.ok) throw new Error("Failed to get answer");
      return res.json();
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages, askMutation.isPending]);

  // Auto-ask a question passed via ?autoask=... query param
  useEffect(() => {
    if (autoAsked.current || isLoading || !session) return;
    const searchParams = new URLSearchParams(window.location.search);
    const autoQ = searchParams.get("autoask");
    if (!autoQ) return;
    autoAsked.current = true;
    const clean = window.location.pathname;
    window.history.replaceState(null, "", clean);
    setTimeout(() => submitQuestion(autoQ), 80);
  }, [session, isLoading]);

  const submitQuestion = async (q: string) => {
    if (!q.trim() || askMutation.isPending) return;

    const optimisticMessage = {
      id: "temp-" + Date.now(),
      sessionId: id,
      role: "user" as const,
      content: q,
      createdAt: new Date().toISOString(),
    };

    queryClient.setQueryData(getGetSessionQueryKey(id), (old: any) => {
      if (!old) return old;
      return { ...old, messages: [...old.messages, optimisticMessage] };
    });

    try {
      await askMutation.mutateAsync({ sessionId: id, q, language: answerLang });
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
    } catch {
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || askMutation.isPending) return;
    const q = question;
    setQuestion("");
    await submitQuestion(q);
  };

  const toggleTrace = (msgId: string) => {
    setOpenTraces(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  if (isLoading && !session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold">Session not found</h2>
        <Button variant="link" onClick={() => setLocation('/sessions')}>{t("qaBack")}</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r">
        <div className="h-14 border-b flex items-center justify-between px-4 bg-background z-10 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/sessions')} className="shrink-0 h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="font-semibold text-lg truncate">{session.title}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Answer language toggle */}
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 border"
              style={{ background: "hsl(var(--muted)/0.5)", borderColor: "hsl(var(--border))" }}>
              <Globe className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="text-[10px] text-muted-foreground/60 font-medium">{t("qaAnswerLang")}:</span>
              <div className="flex gap-0.5">
                {(["en", "ar"] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setAnswerLang(l)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all"
                    style={{
                      background: answerLang === l ? "hsl(192 70% 30%)" : "transparent",
                      color: answerLang === l ? "#fff" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {l === "en" ? "EN" : "AR"}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={cn("shrink-0", isSidebarOpen && "bg-muted")}>
              <Terminal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <AnimatedBackground />
          <ScrollArea className="relative z-10 h-full p-4" ref={scrollRef}>
            <div className={cn("max-w-3xl mx-auto space-y-6 pb-4", lang === "ar" && "text-right")}>
              {session.messages.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>{t("qaEmptyTitle")}</p>
                  <p className="text-sm">{t("qaEmptyDesc")}</p>
                </div>
              ) : (
                session.messages.map((msg, msgIdx) => {
                  const precedingUserMsg = msg.role === "assistant"
                    ? session.messages.slice(0, msgIdx).filter((m: any) => m.role === "user").at(-1)
                    : null;

                  return (
                  <div key={msg.id}>
                    <div className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      {msg.role === 'assistant' && (
                        <Avatar className="w-8 h-8 border border-primary/20 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">AI</AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={cn(
                        "max-w-[85%] rounded-lg p-4", 
                        msg.role === 'user' 
                          ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(192_100%_48%_/_0.35)]" 
                          : "bg-card/70 backdrop-blur-sm glow-card"
                      )}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-base dark:prose-invert max-w-none break-words
                            [&>p]:mb-3 [&>p:last-child]:mb-0 [&>p]:text-base [&>p]:leading-7
                            [&>ol]:list-decimal [&>ol]:ps-5 [&>ol]:space-y-2 [&>ol]:mb-3
                            [&>ul]:list-disc [&>ul]:ps-5 [&>ul]:space-y-2 [&>ul]:mb-3
                            [&_li]:leading-relaxed [&_li]:text-base
                            [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mb-2
                            [&>h2]:text-base [&>h2]:font-bold [&>h2]:mb-2
                            [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mb-1.5
                            [&>strong]:font-semibold
                            [&>blockquote]:border-s-2 [&>blockquote]:border-primary/40 [&>blockquote]:ps-3 [&>blockquote]:text-muted-foreground [&>blockquote]:italic
                            [&>hr]:border-border [&>hr]:my-3">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="break-words text-sm leading-relaxed">{msg.content}</div>
                        )}
                        
                        {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-border/50">
                            <div className="flex items-center text-xs font-medium text-muted-foreground mb-2">
                              <Layers className="w-3 h-3 me-1" />
                              {t("qaSources")} ({msg.sources.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Array.from(new Set(msg.sources.map((s: any) => s.filename))).map(filename => (
                                <div key={filename as string} className="inline-flex items-center px-2 py-1 rounded bg-muted/50 text-xs text-muted-foreground border">
                                  <FileText className="w-3 h-3 me-1" />
                                  {filename as string}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Wikipedia card below each AI answer */}
                        {msg.role === 'assistant' && precedingUserMsg && (
                          <WikipediaCard question={precedingUserMsg.content} />
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
              
              {askMutation.isPending && (
                <div className="flex gap-4 justify-start">
                  <Avatar className="w-8 h-8 border border-primary/20 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs"><Loader2 className="w-3 h-3 animate-spin" /></AvatarFallback>
                  </Avatar>
                  <div className="max-w-[85%] rounded-lg p-4 bg-card border border-border shadow-sm flex items-center text-sm text-muted-foreground">
                    <span className="flex items-center">
                      {t("qaPending")}<span className="animate-[pulse_1.5s_infinite]">...</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="p-4 bg-background border-t shrink-0">
          <form onSubmit={handleAsk} className="max-w-3xl mx-auto relative flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("qaPlaceholder")}
                className="h-12 shadow-sm"
                style={{ paddingInlineEnd: "3rem" }}
                disabled={askMutation.isPending}
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute end-1.5 h-9 w-9" 
                disabled={!question.trim() || askMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Sidebar - Agent Trace & Citations */}
      {isSidebarOpen && (
        <div className="w-80 lg:w-96 flex-shrink-0 bg-muted/10 flex flex-col h-full border-s overflow-hidden">
          <div className="h-14 border-b flex items-center px-4 shrink-0 bg-background/50 backdrop-blur">
            <h2 className="font-semibold text-sm flex items-center">
              <Terminal className="w-4 h-4 me-2 text-primary" />
              {t("qaAgentTrace")}
            </h2>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {session.messages.filter((m: any) => m.role === 'assistant').length === 0 ? (
                <div className="text-center p-4 text-xs text-muted-foreground border border-dashed rounded-md bg-muted/50">
                  {t("qaTracePlaceholder")}
                </div>
              ) : (
                session.messages.filter((m: any) => m.role === 'assistant').reverse().map((msg: any) => (
                  <div key={msg.id} className="space-y-4">
                    
                    {msg.agentTrace && msg.agentTrace.length > 0 && (
                      <div className="border rounded-md bg-background shadow-sm overflow-hidden">
                        <Collapsible open={openTraces[msg.id] ?? true} onOpenChange={() => toggleTrace(msg.id)}>
                          <CollapsibleTrigger className="w-full flex items-center justify-between p-2 text-xs font-medium bg-muted/30 hover:bg-muted/50 transition-colors">
                            <span className="flex items-center">
                              <BrainCircuit className="w-3 h-3 me-1.5 text-primary" />
                              {t("qaExecTrace")}
                            </span>
                            {openTraces[msg.id] ?? true ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-2 space-y-2">
                              {msg.agentTrace.map((step: any, i: number) => (
                                <div key={i} className="text-xs bg-muted/50 p-2 rounded border border-border/50 font-mono">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-primary font-semibold">{step.agentName}</span>
                                    {step.durationMs && <span className="text-muted-foreground opacity-70">{step.durationMs}ms</span>}
                                  </div>
                                  <div className="text-muted-foreground break-words whitespace-pre-wrap mt-1 border-t border-border/50 pt-1">
                                    &gt; {step.action}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
                          <AlignLeft className="w-3 h-3 me-1" />
                          {t("qaSourceEvidence")}
                        </h4>
                        {msg.sources.map((source: any, i: number) => (
                          <div key={i} className="p-3 rounded-md bg-background border shadow-sm text-sm space-y-2 relative overflow-hidden group">
                            <div className="absolute start-0 top-0 bottom-0 w-1 bg-primary/40 group-hover:bg-primary transition-colors" />
                            <div className="flex items-start justify-between">
                              <span className="font-medium text-foreground flex items-center truncate max-w-[80%]">
                                <FileText className="w-3 h-3 me-1.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{source.filename}</span>
                              </span>
                              {source.pageNumber && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded border">p.{source.pageNumber}</span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-4 bg-muted/30 p-2 rounded italic">
                              "{source.chunkContent}"
                            </p>
                            {source.topic && (
                              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">{t("qaTopic")}: {source.topic}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Separator className="my-4 last:hidden" />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
