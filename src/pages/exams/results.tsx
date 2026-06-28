import { useState } from "react";
import { useParams, Link } from "wouter";
import InstructorLayout from "@/components/layout/instructor-layout";
import {
  useGetExamResults,
  useListSessionFlags,
  useReviewFlag,
  getGetExamResultsQueryKey,
  CheatingFlag,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, ShieldCheck, ShieldX,
  ChevronRight, Loader2, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import SessionReviewPanel from "./session-review-panel";
// ---------- Main page ----------
export default function ExamResults() {
  const params = useParams();
  const examId = Number(params.examId);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const { data: results, isLoading } = useGetExamResults(examId, { query: { queryKey: getGetExamResultsQueryKey(examId), enabled: !!examId } });

  if (isLoading) return <InstructorLayout><div className="p-8">Loading results…</div></InstructorLayout>;
  if (!results) return <InstructorLayout><div className="p-8">Results not found</div></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exams"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
              {results.exam.title} — Results
            </h1>
            <p className="text-muted-foreground mt-1">Review student submissions and AI-detected flags.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Sessions", value: results.sessions.length },
            { label: "Submitted", value: results.submittedCount },
            { label: "Avg Score", value: `${results.avgScore.toFixed(1)}%` },
            {
              label: "Total Flags",
              value: results.totalFlags,
              highlight: results.totalFlags > 0,
            },
          ].map(({ label, value, highlight }) => (
            <Card key={label} className={highlight ? "border-destructive/40 bg-destructive/5" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${highlight ? "text-destructive" : ""}`}>{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Session table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Student</div>
                <div className="col-span-2">Code</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Score</div>
                <div className="col-span-3">Flags</div>
              </div>
              <div className="divide-y">
                {results.sessions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No students have joined yet.
                  </div>
                )}
                {results.sessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="col-span-3 min-w-0">
                      <div className="font-medium truncate">{session.studentName || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">{session.studentEmail || session.accessCode}</div>
                    </div>
                    <div className="col-span-2 font-mono text-xs text-muted-foreground">{session.accessCode}</div>
                    <div className="col-span-2">
                      <Badge
                        variant={session.status === "submitted" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {session.status}
                      </Badge>
                      {session.submittedAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(session.submittedAt), "MMM d, h:mm a")}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-sm font-medium">
                      {session.score !== null && session.score !== undefined && session.maxScore
                        ? `${Math.round((session.score / session.maxScore) * 100)}% (${session.score}/${session.maxScore})`
                        : "—"}
                    </div>
                    <div className="col-span-3 flex items-center justify-between gap-2">
                      {(session.flagCount ?? 0) > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> {session.flagCount} flag{session.flagCount !== 1 ? "s" : ""}
                        </Badge>
                      ) : session.status === "submitted" ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Clean
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs shrink-0"
                        onClick={() => setSelectedSessionId(session.id)}
                      >
                        Review <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slide-out flag review panel */}
      {selectedSessionId !== null && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedSessionId(null)}
          />
          <SessionReviewPanel
            examId={examId}
            sessionId={selectedSessionId}
            onClose={() => setSelectedSessionId(null)}
          />
        </>
      )}
    </InstructorLayout>
  );
}
