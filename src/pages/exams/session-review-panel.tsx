import { useState } from "react";
import { 
  useListSessionFlags, 
  useReviewFlag, 
  getListSessionFlagsQueryKey,
  useGetSession,
  getGetSessionQueryKey,
  CheatingFlag
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import LatexRenderer from "@/components/latex-renderer";
import {
  X, Loader2, ShieldCheck, ShieldX, CheckCircle2,
  AlertTriangle, BookOpen, Clock
} from "lucide-react";
import { customFetch } from "@/lib/api-client";

// --- Custom Hooks for new endpoints ---
function useReleaseSessionResults() {
  return useMutation({
    mutationFn: async (sessionId: number) => {
      return await customFetch(`/sessions/${sessionId}/release`, { method: "POST" });
    }
  });
}

function useGradeSessionAnswer() {
  return useMutation({
    mutationFn: async ({ sessionId, questionId, points, feedback }: { sessionId: number, questionId: number, points: number, feedback: string }) => {
      return await customFetch(`/sessions/${sessionId}/questions/${questionId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, feedback })
      });
    }
  });
}

// ---------- Flag Helpers ----------
const FLAG_LABELS: Record<string, string> = {
  face_not_visible: "Face Not Visible",
  looking_away: "Looking Away",
  multiple_faces: "Multiple Faces",
  phone_detected: "Phone Detected",
  other: "Other",
};

function flagLabel(type: string) {
  return FLAG_LABELS[type] ?? type.replace(/_/g, " ");
}

function reviewBadge(status: string) {
  if (status === "confirmed")
    return <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1"><ShieldX className="h-3 w-3" />Confirmed</Badge>;
  if (status === "dismissed")
    return <Badge className="bg-green-50 text-green-700 border-green-200 gap-1"><ShieldCheck className="h-3 w-3" />Dismissed</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

// ---------- Flag Card Component ----------
function FlagCard({
  flag,
  note,
  onNoteChange,
  onConfirm,
  onDismiss,
  loading,
}: {
  flag: CheatingFlag;
  note: string;
  onNoteChange: (val: string) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  loading: boolean;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card space-y-3 shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <div className="font-bold capitalize">{flagLabel(flag.type)}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(flag.detectedAt), "MMM d, yyyy · h:mm:ss a")}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0">Pending</Badge>
      </div>

      {flag.description && (
        <p className="text-sm text-muted-foreground">{flag.description}</p>
      )}

      {flag.clipData && (
        <div className="rounded-md overflow-hidden bg-black aspect-video border my-2">
          <video src={flag.clipData} controls className="w-full h-full object-contain" />
        </div>
      )}

      <Textarea
        placeholder="Optional review note (e.g. 'Looked at notes', 'False positive')"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        className="text-sm min-h-16 resize-none"
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          className="flex-1 gap-1.5"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldX className="h-3.5 w-3.5" />}
          Confirm Cheating
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
          onClick={onDismiss}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          Dismiss
        </Button>
      </div>
    </div>
  );
}

// ---------- Main Panel Component ----------
export default function SessionReviewPanel({ sessionId, examId, onClose }: { sessionId: number, examId: number, onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: sessionData, isLoading: isLoadingSession } = useGetSession(sessionId, {
    query: { queryKey: getGetSessionQueryKey(sessionId), enabled: !!sessionId }
  });
  
  const { data: flags, isLoading: isLoadingFlags } = useListSessionFlags(sessionId);
  const reviewFlag = useReviewFlag();
  const releaseResults = useReleaseSessionResults();
  const gradeAnswer = useGradeSessionAnswer();

  const [notes, setNotes] = useState<Record<number, string>>({});
  const [acting, setActing] = useState<number | null>(null);
  const [gradingPoints, setGradingPoints] = useState<Record<number, string>>({});
  const [gradingFeedback, setGradingFeedback] = useState<Record<number, string>>({});

  const handleReview = (flagId: number, reviewStatus: "confirmed" | "dismissed") => {
    setActing(flagId);
    reviewFlag.mutate(
      { flagId, data: { reviewStatus, reviewNote: notes[flagId] ?? "" }, sessionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSessionFlagsQueryKey(sessionId) });
          toast({
            title: reviewStatus === "confirmed" ? "Flag confirmed" : "Flag dismissed",
          });
          setActing(null);
        },
        onError: () => {
          toast({ title: "Failed to update flag", variant: "destructive" });
          setActing(null);
        },
      }
    );
  };

  const handleGrade = (questionId: number, maxPoints: number) => {
    const pointsStr = gradingPoints[questionId];
    const points = pointsStr ? parseFloat(pointsStr) : 0;
    if (isNaN(points) || points < 0 || points > maxPoints) {
      toast({ title: "Invalid points", description: `Points must be between 0 and ${maxPoints}`, variant: "destructive" });
      return;
    }

    const feedback = gradingFeedback[questionId] || "Graded manually.";
    
    gradeAnswer.mutate(
      { sessionId, questionId, points, feedback },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
          toast({ title: "Answer graded successfully" });
        },
        onError: () => {
          toast({ title: "Failed to grade answer", variant: "destructive" });
        }
      }
    );
  };

  const handleRelease = () => {
    releaseResults.mutate(sessionId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
        queryClient.invalidateQueries({ queryKey: ["getExamResults", examId] });
        toast({ title: "Results released to student" });
      },
      onError: () => {
        toast({ title: "Failed to release results", variant: "destructive" });
      }
    });
  };

  if (isLoadingSession) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-background border-l shadow-2xl z-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessionData) return null;

  const { session, exam, answers } = sessionData;
  const pending = flags?.filter((f) => f.reviewStatus === "pending") ?? [];
  const reviewed = flags?.filter((f) => f.reviewStatus !== "pending") ?? [];

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-background border-l shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b bg-muted/20 shrink-0">
        <div>
          <h2 className="text-xl font-bold">Review Session</h2>
          <p className="text-sm text-muted-foreground">
            {session.studentName || session.studentEmail} · Code: {session.accessCode}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(exam.gradingMode === "manual" || exam.gradingMode === "review_release") && !(session as any).isResultsReleased && session.status === "submitted" && (
            <Button 
              size="sm" 
              onClick={handleRelease} 
              disabled={releaseResults.isPending}
              className="bg-primary"
            >
              {releaseResults.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Release Results
            </Button>
          )}
          {(session as any).isResultsReleased && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Results Released
            </Badge>
          )}
          <button onClick={onClose} className="p-2 rounded-md hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="grading" className="flex-1 flex flex-col">
          <div className="px-5 pt-4 border-b">
            <TabsList className="w-full grid grid-cols-2 h-11">
              <TabsTrigger value="grading" className="font-medium">
                Grading & Answers
              </TabsTrigger>
              <TabsTrigger value="flags" className="font-medium relative">
                Cheating Flags
                {pending.length > 0 && (
                  <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-destructive"></span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="grading" className="m-0 focus-visible:outline-none">
            <div className="h-[calc(100vh-140px)] overflow-y-auto p-5 space-y-6">
              {/* Score Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="py-3 px-4 pb-0">
                    <CardTitle className="text-xs text-muted-foreground uppercase">Score</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-3">
                    <div className="text-2xl font-bold">{session.score ?? "—"} / {session.maxScore ?? "—"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3 px-4 pb-0">
                    <CardTitle className="text-xs text-muted-foreground uppercase">Status</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-3">
                    <Badge variant={session.status === "submitted" ? "default" : "secondary"} className="capitalize">
                      {session.status}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3 px-4 pb-0">
                    <CardTitle className="text-xs text-muted-foreground uppercase">Submitted</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-3">
                    <div className="text-sm font-medium">
                      {session.submittedAt ? format(new Date(session.submittedAt), "MMM d, h:mm a") : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Answers */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Student Answers</h3>
                {answers?.map((ans, idx) => {
                  const isEssay = ans.questionType === "essay" || ans.questionType === "short_answer";
                  return (
                    <Card key={ans.questionId} className="border shadow-sm overflow-hidden">
                      <CardHeader className="bg-muted/30 py-3 border-b">
                        <div className="flex items-start justify-between">
                          <div className="font-medium text-sm">
                            <span className="text-muted-foreground mr-2">Q{idx + 1}.</span> 
                            <LatexRenderer text={ans.questionText || ""} />
                          </div>
                          <Badge variant="outline" className="ml-2 shrink-0">
                            {ans.points} / {ans.maxPoints} pts
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="text-sm">
                          <div className="font-medium text-muted-foreground mb-1 text-xs uppercase">Student Answer</div>
                          <div className="bg-muted/50 p-3 rounded-md text-foreground min-h-12 border">
                            {ans.studentAnswer ? (
                              <LatexRenderer text={ans.studentAnswer} />
                            ) : (
                              <span className="italic text-muted-foreground">Not answered</span>
                            )}
                          </div>
                        </div>

                        {ans.attachments && ans.attachments.length > 0 && (
                          <div className="text-sm space-y-2">
                            <div className="font-medium text-muted-foreground text-xs uppercase">Attached Photos/Solutions ({ans.attachments.length})</div>
                            <div className="grid grid-cols-2 gap-3">
                              {ans.attachments.map((url: string, i: number) => (
                                <a 
                                  key={i} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="border rounded-lg overflow-hidden block hover:ring-2 hover:ring-primary/50 transition-all bg-white relative aspect-[4/3]"
                                >
                                  <img 
                                    src={url} 
                                    alt={`Solution page ${i + 1}`} 
                                    className="w-full h-full object-cover" 
                                  />
                                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                                    Page {i + 1}
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {!isEssay && ans.correctAnswer && (
                          <div className="text-sm">
                            <div className="font-medium text-muted-foreground mb-1 text-xs uppercase">Correct Answer</div>
                            <div className="bg-green-50 text-green-800 p-2 rounded-md border border-green-200">
                              <LatexRenderer text={ans.correctAnswer} />
                            </div>
                          </div>
                        )}

                        {isEssay && (
                          <div className="pt-4 border-t space-y-3">
                            <div className="font-medium text-sm">Instructor Grading</div>
                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-1 space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Points</label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max={ans.maxPoints || undefined}
                                  placeholder={String(ans.points || 0)}
                                  value={gradingPoints[ans.questionId] !== undefined ? gradingPoints[ans.questionId] : (ans.points ?? "")}
                                  onChange={(e) => setGradingPoints({...gradingPoints, [ans.questionId]: e.target.value})}
                                />
                              </div>
                              <div className="col-span-3 space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Feedback</label>
                                <Textarea 
                                  placeholder="Provide feedback to the student..."
                                  className="h-10 min-h-10 resize-none"
                                  value={gradingFeedback[ans.questionId] !== undefined ? gradingFeedback[ans.questionId] : ((ans as any).feedback || "")}
                                  onChange={(e) => setGradingFeedback({...gradingFeedback, [ans.questionId]: e.target.value})}
                                />
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              onClick={() => handleGrade(ans.questionId, ans.maxPoints || 0)}
                              disabled={gradeAnswer.isPending}
                            >
                              {gradeAnswer.isPending ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : "Save Grade"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </TabsContent>

            <TabsContent value="flags" className="m-0 focus-visible:outline-none">
            <div className="h-[calc(100vh-140px)] overflow-y-auto p-5 space-y-6">
              {isLoadingFlags && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading flags…
                </div>
              )}

              {!isLoadingFlags && (flags?.length ?? 0) === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <ShieldCheck className="h-7 w-7 text-green-600" />
                  </div>
                  <p className="font-medium text-foreground">No flags for this session</p>
                  <p className="text-sm mt-1">The AI monitoring system detected no suspicious behavior.</p>
                </div>
              )}

              {/* Pending flags */}
              {pending.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Pending Review ({pending.length})
                  </h3>
                  {pending.map((flag) => (
                    <FlagCard
                      key={flag.id}
                      flag={flag}
                      note={notes[flag.id] ?? ""}
                      onNoteChange={(v) => setNotes((n) => ({ ...n, [flag.id]: v }))}
                      onConfirm={() => handleReview(flag.id, "confirmed")}
                      onDismiss={() => handleReview(flag.id, "dismissed")}
                      loading={acting === flag.id}
                    />
                  ))}
                </div>
              )}

              {/* Reviewed flags */}
              {reviewed.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Already Reviewed ({reviewed.length})
                  </h3>
                  {reviewed.map((flag) => (
                    <div key={flag.id} className="p-4 rounded-lg border bg-muted/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm capitalize">{flagLabel(flag.type)}</span>
                        {reviewBadge(flag.reviewStatus)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(flag.detectedAt), "MMM d, yyyy · h:mm:ss a")}
                      </p>
                      {flag.reviewNote && (
                        <p className="text-sm text-muted-foreground italic mt-1">"{flag.reviewNote}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
