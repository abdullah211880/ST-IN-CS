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
import { useLang } from "@/contexts/language-context";

export default function Sessions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, dir } = useLang();

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
        data: { title, documentIds: selectedDocs.length > 0 ? selectedDocs : undefined }
      });
      toast({ title: t("sessionsNewBtn") });
      setIsOpen(false);
      setTitle("");
      setSelectedDocs([]);
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      setLocation(`/sessions/${session.id}`);
    } catch {
      toast({ title: "Failed to create session", variant: "destructive" });
    }
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-8" dir={dir}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("sessionsTitle")}</h1>
            <p className="text-muted-foreground mt-1">{t("sessionsDesc")}</p>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 me-2" />
                {t("sessionsNewBtn")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" dir={dir}>
              <DialogHeader>
                <DialogTitle>{t("sessionsDialogTitle")}</DialogTitle>
                <DialogDescription>{t("sessionsDialogDesc")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">{t("sessionsLabelTitle")}</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Q3 Earnings Analysis"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      dir={dir}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("sessionsLabelDocs")}</Label>
                    <div className="border rounded-md max-h-[200px] overflow-y-auto p-2 bg-muted/30">
                      {documents?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">{t("sessionsNoDocs")}</p>
                      ) : (
                        <div className="space-y-2">
                          {documents?.map(doc => (
                            <div key={doc.id} className="flex items-center gap-2 p-1">
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
                    {t("sessionsCancelBtn")}
                  </Button>
                  <Button type="submit" disabled={!title.trim() || createSession.isPending}>
                    {createSession.isPending ? t("sessionsCreating") : t("sessionsStartBtn")}
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
              <h3 className="text-lg font-medium text-foreground">{t("sessionsEmpty")}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t("sessionsEmptyDesc")}</p>
              <Button className="mt-4" onClick={() => setIsOpen(true)}>{t("sessionsCreateBtn")}</Button>
            </div>
          ) : (
            sessions.map((session) => (
              <Card
                key={session.id}
                className="glow-card transition-all cursor-pointer group bg-card/60 backdrop-blur-sm"
                onClick={() => setLocation(`/sessions/${session.id}`)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between text-lg line-clamp-2 leading-tight">
                    {session.title}
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-1 shrink-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {session.messageCount} {t("sessionsExchanges")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {session.documentIds && session.documentIds.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 border-t pt-2">
                      <FileText className="w-3 h-3" />
                      {t("sessionsRestrictedTo")} {session.documentIds.length}{" "}
                      {session.documentIds.length !== 1 ? t("sessionsDocuments") : t("sessionsDocument")}
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
