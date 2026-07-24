import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
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
  ChevronRight, Loader2, X, Activity, UploadCloud, Check, Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import SessionReviewPanel from "./session-review-panel";

// ---------- Main page ----------
export default function ExamResults() {
  const params = useParams();
  const examId = Number(params.examId);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inviteStudents = useInviteStudents();

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [emailsText, setEmailsText] = useState("");
  const [invitationResults, setInvitationResults] = useState<any[] | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: results, isLoading } = useGetExamResults(examId, { query: { queryKey: getGetExamResultsQueryKey(examId), enabled: !!examId } });

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const foundEmails = text.match(emailRegex) || [];
      if (foundEmails.length > 0) {
        const uniqueEmails = Array.from(new Set(foundEmails));
        setEmailsText(uniqueEmails.join(", "));
        toast({ title: "CSV Parsed Successfully", description: `Found ${uniqueEmails.length} student emails.` });
      } else {
        toast({ title: "No emails found", description: "Could not find any email addresses in the CSV file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleInviteSubmit = async () => {
    const emails = emailsText
      .split(/[\s,;\n]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emails.length === 0) {
      toast({ title: "Invalid input", description: "Please enter at least one valid email address.", variant: "destructive" });
      return;
    }

    setIsInviting(true);
    try {
      const res = await inviteStudents.mutateAsync({ examId, emails });
      setInvitationResults(res.invitations);
      queryClient.invalidateQueries({ queryKey: getGetExamResultsQueryKey(examId) });
      toast({ title: "Invitations Sent", description: `Successfully invited ${emails.length} students.` });
    } catch (e) {
      toast({ title: "Invitation failed", description: "Failed to create student invitations. Please try again.", variant: "destructive" });
    } finally {
      setIsInviting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Copied!", description: "Access code copied to clipboard." });
  };

  if (isLoading) return <InstructorLayout><div className="p-8">Loading results…</div></InstructorLayout>;
  if (!results) return <InstructorLayout><div className="p-8">Results not found</div></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
              <Link href="/exams"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">
                {results.exam.title} — Results
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Review student submissions and AI-detected flags.</p>
            </div>
          </div>

          <Button asChild className="bg-red-600 hover:bg-red-700 text-white shrink-0">
            <Link href={`/exams/${examId}/live`}>
              <Activity className="h-4 w-4 mr-2 animate-pulse" />
              🔴 Open Live Contest Monitor
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl sm:text-2xl font-bold ${highlight ? "text-destructive" : ""}`}>{value}</div>
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
              <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-sm font-medium text-muted-foreground">
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
                    className="space-y-3 p-4 md:grid md:grid-cols-12 md:gap-4 md:items-center md:space-y-0 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="md:col-span-3 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {session.studentName || "—"}
                        {session.reviewRequested && (
                          <Badge className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] h-4 px-1.5 font-semibold animate-pulse shrink-0">
                            Review Requested
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{session.studentEmail || session.accessCode}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:col-span-2 md:block">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Code</span>
                      <div className="font-mono text-xs text-muted-foreground">{session.accessCode}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:col-span-2 md:block">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Status</span>
                      <div>
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
                    </div>
                    <div className="flex items-center justify-between gap-3 md:col-span-2 md:block">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Score</span>
                      <div className="text-sm font-medium">
                        {session.score !== null && session.score !== undefined && session.maxScore
                          ? `${Math.round((session.score / session.maxScore) * 100)}% (${session.score}/${session.maxScore})`
                          : "—"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:col-span-3 md:block">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Flags</span>
                      <div className="flex items-center gap-2 flex-wrap">
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
                          className="gap-1 text-xs shrink-0 w-full justify-center md:w-auto md:justify-start"
                          onClick={() => setSelectedSessionId(session.id)}
                        >
                          Review <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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

      {/* Bulk Invite Modal */}
      {inviteModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!isInviting) {
                setInviteModalOpen(false);
                setInvitationResults(null);
                setEmailsText("");
              }
            }}
          />
          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold font-display text-foreground">Bulk Student Invitations</h3>
                  <p className="text-xs text-muted-foreground mt-1">Generate unique, one-time individual codes for your student roster.</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setInviteModalOpen(false);
                    setInvitationResults(null);
                    setEmailsText("");
                  }}
                  disabled={isInviting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {!invitationResults ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Paste Student Emails</label>
                      <Textarea
                        placeholder="Enter email addresses separated by commas, spaces, or newlines (e.g. student1@school.edu, student2@school.edu)..."
                        value={emailsText}
                        onChange={(e) => setEmailsText(e.target.value)}
                        className="min-h-[150px] font-sans text-sm resize-none focus-visible:ring-primary"
                        disabled={isInviting}
                      />
                    </div>

                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">Upload Student Roster CSV</p>
                      <p className="text-xs text-muted-foreground mt-1">We will automatically parse all email addresses found inside the file.</p>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleCsvUpload}
                        className="hidden"
                        id="csv-upload-input"
                        disabled={isInviting}
                      />
                      <Button variant="outline" size="sm" className="mt-4" asChild disabled={isInviting}>
                        <label htmlFor="csv-upload-input" className="cursor-pointer">
                          Select CSV File
                        </label>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 text-sm font-medium">
                      🚀 Successfully generated {invitationResults.length} individual codes! Send these codes to your students to allow them to access this exam.
                    </div>
                    
                    <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Student Email</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">One-Time Access Code</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-background divide-y divide-border">
                          {invitationResults.map((inv, idx) => (
                            <tr key={idx} className="hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-2 text-sm font-medium text-foreground truncate max-w-[200px]">{inv.email}</td>
                              <td className="px-4 py-2 text-sm font-mono text-muted-foreground font-semibold">{inv.code}</td>
                              <td className="px-4 py-2 text-sm text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(inv.code)}
                                >
                                  {copiedCode === inv.code ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t flex justify-end gap-3 bg-slate-50/50">
                {!invitationResults ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setInviteModalOpen(false);
                        setEmailsText("");
                      }}
                      disabled={isInviting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInviteSubmit}
                      className="bg-primary hover:bg-primary/90 text-white font-medium shadow-sm transition-all duration-150"
                      disabled={isInviting || !emailsText.trim()}
                    >
                      {isInviting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Inviting...
                        </>
                      ) : (
                        "Generate Invitation Codes"
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      setInviteModalOpen(false);
                      setInvitationResults(null);
                      setEmailsText("");
                    }}
                    className="bg-primary hover:bg-primary/90 text-white font-medium shadow-sm transition-all duration-150"
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </InstructorLayout>
  );
}
