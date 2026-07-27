import { useState } from "react";
import { useParams, Link } from "wouter";
import InstructorLayout from "@/components/layout/instructor-layout";
import { useGetLiveStatus } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import SessionReviewPanel from "@/pages/exams/session-review-panel";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock, RefreshCw, Search, ShieldAlert, Users } from "lucide-react";

export default function LiveContestMonitor() {
  const params = useParams();
  const examId = Number(params.examId);

  const { data: liveData, isLoading, refetch, isRefetching } = useGetLiveStatus(examId, { refetchInterval: 10000 });

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (isLoading) {
    return (
      <InstructorLayout>
        <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-slate-600 font-medium">Connecting to contest live feed...</p>
        </div>
      </InstructorLayout>
    );
  }

  const exam = liveData?.exam;
  const summary = liveData?.summary;
  const students = liveData?.students || [];

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === "urgent") return s.pendingFlagCount >= 3;
    if (filterStatus === "flagged") return s.flagCount > 0;
    if (filterStatus === "active") return s.status === "active" || s.status === "in_progress";
    if (filterStatus === "submitted") return s.status === "submitted" || s.status === "completed";
    return true;
  });

  return (
    <InstructorLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 pt-2 pb-4 border-b space-y-6">
          {/* Navigation & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 text-slate-500">
                <Link href={`/exams/${examId}/results`}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Results
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900">
                  🔴 Live Contest Monitor
                </h1>
                <Badge className="bg-red-500 text-white animate-pulse">Live 10s Poll</Badge>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Exam: <span className="font-semibold text-slate-700">{exam?.title}</span> • {exam?.durationMinutes} mins
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh Feed
            </Button>
          </div>

          {/* Real-time Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="bg-white border">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500">Total Enrolled</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{summary?.total || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/50 border-emerald-200">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" /> Active Taking
                </div>
                <div className="text-2xl font-bold text-emerald-900 mt-1">{summary?.active || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                </div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{summary?.submitted || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-slate-500">Not Started</div>
                <div className="text-2xl font-bold text-slate-700 mt-1">{summary?.notStarted || 0}</div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${
                (summary?.urgentFlags || 0) > 0
                  ? "bg-red-100 border-red-300 ring-2 ring-red-400"
                  : "bg-white border"
              }`}
              onClick={() => setFilterStatus("urgent")}
            >
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-red-700 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Urgent Attention
                </div>
                <div className="text-2xl font-bold text-red-900 mt-1">{summary?.urgentFlags || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                className="text-xs h-8"
              >
                All Students ({students.length})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "urgent" ? "destructive" : "outline"}
                onClick={() => setFilterStatus("urgent")}
                className="text-xs h-8"
              >
                🚨 Urgent ({students.filter((s) => s.pendingFlagCount >= 3).length})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "flagged" ? "secondary" : "outline"}
                onClick={() => setFilterStatus("flagged")}
                className="text-xs h-8"
              >
                🚩 Has Flags ({students.filter((s) => s.flagCount > 0).length})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "active" ? "secondary" : "outline"}
                onClick={() => setFilterStatus("active")}
                className="text-xs h-8"
              >
                🟢 Active ({summary?.active || 0})
              </Button>
            </div>
          </div>
        </div>

        {/* Student Grid Overview */}
        {filteredStudents.length === 0 ? (
          <div className="py-16 text-center border border-dashed rounded-lg bg-slate-50">
            <Users className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 font-medium">No students match current filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredStudents.map((student) => {
              const isUrgent = student.pendingFlagCount >= 3;
              const hasFlags = student.flagCount > 0;
              const isSubmitted = student.status === "submitted" || student.status === "completed";

              let cardBorder = "border-slate-200 bg-white";
              if (isUrgent) cardBorder = "border-red-400 bg-red-50/50 shadow-md ring-1 ring-red-300";
              else if (hasFlags) cardBorder = "border-amber-300 bg-amber-50/30";
              else if (isSubmitted) cardBorder = "border-blue-200 bg-blue-50/20";
              else if (student.status === "active" || student.status === "in_progress") cardBorder = "border-emerald-200 bg-emerald-50/20";

              return (
                <Card
                  key={student.sessionId}
                  className={`cursor-pointer hover:shadow-lg transition-all border-2 ${cardBorder}`}
                  onClick={() => setSelectedSessionId(student.sessionId)}
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 truncate max-w-[160px]">
                        {student.studentName}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500 truncate max-w-[160px]">
                        {student.studentEmail}
                      </CardDescription>
                    </div>
                    {isSubmitted ? (
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px]">Submitted</Badge>
                    ) : student.status === "active" || student.status === "in_progress" ? (
                      <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Not Started</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 border-t pt-2">
                      <span>Answered:</span>
                      <span className="font-semibold">{student.questionsAnswered} / {student.totalQuestions}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t pt-2">
                      <span className="text-slate-600">Proctoring Flags:</span>
                      {student.flagCount > 0 ? (
                        <Badge
                          variant="destructive"
                          className={isUrgent ? "bg-red-600 font-bold animate-pulse" : "bg-amber-600"}
                        >
                          {student.flagCount} 🚩
                        </Badge>
                      ) : (
                        <span className="text-emerald-600 font-medium text-[11px]">0 Flags Clean</span>
                      )}
                    </div>

                    {student.lastFlagType && (
                      <div className="text-[10px] text-red-600 font-mono bg-red-100/80 px-2 py-1 rounded truncate">
                        Last: {student.lastFlagType.replace(/_/g, " ")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Slide-out Session Review Panel */}
        {selectedSessionId !== null && (
          <SessionReviewPanel
            sessionId={selectedSessionId}
            open={selectedSessionId !== null}
            onClose={() => setSelectedSessionId(null)}
          />
        )}
      </div>
    </InstructorLayout>
  );
}
