import { useState } from "react";
import { useParams, Link } from "wouter";
import InstructorLayout from "@/components/layout/instructor-layout";
import {
  useGetExamResults,
  useListSessionFlags,
  useReviewFlag,
  getGetExamResultsQueryKey,
  CheatingFlag,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, ShieldCheck, ShieldX,
  ChevronRight, Loader2, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getListSessionFlagsQueryKey } from "@workspace/api-client-react";

// ---------- Flag type label helpers ----------
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

// ---------- Flag review panel for one session ----------
function FlagPanel({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: flags, isLoading } = useListSessionFlags(sessionId);
  const reviewFlag = useReviewFlag();

  const [notes, setNotes] = useState<Record<number, string>>({});
  const [acting, setActing] = useState<number | null>(null);

  const handleReview = (flagId: number, reviewStatus: "confirmed" | "dismissed") => {
    setActing(flagId);
    reviewFlag.mutate(
      { flagId, data: { reviewStatus, reviewNote: notes[flagId] ?? "" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSessionFlagsQueryKey(sessionId) });
          toast({
            title: reviewStatus === "confirmed" ? "Flag confirmed" : "Flag dismissed",
            description: reviewStatus === "confirmed"
              ? "Incident recorded as a confirmed cheating event."
              : "Incident marked as dismissed.",
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

  const pending = flags?.filter((f) => f.reviewStatus === "pending") ?? [];
  const reviewed = flags?.filter((f) => f.reviewStatus !== "pending") ?? [];

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-background border-l shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b shrink-0">
        <div>
          <h2 className="text-lg font-bold">Flag Review</h2>
          <p className="text-sm text-muted-foreground">Session #{sessionId}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded hover:bg-muted transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 p-5 space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading flags…
          </div>
        )}

        {!isLoading && (flags?.length ?? 0) === 0 && (
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
          <div className="space-y-3">
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
                {flag.clipData && (
                  <div className="rounded-md overflow-hidden bg-black aspect-video border my-2">
                    <video src={flag.clipData} controls className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FlagCard({
  flag, note, onNoteChange, onConfirm, onDismiss, loading,
}: {
  flag: CheatingFlag;
  note: string;
  onNoteChange: (v: string) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-destructive">{flagLabel(flag.type)}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(flag.detectedAt), "MMM d, yyyy · h:mm:ss a")}
            </p>
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
        placeholder="Optional review note (e.g. 'Looked at notes', 'False positive — poor lighting')…"
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
                {results.sessions.map((session) => (
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
          <FlagPanel
            sessionId={selectedSessionId}
            onClose={() => setSelectedSessionId(null)}
          />
        </>
      )}
    </InstructorLayout>
  );
}
