import { useState } from "react";
import { useListSessions, useCreateSession, useListDocuments, getListSessionsQueryKey, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { MessageSquare, Plus, Clock, FileText, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function Sessions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: sessions, isLoading } = useListSessions({
    query: { queryKey: getListSessionsQueryKey() }
  });
  
  const { data: documents } = useListDocuments({
    query: { queryKey: getListDocumentsQueryKey() }
  });

  const createSession = useCreateSession();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const session = await createSession.mutateAsync({
        data: {
          title,
          documentIds: selectedDocs.length > 0 ? selectedDocs : undefined
        }
      });
      
      toast({ title: "Session created" });
      setIsOpen(false);
      setTitle("");
      setSelectedDocs([]);
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      setLocation(`/sessions/${session.id}`);
    } catch (error) {
      toast({
        title: "Failed to create session",
        variant: "destructive",
      });
    }
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-muted/20">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Analysis Sessions</h1>
            <p className="text-muted-foreground mt-1">Ask questions, synthesize answers, and explore source materials.</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Analysis Session</DialogTitle>
                <DialogDescription>
                  Start a new context for asking questions. Optionally restrict search to specific documents.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Session Title</Label>
                    <Input 
                      id="title" 
                      placeholder="e.g., Q3 Earnings Analysis"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Restrict to Documents (Optional)</Label>
                    <div className="border rounded-md max-h-[200px] overflow-y-auto p-2 bg-muted/30">
                      {documents?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No documents available.</p>
                      ) : (
                        <div className="space-y-2">
                          {documents?.map(doc => (
                            <div key={doc.id} className="flex items-center space-x-2 p-1">
                              <Checkbox 
                                id={`doc-${doc.id}`} 
                                checked={selectedDocs.includes(doc.id)}
                                onCheckedChange={() => toggleDoc(doc.id)}
                              />
                              <label htmlFor={`doc-${doc.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1 truncate">
                                {doc.filename}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!title.trim() || createSession.isPending}>
                    {createSession.isPending ? "Creating..." : "Start Session"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="h-40 animate-pulse bg-muted border-border/50" />
            ))
          ) : !sessions?.length ? (
            <div className="col-span-full text-center py-12 border border-dashed rounded-lg bg-background">
              <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No sessions yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Create your first session to start asking questions.</p>
              <Button className="mt-4" onClick={() => setIsOpen(true)}>Create Session</Button>
            </div>
          ) : (
            sessions.map((session) => (
              <Card 
                key={session.id} 
                className="border-border/50 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setLocation(`/sessions/${session.id}`)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between text-lg line-clamp-2 leading-tight">
                    {session.title}
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
                    <div className="flex items-center">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      {session.messageCount} exchanges
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {session.documentIds && session.documentIds.length > 0 && (
                    <div className="flex items-center text-xs text-muted-foreground mt-2 border-t pt-2">
                      <FileText className="w-3 h-3 mr-1" />
                      Restricted to {session.documentIds.length} document{session.documentIds.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
