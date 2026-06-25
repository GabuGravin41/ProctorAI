import { useParams, Link } from "wouter";
import StudentLayout from "@/components/layout/student-layout";
import { useGetSession, getGetSessionQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Clock,
  BookOpen,
} from "lucide-react";
import { format } from "date-fns";

function ScoreBadge({ percentage }: { percentage: number }) {
  if (percentage >= 90) return <Badge className="bg-green-600 text-white">Excellent</Badge>;
  if (percentage >= 75) return <Badge className="bg-blue-600 text-white">Good</Badge>;
  if (percentage >= 60) return <Badge className="bg-yellow-500 text-white">Pass</Badge>;
  return <Badge className="bg-red-600 text-white">Needs Improvement</Badge>;
}

export default function StudentResults() {
  const params = useParams();
  const sessionId = Number(params.sessionId);

  const { data: sessionData, isLoading } = useGetSession(sessionId, {
    query: { queryKey: getGetSessionQueryKey(sessionId), enabled: !!sessionId },
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
          Loading results…
        </div>
      </StudentLayout>
    );
  }

  if (!sessionData) {
    return (
      <StudentLayout>
        <div className="text-center py-12 text-muted-foreground">Session not found.</div>
      </StudentLayout>
    );
  }

  const { session, exam, answers } = sessionData;
  const isSubmitted = session.status === "submitted";
  const percentage =
    session.score != null && session.maxScore
      ? Math.round((session.score / session.maxScore) * 100)
      : null;

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/student">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
              Exam Results
            </h1>
            <p className="text-muted-foreground mt-1">
              {exam.title}
              {exam.subject ? ` · ${exam.subject}` : ""}
            </p>
          </div>
        </div>

        {!isSubmitted ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              This exam has not been submitted yet.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Score Summary Card */}
            <Card className="overflow-hidden border-primary/20 shadow-md">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center border-b">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <h2 className="text-xl font-medium text-muted-foreground">Final Score</h2>
                  {percentage !== null && <ScoreBadge percentage={percentage} />}
                </div>
                <div className="text-7xl font-display font-bold text-primary mb-3">
                  {percentage !== null ? `${percentage}%` : "Pending"}
                </div>
                <p className="text-lg font-medium text-muted-foreground">
                  {session.score} out of {session.maxScore} points
                </p>
                {percentage !== null && (
                  <Progress value={percentage} className="mt-4 max-w-xs mx-auto h-2" />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y sm:divide-y-0 border-b">
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-1">
                    <BookOpen className="h-4 w-4" />
                    Questions
                  </div>
                  <div className="font-bold text-xl">{answers?.length ?? exam.questions?.length ?? "—"}</div>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-green-600 text-sm mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Correct
                  </div>
                  <div className="font-bold text-xl text-green-600">
                    {answers ? answers.filter((a) => a.isCorrect).length : "—"}
                  </div>
                </div>
                <div className="p-4 text-center col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-1">
                    <Clock className="h-4 w-4" />
                    Submitted
                  </div>
                  <div className="font-bold text-sm">
                    {session.submittedAt
                      ? format(new Date(session.submittedAt), "MMM d, yyyy 'at' h:mm a")
                      : "—"}
                  </div>
                </div>
              </div>

              {session.flagCount && session.flagCount > 0 ? (
                <div className="bg-destructive/5 p-4 flex items-center justify-center gap-2 text-destructive font-medium text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  This session was flagged {session.flagCount} time
                  {session.flagCount > 1 ? "s" : ""} for review by your instructor.
                </div>
              ) : null}
            </Card>

            {/* Per-question breakdown */}
            {answers && answers.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold border-b pb-2">Question Breakdown</h2>
                {answers.map((item, idx) => {
                  const isEssay =
                    item.questionType === "essay" || item.questionType === "short_answer";
                  const unanswered = item.studentAnswer === null || item.studentAnswer === "";

                  return (
                    <Card
                      key={item.questionId}
                      className={
                        isEssay
                          ? "border-blue-200"
                          : item.isCorrect
                          ? "border-green-200"
                          : "border-red-200"
                      }
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="text-sm font-medium text-muted-foreground shrink-0 mt-0.5">
                              Q{idx + 1}
                            </span>
                            <CardTitle className="text-base font-medium leading-relaxed">
                              {item.questionText}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isEssay ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-300">
                                Auto-graded
                              </Badge>
                            ) : unanswered ? (
                              <MinusCircle className="h-5 w-5 text-muted-foreground" />
                            ) : item.isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className="text-sm font-medium">
                              {item.points}/{item.maxPoints}
                            </span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-3">
                        {/* Multiple choice options */}
                        {item.options && item.options.length > 0 && (
                          <div className="space-y-1.5">
                            {item.options.map((opt, oi) => {
                              const isStudentChoice = item.studentAnswer === opt;
                              const isCorrectChoice = item.correctAnswer === opt;
                              return (
                                <div
                                  key={oi}
                                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm border ${
                                    isCorrectChoice
                                      ? "bg-green-50 border-green-300 text-green-800"
                                      : isStudentChoice && !isCorrectChoice
                                      ? "bg-red-50 border-red-300 text-red-800"
                                      : "border-transparent text-muted-foreground"
                                  }`}
                                >
                                  {isCorrectChoice ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                  ) : isStudentChoice ? (
                                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                  ) : (
                                    <span className="h-3.5 w-3.5 shrink-0" />
                                  )}
                                  {opt}
                                  {isStudentChoice && (
                                    <span className="ml-auto text-xs font-medium">Your answer</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* True/false without option list */}
                        {!item.options?.length && item.questionType === "true_false" && (
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-muted-foreground">Your answer: </span>
                              <span className={unanswered ? "text-muted-foreground italic" : ""}>
                                {unanswered ? "Not answered" : item.studentAnswer}
                              </span>
                            </div>
                            {!item.isCorrect && item.correctAnswer && (
                              <div className="text-green-700">
                                <span className="text-muted-foreground">Correct answer: </span>
                                {item.correctAnswer}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Short answer / essay */}
                        {isEssay && (
                          <div className="text-sm space-y-1">
                            <p className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
                              Your response
                            </p>
                            <div className="rounded-md bg-muted/50 p-3 text-foreground">
                              {unanswered ? (
                                <span className="italic text-muted-foreground">No response</span>
                              ) : (
                                item.studentAnswer
                              )}
                            </div>
                            <p className="text-xs text-blue-600">
                              Open-ended questions receive full marks automatically.
                            </p>
                          </div>
                        )}

                        {/* Unanswered */}
                        {unanswered && !isEssay && !item.options?.length && (
                          <p className="text-sm text-muted-foreground italic">Not answered</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="text-center pt-4">
          <Button asChild variant="outline">
            <Link href="/student">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    </StudentLayout>
  );
}
