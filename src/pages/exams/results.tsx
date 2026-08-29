import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import InstructorLayout from "@/components/layout/instructor-layout";
import {
  useGetExamResults,
  useListSessionFlags,
  useReviewFlag,
  useInviteStudents,
  useExportExamAudit,
  getGetExamResultsQueryKey,
  CheatingFlag,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, ShieldCheck, ShieldX,
  ChevronRight, Loader2, X, Activity, UploadCloud, Check, Copy,
  Search, Download, Trophy, Filter, ArrowUpDown, Medal, UserCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Sorting, Searching & Ranking state
  const [sortBy, setSortBy] = useState<string>("rank-desc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [flagFilter, setFlagFilter] = useState<string>("all");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Copied!", description: "Access code copied to clipboard." });
  };

  // Pre-calculate percentage scores and position ranks
  const enrichedSessions = (results?.sessions || []).map((s: any) => {
    const scorePct = s.maxScore && s.maxScore > 0 && s.score !== null && s.score !== undefined
      ? Math.round((s.score / s.maxScore) * 100)
      : null;
    return { ...s, scorePct };
  });

  // Calculate official leaderboard ranks for submitted sessions
  const submittedOnly = enrichedSessions
    .filter((s: any) => s.status === 'submitted' && s.scorePct !== null)
    .sort((a: any, b: any) => (b.scorePct ?? 0) - (a.scorePct ?? 0));

  const rankMap = new Map<number, number>();
  submittedOnly.forEach((s: any, idx: number) => {
    rankMap.set(s.id, idx + 1);
  });

  // Filter sessions
  const filteredSessions = enrichedSessions.filter((s: any) => {
    const nameMatch = (s.studentName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (s.studentEmail || "").toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = (s.accessCode || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (searchQuery && !nameMatch && !emailMatch && !codeMatch) return false;

    if (statusFilter === "submitted" && s.status !== "submitted") return false;
    if (statusFilter === "in_progress" && s.status !== "in_progress") return false;
    if (statusFilter === "review_requested" && !s.reviewRequested) return false;

    if (flagFilter === "flagged" && (s.flagCount ?? 0) === 0) return false;
    if (flagFilter === "clean" && (s.flagCount ?? 0) > 0) return false;

    return true;
  });

  // Sort sessions according to selected criteria
  const sortedSessions = [...filteredSessions].sort((a: any, b: any) => {
    if (sortBy === "rank-desc" || sortBy === "score-desc") {
      if (a.status === "submitted" && b.status !== "submitted") return -1;
      if (a.status !== "submitted" && b.status === "submitted") return 1;
      return (b.scorePct ?? -1) - (a.scorePct ?? -1);
    }
    if (sortBy === "score-asc") {
      if (a.status === "submitted" && b.status !== "submitted") return -1;
      if (a.status !== "submitted" && b.status === "submitted") return 1;
      return (a.scorePct ?? 999) - (b.scorePct ?? 999);
    }
    if (sortBy === "name-asc") {
      return (a.studentName || "").localeCompare(b.studentName || "");
    }
    if (sortBy === "name-desc") {
      return (b.studentName || "").localeCompare(a.studentName || "");
    }
    if (sortBy === "flags-desc") {
      return (b.flagCount ?? 0) - (a.flagCount ?? 0);
    }
    if (sortBy === "flags-asc") {
      return (a.flagCount ?? 0) - (b.flagCount ?? 0);
    }
    if (sortBy === "submitted-desc") {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA;
    }
    if (sortBy === "submitted-asc") {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateA - dateB;
    }
    return 0;
  });

  const exportAudit = useExportExamAudit();

  const handleExportAudit = async () => {
    if (!results || !results.sessions || results.sessions.length === 0) {
      toast({ title: "No Data", description: "There are no student sessions to export.", variant: "destructive" });
      return;
    }

    try {
      await exportAudit.mutateAsync({ examId, examTitle: results.exam?.title });
      toast({ title: "Audit Report Exported", description: "Detailed proctoring audit CSV downloaded successfully." });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message || "Failed to generate audit report.", variant: "destructive" });
    }
  };

  const handleExportCsv = () => {
    if (!results || !results.sessions || results.sessions.length === 0) {
      toast({ title: "No Data", description: "There are no student sessions to export.", variant: "destructive" });
      return;
    }

    const headers = ["Rank", "Student Name", "Student Email", "Access Code", "Status", "Score", "Max Score", "Percentage", "Flags", "Submitted At"];
    
    const rows = sortedSessions.map((s: any) => {
      const rank = rankMap.get(s.id) ? `#${rankMap.get(s.id)}` : "N/A";
      const score = s.score !== null && s.score !== undefined ? s.score : "";
      const maxScore = s.maxScore || "";
      const pct = s.scorePct !== null ? `${s.scorePct}%` : "";
      const submittedAt = s.submittedAt ? format(new Date(s.submittedAt), "yyyy-MM-dd HH:mm:ss") : "";
      
      return [
        `"${rank}"`,
        `"${(s.studentName || "—").replace(/"/g, '""')}"`,
        `"${(s.studentEmail || "").replace(/"/g, '""')}"`,
        `"${s.accessCode || ""}"`,
        `"${s.status || ""}"`,
        score,
        maxScore,
        `"${pct}"`,
        s.flagCount ?? 0,
        `"${submittedAt}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(results.exam?.title || "Exam").replace(/[^a-z0-9]/gi, '_')}_Leaderboard.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Leaderboard Exported", description: "CSV file downloaded successfully." });
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

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button variant="outline" className="gap-2 bg-white shadow-sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 text-slate-600" />
              Leaderboard CSV
            </Button>
            <Button
              variant="outline"
              className="gap-2 bg-white shadow-sm border-slate-300"
              onClick={handleExportAudit}
              disabled={exportAudit.isPending}
            >
              <Download className="h-4 w-4 text-emerald-600" />
              {exportAudit.isPending ? "Exporting..." : "Audit Report CSV"}
            </Button>
            <Button asChild className="bg-red-600 hover:bg-red-700 text-white shrink-0">
              <Link href={`/exams/${examId}/live`}>
                <Activity className="h-4 w-4 mr-2 animate-pulse" />
                🔴 Live Monitor
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Total Sessions", value: results.sessions.length },
            { label: "Submitted", value: results.submittedCount },
            { label: "Average Score", value: `${results.avgScore.toFixed(1)}%` },
            {
              label: "Total Cheating Flags",
              value: results.totalFlags,
              highlight: results.totalFlags > 0,
            },
          ].map(({ label, value, highlight }) => (
            <Card key={label} className={highlight ? "border-destructive/40 bg-destructive/5 shadow-sm" : "shadow-sm"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl sm:text-2xl font-bold ${highlight ? "text-destructive" : ""}`}>{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Student Leaderboard & Performance Table */}
        <Card className="shadow-sm border">
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b">
            <CardHeader className="bg-slate-50/50 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Student Performance &amp; Leaderboard
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ranked list of student submissions ({sortedSessions.length} of {results.sessions.length} shown)
                  </p>
                </div>

                {/* Sorting and Search Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-48 md:w-56">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs h-9 bg-white"
                    />
                  </div>

                  {/* Sort By Dropdown */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-44 text-xs h-9 bg-white">
                      <div className="flex items-center gap-1.5 truncate">
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Sort By" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rank-desc">🏆 Rank / Highest Score</SelectItem>
                      <SelectItem value="score-asc">📉 Lowest Score</SelectItem>
                      <SelectItem value="name-asc">🔤 Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">🔤 Name (Z-A)</SelectItem>
                      <SelectItem value="flags-desc">🚩 Most Flags</SelectItem>
                      <SelectItem value="flags-asc">🛡️ Fewest Flags (Clean)</SelectItem>
                      <SelectItem value="submitted-desc">⏱️ Newest First</SelectItem>
                      <SelectItem value="submitted-asc">⏱️ Oldest First</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-28 text-xs h-9 bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review_requested">Requested Review</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Flag Filter */}
                  <Select value={flagFilter} onValueChange={setFlagFilter}>
                    <SelectTrigger className="w-28 text-xs h-9 bg-white">
                      <SelectValue placeholder="Flags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Flags</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="clean">Clean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <div className="hidden md:grid md:grid-cols-12 gap-3 p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-slate-100/70 border-t">
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">Student</div>
              <div className="col-span-2">Access Code</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Score &amp; %</div>
              <div className="col-span-2 text-right">Flags &amp; Action</div>
            </div>
          </div>
          <CardContent className="p-0">
              <div className="divide-y">
                {sortedSessions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No student sessions match the selected filters.
                  </div>
                )}
                {sortedSessions.map((session: any) => {
                  const rank = rankMap.get(session.id);
                  let rankBadge = null;
                  if (rank === 1) {
                    rankBadge = (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 shadow-sm shrink-0">
                        <Trophy className="h-3 w-3 text-amber-100" /> #1 Gold
                      </Badge>
                    );
                  } else if (rank === 2) {
                    rankBadge = (
                      <Badge className="bg-slate-400 hover:bg-slate-500 text-white font-bold gap-1 shadow-sm shrink-0">
                        <Medal className="h-3 w-3 text-slate-100" /> #2 Silver
                      </Badge>
                    );
                  } else if (rank === 3) {
                    rankBadge = (
                      <Badge className="bg-amber-800 hover:bg-amber-900 text-white font-bold gap-1 shadow-sm shrink-0">
                        <Medal className="h-3 w-3 text-amber-200" /> #3 Bronze
                      </Badge>
                    );
                  } else if (rank) {
                    rankBadge = (
                      <Badge variant="outline" className="font-mono text-slate-700 bg-slate-100 border-slate-300 font-semibold shrink-0">
                        #{rank}
                      </Badge>
                    );
                  }

                  return (
                    <div
                      key={session.id}
                      className="space-y-3 p-4 md:grid md:grid-cols-12 md:gap-3 md:items-center md:space-y-0 hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Rank */}
                      <div className="md:col-span-1 flex items-center gap-2">
                        <span className="text-[11px] font-medium uppercase text-muted-foreground md:hidden">Rank:</span>
                        {rankBadge || <span className="text-xs text-muted-foreground">—</span>}
                      </div>

                      {/* Student Info */}
                      <div className="md:col-span-3 min-w-0">
                        <div className="font-medium text-sm truncate flex items-center gap-2">
                          {session.studentName || "Anonymous Student"}
                          {session.reviewRequested && (
                            <Badge className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] h-4 px-1.5 font-semibold animate-pulse shrink-0">
                              Review Requested
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{session.studentEmail || "—"}</div>
                      </div>

                      {/* Access Code */}
                      <div className="flex items-center justify-between gap-3 md:col-span-2 md:block">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Code</span>
                        <div className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded w-fit">{session.accessCode}</div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-between gap-3 md:col-span-2 md:block">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Status</span>
                        <div>
                          <Badge
                            variant={session.status === "submitted" ? "default" : "secondary"}
                            className="capitalize text-xs"
                          >
                            {session.status}
                          </Badge>
                          {session.submittedAt && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {format(new Date(session.submittedAt), "MMM d, h:mm a")}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="flex items-center justify-between gap-3 md:col-span-2 md:block">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Score</span>
                        <div>
                          {session.score !== null && session.score !== undefined && session.maxScore ? (
                            <div>
                              <span className="text-sm font-bold text-slate-900">{session.scorePct}%</span>
                              <span className="text-xs text-muted-foreground ml-1">({session.score}/{session.maxScore} pts)</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>

                      {/* Flags & Action */}
                      <div className="flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
                        {(session.flagCount ?? 0) > 0 ? (
                          <Badge variant="destructive" className="gap-1 text-xs shrink-0">
                            <AlertTriangle className="h-3 w-3" /> {session.flagCount} flag{session.flagCount !== 1 ? "s" : ""}
                          </Badge>
                        ) : session.status === "submitted" ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1 text-xs shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Clean
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
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
                  );
                })}
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
