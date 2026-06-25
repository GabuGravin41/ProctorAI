import { useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import InstructorLayout from "@/components/layout/instructor-layout";
import { Button } from "@/components/ui/button";
import { useGetExam, useListQuestions, useUpdateExam, useGenerateQuestions, usePublishExam, getGetExamQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Loader2, Plus, Sparkles, Send, Copy, CheckCheck, Archive } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { GenerateQuestionsInputDifficulty, GenerateQuestionsInputQuestionTypesItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";

export default function ExamBuilder() {
  const params = useParams();
  const examId = Number(params.examId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exam, isLoading: isLoadingExam } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const { data: questions, isLoading: isLoadingQuestions, refetch: refetchQuestions } = useListQuestions(examId, { query: { enabled: !!examId } });

  const publishExam = usePublishExam();
  const generateQuestions = useGenerateQuestions();

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState("5");
  const [aiDifficulty, setAiDifficulty] = useState<GenerateQuestionsInputDifficulty>("medium");
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [studentEmails, setStudentEmails] = useState("");
  const [accessCodes, setAccessCodes] = useState<{ code: string; studentEmail: string }[]>([]);
  const [codesOpen, setCodesOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const updateExam = useUpdateExam();

  const handleGenerate = () => {
    if (!aiPrompt) return;
    
    generateQuestions.mutate({
      examId,
      data: {
        topic: aiPrompt,
        count: parseInt(aiCount, 10),
        difficulty: aiDifficulty,
        questionTypes: ["multiple_choice", "true_false", "short_answer"],
      }
    }, {
      onSuccess: () => {
        toast({ title: "Questions Generated", description: "Successfully added AI generated questions." });
        setAiGenerateOpen(false);
        refetchQuestions();
        queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      },
      onError: () => {
        toast({ title: "Generation Failed", description: "Could not generate questions.", variant: "destructive" });
      }
    });
  };

  const handlePublish = () => {
    const emails = studentEmails.split(/[\n,]+/).map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      toast({ title: "No emails provided", description: "Please enter at least one student email.", variant: "destructive" });
      return;
    }

    publishExam.mutate({
      examId,
      data: { studentEmails: emails }
    }, {
      onSuccess: (data) => {
        setPublishOpen(false);
        setAccessCodes(data.accessCodes ?? []);
        setCodesOpen(true);
        queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      }
    });
  };

  if (isLoadingExam) return <InstructorLayout><div className="p-8">Loading...</div></InstructorLayout>;
  if (!exam) return <InstructorLayout><div className="p-8">Exam not found</div></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/exams"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">{exam.title}</h1>
                <Badge variant={exam.status === 'published' ? 'default' : exam.status === 'archived' ? 'outline' : 'secondary'} className="capitalize">{exam.status}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">{exam.subject} • {exam.durationMinutes} min</p>
            </div>
          </div>
          <div className="flex gap-2">
            {exam.status === 'published' && (
              <Button
                variant="outline"
                className="gap-2 text-muted-foreground"
                onClick={() => setArchiveOpen(true)}
                disabled={updateExam.isPending}
              >
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
            {exam.status === 'draft' && (
              <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Send className="h-4 w-4" /> Publish Exam
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Publish & Generate Access Codes</DialogTitle>
                    <DialogDescription>
                      Publishing will finalize the exam and generate unique access codes for each student.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Student Emails (comma or newline separated)</Label>
                      <Textarea 
                        placeholder="student1@example.com&#10;student2@example.com" 
                        value={studentEmails}
                        onChange={(e) => setStudentEmails(e.target.value)}
                        className="min-h-32"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
                    <Button onClick={handlePublish} disabled={publishExam.isPending}>
                      {publishExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Publish Exam
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {(exam.status === 'published' || exam.status === 'archived') && (
              <Button variant="secondary" asChild>
                <Link href={`/exams/${exam.id}/results`}>View Results</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-8">
          <h2 className="text-xl font-bold">Questions ({questions?.length || 0})</h2>
          
          {exam.status === 'draft' && (
            <div className="flex gap-2">
              <Dialog open={aiGenerateOpen} onOpenChange={setAiGenerateOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                    <Sparkles className="h-4 w-4" /> Auto-Generate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Questions with AI</DialogTitle>
                    <DialogDescription>
                      Provide a topic or source text, and we'll generate high-quality questions for your exam.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Topic or Source Text</Label>
                      <Textarea 
                        placeholder="e.g. The causes of the French Revolution, focusing on economic factors..." 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Count</Label>
                        <Input type="number" min="1" max="20" value={aiCount} onChange={(e) => setAiCount(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Difficulty</Label>
                        <Select value={aiDifficulty} onValueChange={(v: any) => setAiDifficulty(v)}>
                          <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAiGenerateOpen(false)}>Cancel</Button>
                    <Button onClick={handleGenerate} disabled={generateQuestions.isPending}>
                      {generateQuestions.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate Questions
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </div>
          )}
        </div>

        {isLoadingQuestions ? (
          <div className="py-12 text-center text-muted-foreground">Loading questions...</div>
        ) : !questions?.length ? (
          <Card className="border-dashed bg-slate-50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground mb-4">No questions added yet.</p>
              {exam.status === 'draft' && (
                <Button onClick={() => setAiGenerateOpen(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" /> Generate with AI
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <Card key={q.id}>
                <CardHeader className="py-4 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-muted-foreground">{index + 1}.</span> 
                      {q.text}
                    </CardTitle>
                    <CardDescription className="capitalize">
                      {q.type.replace(/_/g, ' ')} • {q.points || 1} pts
                    </CardDescription>
                  </div>
                </CardHeader>
                {q.options && q.options.length > 0 && (
                  <CardContent className="py-0 pb-4">
                    <div className="space-y-2 pl-6">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`text-sm p-2 rounded border ${q.correctAnswer === opt ? 'bg-green-50 border-green-200 font-medium' : 'bg-slate-50 border-transparent'}`}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
                {q.type !== 'multiple_choice' && q.correctAnswer && (
                  <CardContent className="py-0 pb-4">
                    <div className="text-sm pl-6">
                      <span className="font-medium">Answer: </span> {q.correctAnswer}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Archive Confirmation */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving will close the exam immediately. Students with existing sessions can still submit,
              but no new sessions can be started with any access code. This cannot be undone from the UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                updateExam.mutate(
                  { examId, data: { status: "archived" } },
                  {
                    onSuccess: () => {
                      setArchiveOpen(false);
                      toast({ title: "Exam archived", description: "No new sessions can be started." });
                      queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
                    },
                    onError: () => {
                      toast({ title: "Failed to archive", variant: "destructive" });
                      setArchiveOpen(false);
                    },
                  }
                );
              }}
              disabled={updateExam.isPending}
            >
              {updateExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Access Codes Dialog */}
      <Dialog open={codesOpen} onOpenChange={setCodesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCheck className="h-5 w-5" /> Exam Published — Access Codes
            </DialogTitle>
            <DialogDescription>
              Share each student's unique code with them. They'll use it to join the exam.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-2 max-h-80 overflow-y-auto pr-1">
            {accessCodes.map(({ code, studentEmail }) => (
              <AccessCodeRow key={code} code={code} studentEmail={studentEmail} />
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              const text = accessCodes.map(({ studentEmail, code }) => `${studentEmail}: ${code}`).join("\n");
              navigator.clipboard.writeText(text);
              toast({ title: "All codes copied to clipboard" });
            }}>
              <Copy className="h-4 w-4 mr-2" /> Copy All
            </Button>
            <Button onClick={() => setCodesOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InstructorLayout>
  );
}

function AccessCodeRow({ code, studentEmail }: { code: string; studentEmail: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-md border bg-slate-50">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{studentEmail}</p>
        <p className="font-mono font-bold tracking-widest text-primary text-lg leading-tight">{code}</p>
      </div>
      <button
        onClick={copy}
        className="shrink-0 p-2 rounded hover:bg-slate-200 transition-colors text-muted-foreground hover:text-foreground"
        title="Copy code"
      >
        {copied ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}