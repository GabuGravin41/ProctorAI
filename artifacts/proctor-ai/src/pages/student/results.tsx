import { useParams, Link } from "wouter";
import StudentLayout from "@/components/layout/student-layout";
import { useGetSession, useGetExam } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function StudentResults() {
  const params = useParams();
  const sessionId = Number(params.sessionId);

  const { data: sessionData, isLoading: sessionLoading } = useGetSession(sessionId, { query: { enabled: !!sessionId } });
  
  if (sessionLoading) return <StudentLayout><div className="flex items-center justify-center min-h-[50vh]">Loading results...</div></StudentLayout>;
  if (!sessionData) return <StudentLayout><div className="text-center py-12">Session not found.</div></StudentLayout>;

  const { session, exam } = sessionData;
  const isSubmitted = session.status === 'submitted';
  const percentage = session.score !== null && session.maxScore ? Math.round((session.score / session.maxScore) * 100) : null;

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/student"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Exam Results</h1>
            <p className="text-muted-foreground mt-1">{exam.title}</p>
          </div>
        </div>

        {isSubmitted ? (
          <Card className="overflow-hidden border-primary/20 shadow-md">
            <div className="bg-primary/5 p-8 text-center border-b">
              <h2 className="text-xl font-medium text-muted-foreground mb-2">Final Score</h2>
              <div className="text-7xl font-display font-bold text-primary mb-4">
                {percentage !== null ? `${percentage}%` : 'Pending'}
              </div>
              <div className="text-lg font-medium">
                {session.score} out of {session.maxScore} points
              </div>
            </div>
            
            {session.flagCount && session.flagCount > 0 && (
              <div className="bg-destructive/5 border-b p-4 flex items-center justify-center gap-2 text-destructive font-medium">
                <AlertTriangle className="h-5 w-5" />
                This session was flagged {session.flagCount} times for review by your instructor.
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              This exam has not been submitted yet.
            </CardContent>
          </Card>
        )}

        {/* Note: The backend schema doesn't currently return individual answer results for the student view in getSession. 
            In a real implementation, we would map over answers here. For now, we display a summary. */}
        <div className="text-center pt-8">
          <Button asChild variant="outline">
            <Link href="/student">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    </StudentLayout>
  );
}