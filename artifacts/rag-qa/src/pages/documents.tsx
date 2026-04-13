import { useState } from "react";
import { useListDocuments, useUploadDocument, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileText, Trash2, UploadCloud, AlertCircle, CheckCircle2, Loader2, Database, Headphones, Lightbulb, AlignLeft, GraduationCap } from "lucide-react";
import { TtsPlayerDialog } from "@/components/tts-player";
import { SuggestedQuestionsDialog } from "@/components/suggested-questions";
import { SummaryDialog } from "@/components/summary-dialog";
import { QuizDialog } from "@/components/quiz-dialog";

export default function Documents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useListDocuments({
    query: { queryKey: getListDocumentsQueryKey() }
  });

  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("text");

  const [ttsDoc, setTtsDoc] = useState<{ id: string; filename: string } | null>(null);
  const [questionsDoc, setQuestionsDoc] = useState<{ id: string; filename: string } | null>(null);
  const [summaryDoc, setSummaryDoc] = useState<{ id: string; filename: string } | null>(null);
  const [quizDoc, setQuizDoc] = useState<{ id: string; filename: string } | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      await uploadDoc.mutateAsync({
        data: {
          file,
          filename: file.name,
          documentType: documentType as any,
        }
      });
      toast({ title: "Document uploaded", description: "Your document is now processing." });
      setIsUploadOpen(false);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    } catch {
      toast({ title: "Upload failed", description: "There was an error uploading your document.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDoc.mutateAsync({ id });
      toast({ title: "Document deleted" });
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Knowledge Base</h1>
            <p className="text-muted-foreground mt-1">Manage documents, view extraction status, and explore indexed topics.</p>
          </div>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <UploadCloud className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Add a new document to your knowledge base for the RAG agents to index.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".txt,.md,.pdf,.csv"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Supported: TXT, Markdown, PDF (up to 50 MB)</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Document Type</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text / Markdown</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="table">Tabular Data (CSV/Excel)</SelectItem>
                        <SelectItem value="image">Image (OCR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!file || uploadDoc.isPending}>
                    {uploadDoc.isPending ? "Uploading..." : "Upload & Index"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glow-card bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Indexed Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !documents?.length ? (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">No documents found</h3>
                <p className="text-sm text-muted-foreground mt-1">Upload a document to start building your knowledge base.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Extracted Topics</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                          {doc.filename}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.status === "ready" && (
                          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                          </Badge>
                        )}
                        {doc.status === "processing" && (
                          <Badge variant="secondary" className="text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
                          </Badge>
                        )}
                        {doc.status === "error" && (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" /> Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{doc.documentType}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground">
                          <Database className="w-3 h-3 mr-1" />
                          {doc.chunkCount || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {doc.topics?.slice(0, 3).map((topic, i) => (
                            <Badge key={i} variant="outline" className="text-xs truncate max-w-[100px]">{topic}</Badge>
                          ))}
                          {doc.topics && doc.topics.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{doc.topics.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Summarize document"
                            disabled={doc.status !== "ready"}
                            onClick={() => setSummaryDoc({ id: doc.id, filename: doc.filename })}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-30"
                          >
                            <AlignLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Suggest questions"
                            disabled={doc.status !== "ready"}
                            onClick={() => setQuestionsDoc({ id: doc.id, filename: doc.filename })}
                            className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 disabled:opacity-30"
                          >
                            <Lightbulb className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Generate quiz / exam"
                            disabled={doc.status !== "ready"}
                            onClick={() => setQuizDoc({ id: doc.id, filename: doc.filename })}
                            className="text-violet-400 hover:text-violet-300 hover:bg-violet-400/10 disabled:opacity-30"
                          >
                            <GraduationCap className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Listen to document"
                            disabled={doc.status !== "ready"}
                            onClick={() => setTtsDoc({ id: doc.id, filename: doc.filename })}
                            className="text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30"
                          >
                            <Headphones className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {ttsDoc && (
        <TtsPlayerDialog
          open={!!ttsDoc}
          onOpenChange={(open) => { if (!open) setTtsDoc(null); }}
          documentId={ttsDoc.id}
          filename={ttsDoc.filename}
        />
      )}

      {questionsDoc && (
        <SuggestedQuestionsDialog
          open={!!questionsDoc}
          onOpenChange={(open) => { if (!open) setQuestionsDoc(null); }}
          documentId={questionsDoc.id}
          filename={questionsDoc.filename}
        />
      )}

      {summaryDoc && (
        <SummaryDialog
          open={!!summaryDoc}
          onOpenChange={(open) => { if (!open) setSummaryDoc(null); }}
          documentId={summaryDoc.id}
          filename={summaryDoc.filename}
        />
      )}

      {quizDoc && (
        <QuizDialog
          open={!!quizDoc}
          onOpenChange={(open) => { if (!open) setQuizDoc(null); }}
          documentId={quizDoc.id}
          filename={quizDoc.filename}
        />
      )}
    </div>
  );
}
