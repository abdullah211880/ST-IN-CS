import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSession, useAskQuestion, getGetSessionQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Terminal, ChevronDown, ChevronRight, FileText, Loader2, ArrowLeft, BrainCircuit, AlignLeft, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import AnimatedBackground from "@/components/animated-background";

export default function SessionQA() {
  const params = useParams();
  const id = params.id!;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoAsked = useRef(false);
  
  const [question, setQuestion] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openTraces, setOpenTraces] = useState<Record<string, boolean>>({});

  const { data: session, isLoading } = useGetSession(id, {
    query: { queryKey: getGetSessionQueryKey(id) }
  });

  const askMutation = useAskQuestion();

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
    // Strip the param from the URL without causing a re-render/navigation
    const clean = window.location.pathname;
    window.history.replaceState(null, "", clean);
    // Submit the question after a short tick to let the page settle
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
      await askMutation.mutateAsync({ id, data: { question: q } });
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
        <Button variant="link" onClick={() => setLocation('/sessions')}>Back to sessions</Button>
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
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={cn("shrink-0", isSidebarOpen && "bg-muted")}>
            <Terminal className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <AnimatedBackground />
        <ScrollArea className="relative z-10 h-full p-4" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {session.messages.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>This session is empty.</p>
                <p className="text-sm">Ask a question to start analyzing your documents.</p>
              </div>
            ) : (
              session.messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
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
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words
                        [&>p]:mb-2 [&>p:last-child]:mb-0
                        [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1.5 [&>ol]:mb-2
                        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1.5 [&>ul]:mb-2
                        [&_li]:leading-relaxed
                        [&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-2
                        [&>h2]:text-sm [&>h2]:font-bold [&>h2]:mb-1.5
                        [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1
                        [&>strong]:font-semibold
                        [&>blockquote]:border-l-2 [&>blockquote]:border-primary/40 [&>blockquote]:pl-3 [&>blockquote]:text-muted-foreground [&>blockquote]:italic
                        [&>hr]:border-border [&>hr]:my-3">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="break-words text-sm leading-relaxed">{msg.content}</div>
                    )}
                    
                    {/* Sources section inline if no sidebar or just brief summary */}
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center text-xs font-medium text-muted-foreground mb-2">
                          <Layers className="w-3 h-3 mr-1" />
                          Sources ({msg.sources.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(msg.sources.map(s => s.filename))).map(filename => (
                            <div key={filename} className="inline-flex items-center px-2 py-1 rounded bg-muted/50 text-xs text-muted-foreground border">
                              <FileText className="w-3 h-3 mr-1" />
                              {filename}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {askMutation.isPending && (
              <div className="flex gap-4 justify-start">
                <Avatar className="w-8 h-8 border border-primary/20 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs"><Loader2 className="w-3 h-3 animate-spin" /></AvatarFallback>
                </Avatar>
                <div className="max-w-[85%] rounded-lg p-4 bg-card border border-border shadow-sm flex items-center text-sm text-muted-foreground">
                  <span className="flex items-center">
                    Agents are synthesizing answer<span className="animate-[pulse_1.5s_infinite]">...</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        </div>

        <div className="p-4 bg-background border-t shrink-0">
          <form onSubmit={handleAsk} className="max-w-3xl mx-auto relative flex items-center">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="pr-12 h-12 shadow-sm"
              disabled={askMutation.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-1.5 h-9 w-9" 
              disabled={!question.trim() || askMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Right Sidebar - Agent Trace & Citations */}
      {isSidebarOpen && (
        <div className="w-80 lg:w-96 flex-shrink-0 bg-muted/10 flex flex-col h-full border-l overflow-hidden">
          <div className="h-14 border-b flex items-center px-4 shrink-0 bg-background/50 backdrop-blur">
            <h2 className="font-semibold text-sm flex items-center">
              <Terminal className="w-4 h-4 mr-2 text-primary" />
              Agent Intelligence Trace
            </h2>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {session.messages.filter(m => m.role === 'assistant').length === 0 ? (
                <div className="text-center p-4 text-xs text-muted-foreground border border-dashed rounded-md bg-muted/50">
                  Submit a question to see the multi-agent routing, tool execution, and synthesis process.
                </div>
              ) : (
                session.messages.filter(m => m.role === 'assistant').reverse().map(msg => (
                  <div key={msg.id} className="space-y-4">
                    
                    {/* Agent Trace */}
                    {msg.agentTrace && msg.agentTrace.length > 0 && (
                      <div className="border rounded-md bg-background shadow-sm overflow-hidden">
                        <Collapsible open={openTraces[msg.id] ?? true} onOpenChange={() => toggleTrace(msg.id)}>
                          <CollapsibleTrigger className="w-full flex items-center justify-between p-2 text-xs font-medium bg-muted/30 hover:bg-muted/50 transition-colors">
                            <span className="flex items-center">
                              <BrainCircuit className="w-3 h-3 mr-1.5 text-primary" />
                              Execution Trace
                            </span>
                            {openTraces[msg.id] ?? true ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-2 space-y-2">
                              {msg.agentTrace.map((step, i) => (
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

                    {/* Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
                          <AlignLeft className="w-3 h-3 mr-1" />
                          Source Evidence
                        </h4>
                        {msg.sources.map((source, i) => (
                          <div key={i} className="p-3 rounded-md bg-background border shadow-sm text-sm space-y-2 relative overflow-hidden group">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40 group-hover:bg-primary transition-colors" />
                            <div className="flex items-start justify-between">
                              <span className="font-medium text-foreground flex items-center truncate max-w-[80%]">
                                <FileText className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
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
                              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Topic: {source.topic}</div>
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
