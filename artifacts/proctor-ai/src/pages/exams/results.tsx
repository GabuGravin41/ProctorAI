import { useParams, Link } from "wouter";
import InstructorLayout from "@/components/layout/instructor-layout";
import { useGetExamResults, useGetExam } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ExamResults() {
  const params = useParams();
  const examId = Number(params.examId);

  const { data: results, isLoading } = useGetExamResults(examId, { query: { enabled: !!examId } });

  if (isLoading) return <InstructorLayout><div className="p-8">Loading results...</div></InstructorLayout>;
  if (!results) return <InstructorLayout><div className="p-8">Results not found</div></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exams"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">{results.exam.title} - Results</h1>
            <p className="text-muted-foreground mt-1">Review student submissions and AI flags.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.sessions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.submittedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.avgScore.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card className={results.totalFlags > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${results.totalFlags > 0 ? "text-destructive" : ""}`}>{results.totalFlags}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 font-medium text-sm text-muted-foreground">
                <div className="col-span-3">Student</div>
                <div className="col-span-2">Access Code</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Score</div>
                <div className="col-span-3">Flags</div>
              </div>
              <div className="divide-y">
                {results.sessions.map((session) => (
                  <div key={session.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                    <div className="col-span-3">
                      <div className="font-medium">{session.studentName || 'Unknown Student'}</div>
                      <div className="text-xs text-muted-foreground">{session.studentEmail || 'No email'}</div>
                    </div>
                    <div className="col-span-2 text-sm font-mono text-muted-foreground">
                      {session.accessCode}
                    </div>
                    <div className="col-span-2">
                      <Badge variant={session.status === 'submitted' ? 'default' : 'secondary'} className="capitalize">
                        {session.status}
                      </Badge>
                      {session.submittedAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(session.submittedAt), "MMM d, h:mm a")}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 font-medium">
                      {session.score !== null && session.maxScore ? (
                        `${Math.round((session.score / session.maxScore) * 100)}% (${session.score}/${session.maxScore})`
                      ) : (
                        "-"
                      )}
                    </div>
                    <div className="col-span-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {session.flagCount && session.flagCount > 0 ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> {session.flagCount} flags
                          </Badge>
                        ) : session.status === 'submitted' ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Clean
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </InstructorLayout>
  );
}