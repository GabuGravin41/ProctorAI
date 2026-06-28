import { useGetDashboardStats } from "@/lib/api-client";
import InstructorLayout from "@/components/layout/instructor-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Users, AlertTriangle, Activity } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <InstructorLayout>
        <div className="p-8 flex items-center justify-center h-full">
          Loading dashboard...
        </div>
      </InstructorLayout>
    );
  }

  return (
    <InstructorLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Real-time metrics and alerts from your exams.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="min-h-24">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium">Total Exams</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats?.totalExams || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.publishedExams || 0} published</p>
            </CardContent>
          </Card>
          <Card className="min-h-24">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats?.totalSessions || 0}</div>
              <p className="text-xs text-muted-foreground">Historical total</p>
            </CardContent>
          </Card>
          <Card className="min-h-24">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-primary shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats?.activeSessions || 0}</div>
              <p className="text-xs text-muted-foreground">Currently taking exams</p>
            </CardContent>
          </Card>
          <Card className={`min-h-24 ${stats?.pendingFlags && stats.pendingFlags > 0 ? "border-destructive/50 bg-destructive/5" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium">Pending Flags</CardTitle>
              <AlertTriangle className={`h-4 w-4 shrink-0 ${stats?.pendingFlags && stats.pendingFlags > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-xl md:text-2xl font-bold ${stats?.pendingFlags && stats.pendingFlags > 0 ? "text-destructive" : ""}`}>{stats?.pendingFlags || 0}</div>
              <p className="text-xs text-muted-foreground">Require your review</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Recent Exams</CardTitle>
              <CardDescription className="text-xs md:text-sm">Your latest created assessments</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentExams?.length ? (
                <div className="space-y-3 md:space-y-4">
                  {stats.recentExams.map((exam: any) => (
                    <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 border rounded-md bg-slate-50 gap-2">
                      <div className="min-w-0 flex-1">
                        <Link href={`/exams/${exam.id}/build`} className="font-medium hover:text-primary hover:underline text-sm md:text-base block truncate">
                          {exam.title}
                        </Link>
                        <div className="flex gap-2 md:gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="capitalize px-2 py-0.5 rounded-full bg-slate-200 text-xs">{exam.status}</span>
                          <span className="truncate">{format(new Date(exam.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="text-right flex gap-4 text-sm">
                        <div>
                          <div className="font-medium">{exam.sessionCount || 0}</div>
                          <div className="text-xs text-muted-foreground">sessions</div>
                        </div>
                        <div>
                          <div className="font-medium">{exam.flagCount || 0}</div>
                          <div className="text-xs text-muted-foreground">flags</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full text-xs md:text-sm" asChild>
                    <Link href="/exams">View All Exams</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4 text-sm">You haven't created any exams yet.</p>
                  <Button asChild className="text-xs md:text-sm">
                    <Link href="/exams/new">Create Exam</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Recent Flags</CardTitle>
              <CardDescription className="text-xs md:text-sm">AI-detected anomalies needing review</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentFlags?.length ? (
                <div className="space-y-3 md:space-y-4">
                  {stats.recentFlags.map((flag: any) => (
                    <div key={flag.id} className="flex flex-col p-3 md:p-4 border rounded-md bg-red-50/50 border-red-100 gap-2">
                      <div className="flex items-start md:items-center justify-between gap-2">
                        <span className="font-medium capitalize text-destructive flex items-center gap-1 text-xs md:text-sm">
                          <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                          <span className="truncate">{flag.type.replace(/_/g, " ")}</span>
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(flag.detectedAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground">{flag.description || "Suspicious behavior detected"}</p>
                      <Button variant="secondary" size="sm" asChild className="self-start text-xs">
                        <Link href={`/exams/${flag.sessionId}/results`}>Review Session</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <Activity className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                  </div>
                  <p className="text-sm">No pending flags to review.</p>
                  <p className="text-xs text-muted-foreground">Your exams are running smoothly.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </InstructorLayout>
  );
}